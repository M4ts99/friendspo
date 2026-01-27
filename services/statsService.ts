import { Session } from './supabase';
import { sessionService } from './sessionService';

export interface Stats {
    totalSessions: number;
    averageDuration: number;
    longestSession: number;
    shortestSession: number;
    currentStreak: number;
    totalTimeThisWeek: number;
    totalTimeThisMonth: number;
    mostActiveHour: number;
    weeklySessionCount: number;
    monthlySessionCount: number;
    regularityScore: number; // 0-100, higher = more consistent
}

export interface CalendarDay {
    date: string;
    hasSessions: boolean;
    sessionCount: number;
}

export const statsService = {
    // Calculate comprehensive stats
    async calculateStats(userId: string): Promise<Stats> {
        const sessions = await sessionService.getUserSessions(userId, 1000);

        if (sessions.length === 0) {
            return {
                totalSessions: 0,
                averageDuration: 0,
                longestSession: 0,
                shortestSession: 0,
                currentStreak: 0,
                totalTimeThisWeek: 0,
                totalTimeThisMonth: 0,
                mostActiveHour: 0,
                weeklySessionCount: 0,
                monthlySessionCount: 0,
                regularityScore: 0,
            };
        }

        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const durations = sessions.map((s) => s.duration);
        const totalDuration = durations.reduce((sum, d) => sum + d, 0);

        const weeklySessions = sessions.filter(
            (s) => new Date(s.started_at) >= weekAgo
        );
        const monthlySessions = sessions.filter(
            (s) => new Date(s.started_at) >= monthAgo
        );

        const weeklyTime = weeklySessions.reduce((sum, s) => sum + s.duration, 0);
        const monthlyTime = monthlySessions.reduce((sum, s) => sum + s.duration, 0);

        // Calculate most active hour
        const hourCounts: { [key: number]: number } = {};
        sessions.forEach((s) => {
            const hour = new Date(s.started_at).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        const mostActiveHour = Object.entries(hourCounts).reduce(
            (max, [hour, count]) => (count > max.count ? { hour: parseInt(hour), count } : max),
            { hour: 0, count: 0 }
        ).hour;

        return {
            totalSessions: sessions.length,
            averageDuration: Math.floor(totalDuration / sessions.length),
            longestSession: Math.max(...durations),
            shortestSession: Math.min(...durations),
            currentStreak: await this.calculateStreak(userId),
            totalTimeThisWeek: weeklyTime,
            totalTimeThisMonth: monthlyTime,
            mostActiveHour,
            weeklySessionCount: weeklySessions.length,
            monthlySessionCount: monthlySessions.length,
            regularityScore: await this.calculateRegularityScore(userId),
        };
    },

    // Calculate current streak
    async calculateStreak(userId: string): Promise<number> {
        const sessions = await sessionService.getUserSessions(userId, 365);

        if (sessions.length === 0) return 0;

        // Group sessions by date
        const sessionsByDate: { [key: string]: boolean } = {};
        sessions.forEach((session) => {
            const date = new Date(session.started_at).toISOString().split('T')[0];
            sessionsByDate[date] = true;
        });

        // Calculate streak from today backwards
        let streak = 0;
        const today = new Date();

        for (let i = 0; i < 365; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            const dateStr = checkDate.toISOString().split('T')[0];

            if (sessionsByDate[dateStr]) {
                streak++;
            } else if (i > 0) {
                // Allow today to be missing (streak continues if you haven't gone yet today)
                break;
            }
        }

        return streak;
    },

    // Get calendar data for a month
    async getCalendarData(userId: string, year: number, month: number): Promise<CalendarDay[]> {
        // Calcola inizio e fine mese (mese è 0-indexed: 0=Gen, 11=Dic)
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0); // Giorno 0 del mese dopo = ultimo del mese corrente

        const sessions = await sessionService.getSessionsInRange(userId, startDate, endDate);

        // Group sessions by date (USING LOCAL DATE)
        const sessionsByDate: { [key: string]: number } = {};
        
        sessions.forEach((session) => {
            // Convertiamo la data UTC del DB in data Locale dell'utente
            const d = new Date(session.started_at);
            
            // Costruiamo la stringa YYYY-MM-DD basata sull'orario locale
            const yearStr = d.getFullYear();
            const monthStr = String(d.getMonth() + 1).padStart(2, '0');
            const dayStr = String(d.getDate()).padStart(2, '0');
            const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
            
            sessionsByDate[dateStr] = (sessionsByDate[dateStr] || 0) + 1;
        });

        // Generate calendar days
        const calendarDays: CalendarDay[] = [];
        const daysInMonth = endDate.getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            // Costruiamo la stringa "manualmente" per evitare che toISOString() sposti il giorno indietro/avanti per il fuso orario
            const currentMonthStr = String(month + 1).padStart(2, '0');
            const currentDayStr = String(day).padStart(2, '0');
            const dateStr = `${year}-${currentMonthStr}-${currentDayStr}`;
            
            const sessionCount = sessionsByDate[dateStr] || 0;

            calendarDays.push({
                date: dateStr,
                hasSessions: sessionCount > 0,
                sessionCount,
            });
        }

        return calendarDays;
    },

    // Format duration for display
    formatDuration(seconds: number): string {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        if (minutes === 0) {
            return `${remainingSeconds}s`;
        }

        return `${minutes}m ${remainingSeconds}s`;
    },

    // Format time ago
    formatTimeAgo(dateString: string): string {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString();
    },

    // Calculate regularity score (0-100, higher = more consistent)
    async calculateRegularityScore(userId: string): Promise<number> {
        const sessions = await sessionService.getUserSessions(userId, 30);

        if (sessions.length < 3) return 0; // Need at least 3 sessions

        // Calculate time gaps between sessions (in hours)
        const gaps: number[] = [];
        for (let i = 1; i < sessions.length; i++) {
            const gap = new Date(sessions[i - 1].started_at).getTime() - new Date(sessions[i].started_at).getTime();
            gaps.push(gap / (1000 * 60 * 60)); // Convert to hours
        }

        // Calculate mean and standard deviation
        const mean = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
        const variance = gaps.reduce((sum, gap) => sum + Math.pow(gap - mean, 2), 0) / gaps.length;
        const stdDev = Math.sqrt(variance);

        // Coefficient of variation (lower = more regular)
        const cv = mean === 0 ? 1 : stdDev / mean;

        // Convert to 0-100 score (inverse relationship, clamped)
        const score = Math.max(0, Math.min(100, 100 - cv * 50));

        return Math.round(score);
    },

    // Get regularity label
    getRegularityLabel(score: number): string {
        if (score >= 80) return 'Very Regular 🌟';
        if (score >= 60) return 'Somewhat Regular ✅';
        if (score >= 40) return 'Irregular ⚠️';
        return 'Very Irregular 🔴';
    },

    // Get friends leaderboard by category (INCLUSO L'UTENTE CORRENTE)
    async getFriendsLeaderboard(
        userId: string,
        category: 'streak' | 'speed' | 'activity' | 'consistency'
    ): Promise<Array<{ user: any; score: number; rank: number }>> {
        // Importa i servizi necessari
        const { friendService } = require('./friendService');
        const { supabase } = require('./supabase'); // Assicurati che supabase sia accessibile qui

        // 1. Recupera gli amici
        const friends = await friendService.getFriends(userId);

        // 2. Recupera l'utente corrente (TU)
        const { data: currentUser } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        // 3. Crea una lista unica di partecipanti (Amici + Tu)
        const competitors = [...friends];
        if (currentUser) {
            competitors.push(currentUser);
        }

        if (competitors.length === 0) return [];

        // 4. Calcola i punteggi per TUTTI i partecipanti
        const competitorScores = await Promise.all(
            competitors.map(async (user: any) => {
                const stats = await this.calculateStats(user.id);
                let score = 0;

                switch (category) {
                    case 'streak':
                        score = stats.currentStreak;
                        break;
                    case 'speed':
                        score = stats.averageDuration; // Lower is better
                        break;
                    case 'activity':
                        score = stats.weeklySessionCount;
                        break;
                    case 'consistency':
                        score = stats.regularityScore;
                        break;
                }

                return {
                    user: user,
                    score: score,
                };
            })
        );

        // 5. Ordina la classifica
        competitorScores.sort((a, b) => {
            if (category === 'speed') {
                // Per la velocità, il valore più basso vince (es. meno tempo sul water?)
                // Se invece "speed" intendi "durata media", e più alto è meglio, inverti questo.
                // Assumiamo che per "speed", meno tempo è meglio:
                if (a.score === 0) return 1; // Penalizza chi ha 0 (nessun dato)
                if (b.score === 0) return -1;
                return a.score - b.score;
            }
            // Per le altre categorie, il valore più alto vince
            return b.score - a.score;
        });

        // 6. Assegna il rango
        return competitorScores.map((item, index) => ({
            ...item,
            rank: index + 1,
        }));
    },
};

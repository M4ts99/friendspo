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
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);

        const sessions = await sessionService.getSessionsInRange(userId, startDate, endDate);

        // Group sessions by date
        const sessionsByDate: { [key: string]: number } = {};
        sessions.forEach((session) => {
            const date = new Date(session.started_at).toISOString().split('T')[0];
            sessionsByDate[date] = (sessionsByDate[date] || 0) + 1;
        });

        // Generate calendar days
        const calendarDays: CalendarDay[] = [];
        const daysInMonth = endDate.getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = date.toISOString().split('T')[0];
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

    // Get friends leaderboard by category
    async getFriendsLeaderboard(
        userId: string,
        category: 'streak' | 'speed' | 'activity' | 'consistency'
    ): Promise<Array<{ user: any; score: number; rank: number }>> {
        const { friendService } = require('./friendService');
        const friends = await friendService.getFriends(userId);

        if (friends.length === 0) return [];

        // Calculate scores for each friend
        const friendScores = await Promise.all(
            friends.map(async (friend: any) => {
                const stats = await this.calculateStats(friend.id);
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
                    user: friend,
                    score,
                };
            })
        );

        // Sort based on category (speed: lower is better, others: higher is better)
        friendScores.sort((a, b) => {
            if (category === 'speed') {
                return a.score - b.score;
            }
            return b.score - a.score;
        });

        // Add rank
        return friendScores.map((item, index) => ({
            ...item,
            rank: index + 1,
        }));
    },
};

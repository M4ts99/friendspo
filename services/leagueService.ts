import { supabase } from './supabase';

export interface League {
    id: string;
    name: string;
    description?: string;
    code: string;
    created_by: string;
    member_count?: number; // Campo calcolato
}

export interface LeagueMemberStats {
    userId: string;
    nickname: string;
    totalSessions: number;
    totalDuration: number; // in minuti
    lastSessionDate: string | null;
}

export const leagueService = {
    // 1. Ottieni le leghe a cui l'utente è iscritto
    async getMyLeagues(userId: string) {
        const { data, error } = await supabase
            .from('league_members')
            .select(`
                league_id,
                leagues (
                    id, name, description, code, created_by
                )
            `)
            .eq('user_id', userId);

        if (error) throw error;
        
        // Appiattiamo la struttura
        return data.map((item: any) => item.leagues) as League[];
    },

    // 2. Crea una nuova lega
    async createLeague(name: string, description: string, creatorId: string) {
        // Genera un codice univoco semplice (es. "NAME-1234")
        const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 4);
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const code = `${cleanName}-${randomNum}`;

        // Transazione: Crea Lega -> Aggiungi Creatore come Membro
        const { data: league, error: leagueError } = await supabase
            .from('leagues')
            .insert([{ name, description, code, created_by: creatorId }])
            .select()
            .single();

        if (leagueError) throw leagueError;

        // Aggiungi subito il creatore alla lega
        await this.joinLeague(league.id, creatorId);

        return league;
    },

    // 3. Entra in una lega tramite codice o ID
    async joinLeagueByCode(code: string, userId: string) {
        // Trova l'ID della lega
        const { data: league, error } = await supabase
            .from('leagues')
            .select('id')
            .eq('code', code)
            .single();

        if (error || !league) throw new Error('League not found with this code');

        return await this.joinLeague(league.id, userId);
    },

    async joinLeague(leagueId: string, userId: string) {
        const { error } = await supabase
            .from('league_members')
            .insert([{ league_id: leagueId, user_id: userId }]);

        if (error) {
            if (error.code === '23505') throw new Error('You are already in this league');
            throw error;
        }
    },

    // 4. Ottieni la classifica (Leaderboard) di una lega
    async getLeagueLeaderboard(leagueId: string): Promise<LeagueMemberStats[]> {
        // Recupera tutti i membri della lega
        const { data: members, error: membersError } = await supabase
            .from('league_members')
            .select(`
                user_id,
                users ( nickname )
            `)
            .eq('league_id', leagueId);

        if (membersError) throw membersError;

        if (!members || members.length === 0) return [];

        const memberIds = members.map(m => m.user_id);

        // Recupera le sessioni di TUTTI questi membri
        const { data: sessions, error: sessionsError } = await supabase
            .from('sessions')
            .select('user_id, duration, created_at')
            .in('user_id', memberIds);

        if (sessionsError) throw sessionsError;

        // Calcola le statistiche per ogni membro
        const statsMap = new Map<string, LeagueMemberStats>();

        // Inizializza
        members.forEach((m: any) => {
            statsMap.set(m.user_id, {
                userId: m.user_id,
                nickname: m.users?.nickname || 'Unknown',
                totalSessions: 0,
                totalDuration: 0,
                lastSessionDate: null
            });
        });

        // Aggrega
        sessions?.forEach(session => {
            const stat = statsMap.get(session.user_id);
            if (stat) {
                stat.totalSessions += 1;
                stat.totalDuration += Math.floor(session.duration / 60); // Converti secondi in minuti
                
                // Aggiorna data ultima sessione
                if (!stat.lastSessionDate || new Date(session.created_at) > new Date(stat.lastSessionDate)) {
                    stat.lastSessionDate = session.created_at;
                }
            }
        });

        // Converti in array e ordina (per numero di sessioni, poi durata)
        return Array.from(statsMap.values()).sort((a, b) => b.totalSessions - a.totalSessions);
    }
};
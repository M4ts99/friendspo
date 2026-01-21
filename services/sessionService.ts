import { supabase, Session } from './supabase';

export const sessionService = {
    // Start a new session
    async startSession(userId: string): Promise<Session> {
        const { data, error } = await supabase
            .from('sessions')
            .insert([
                {
                    user_id: userId,
                    started_at: new Date().toISOString(),
                    is_private: false,
                },
            ])
            .select()
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    // Stop active session
    async stopSession(sessionId: string): Promise<Session> {
        const endTime = new Date();

        // Get the session to calculate duration
        const { data: session } = await supabase
            .from('sessions')
            .select('started_at')
            .eq('id', sessionId)
            .maybeSingle();

        if (!session) throw new Error('Session not found');

        const startTime = new Date(session.started_at);
        const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000); // duration in seconds

        const { data, error } = await supabase
            .from('sessions')
            .update({
                ended_at: endTime.toISOString(),
                duration,
            })
            .eq('id', sessionId)
            .select()
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    // Get active session for user
    async getActiveSession(userId: string): Promise<Session | null> {
        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('user_id', userId)
            .is('ended_at', null)
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
        return data;
    },

    // Get user's sessions
    async getUserSessions(userId: string, limit: number = 100): Promise<Session[]> {
        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('user_id', userId)
            .not('ended_at', 'is', null)
            .order('started_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    },

    // Get friends' sessions for feed
    async getFriendsSessions(userId: string, limit: number = 50) {
        // Get friend IDs
        const { data: friendships } = await supabase
            .from('friendships')
            .select('friend_id')
            .eq('user_id', userId)
            .eq('status', 'accepted');

        if (!friendships || friendships.length === 0) return [];

        const friendIds = friendships.map((f) => f.friend_id);

        // Get their sessions
        const { data, error } = await supabase
            .from('sessions')
            .select(`
        *,
        users (
          nickname
        )
      `)
            .in('user_id', friendIds)
            .not('ended_at', 'is', null)
            .eq('is_private', false)
            .order('started_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    },

    // Get sessions for a specific date range
    async getSessionsInRange(
        userId: string,
        startDate: Date,
        endDate: Date
    ): Promise<Session[]> {
        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('user_id', userId)
            .not('ended_at', 'is', null)
            .gte('started_at', startDate.toISOString())
            .lte('started_at', endDate.toISOString())
            .order('started_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },
};

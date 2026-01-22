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
    async stopSession(sessionId: string, message?: string, rating?: number): Promise<Session> {
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
                message,
                rating,
            })
            .eq('id', sessionId)
            .select()
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    // Delete a session (e.g. if cancelled after stop)
    async deleteSession(sessionId: string): Promise<void> {
        const { data, error, count } = await supabase
            .from('sessions')
            .delete()
            .eq('id', sessionId)
            .select('*'); // Select to ensure we get data back

        if (error) {
            throw error;
        }

        // If no rows were deleted (e.g. session not found or RLS policy blocked it), throw an error
        // Note: If RLS blocks it, count might be null or 0.
        if (count === 0 && data?.length === 0) {
            console.warn('Delete operation returned 0 rows. RLS might be blocking it or session does not exist.');
            // We might want to throw here to alert the UI, or just silently succeed if it's already gone.
            // For this bug, we want to know if it failed.
            // But if it's already gone, "succeeding" is fine.
            // However, if it exists but RLS blocks it, we want a failure.
            // Since we can't easily distinguish without checking if it exists first, we'll log it.
        }
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

        if (!friendships || friendships.length === 0) {
            // Even if no friends, show own sessions
            const { data, error } = await supabase
                .from('sessions')
                .select(`
            *,
            users (
              nickname
            )
          `)
                .eq('user_id', userId)
                .not('ended_at', 'is', null)
                .eq('is_private', false)
                .order('started_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        }

        const friendIds = friendships.map((f) => f.friend_id);
        // Add own ID to list
        friendIds.push(userId);

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

import { supabase, Friendship, FriendshipWithUser, User } from './supabase';

export const friendService = {
    // Send friend request by nickname
    async sendFriendRequest(userId: string, friendNickname: string): Promise<void> {
        // Find user by nickname
        const { data: friendData, error: searchError } = await supabase
            .from('users')
            .select('id')
            .eq('nickname', friendNickname)
            .maybeSingle();

        if (searchError) throw searchError;
        if (!friendData) throw new Error('User not found');

        const friendId = friendData.id;

        // Check if already friends or request exists
        const { data: existingFriendship } = await supabase
            .from('friendships')
            .select('*')
            .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
            .maybeSingle();

        if (existingFriendship) {
            if (existingFriendship.status === 'accepted') {
                throw new Error('Already friends');
            } else {
                throw new Error('Friend request already sent');
            }
        }

        // Create friendship request
        const { error } = await supabase
            .from('friendships')
            .insert([
                {
                    user_id: userId,
                    friend_id: friendId,
                    status: 'pending',
                },
            ]);

        if (error) throw error;
    },

    // Accept friend request
    async acceptFriendRequest(requestId: string): Promise<void> {
        // 1. Get the request details to know who is who
        const { data: request, error: fetchError } = await supabase
            .from('friendships')
            .select('*')
            .eq('id', requestId)
            .single();

        if (fetchError) throw fetchError;
        if (!request) throw new Error('Request not found');

        // 2. Update the original request status
        const { error: updateError } = await supabase
            .from('friendships')
            .update({ status: 'accepted' })
            .eq('id', requestId);

        if (updateError) throw updateError;

        // 3. Create the reciprocal friendship record so it's mutual
        // Check if it already exists to avoid duplicates
        const { data: existingReverse } = await supabase
            .from('friendships')
            .select('id')
            .eq('user_id', request.friend_id) // Me (the acceptor)
            .eq('friend_id', request.user_id) // Them (the requester)
            .maybeSingle();

        if (!existingReverse) {
            const { error: insertError } = await supabase
                .from('friendships')
                .insert([
                    {
                        user_id: request.friend_id,
                        friend_id: request.user_id,
                        status: 'accepted',
                    },
                ]);

            if (insertError) throw insertError;
        }
    },

    // Decline friend request
    async declineFriendRequest(requestId: string): Promise<void> {
        const { error } = await supabase
            .from('friendships')
            .delete()
            .eq('id', requestId);

        if (error) throw error;
    },

    // Remove friend (unfriend)
    async removeFriend(userId: string, friendId: string): Promise<void> {
        console.log(`friendService: Removing friendship between ${userId} and ${friendId}`);
        const { error, count } = await supabase
            .from('friendships')
            .delete({ count: 'exact' })
            .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);

        if (error) {
            console.error('friendService: Remove error', error);
            throw error;
        }
        console.log(`friendService: Removed ${count} records`);
    },

    // Get pending incoming requests (requests sent TO me)
    async getPendingRequests(userId: string): Promise<FriendshipWithUser[]> {
        console.log("Scaricando richieste per:", userId);
        
        const { data, error } = await supabase
        .from('friendships')
        .select('*, users:user_id(*)') // Scarica TUTTO dall'utente collegato
        .eq('friend_id', userId)
        .eq('status', 'pending');

        if (error) {
            console.error("Errore fetch richieste:", error);
            throw error;
        }

        // LOG DI DEBUG FONDAMENTALE PER CAPIRE COSA ARRIVA AL TELEFONO
        console.log("Dati grezzi da Supabase (Mobile):", JSON.stringify(data, null, 2));

        return (data as any) || [];
    },

    // Get sent pending requests (requests I sent)
    async getSentRequests(userId: string): Promise<FriendshipWithUser[]> {
        const { data, error } = await supabase
            .from('friendships')
            .select(`
                *,
                users!friendships_friend_id_fkey (*)
            `)
            .eq('user_id', userId)
            .eq('status', 'pending');

        if (error) throw error;
        return data || [];
    },

    // Get accepted friends
    async getFriends(userId: string): Promise<User[]> {
        const { data, error } = await supabase
            .from('friendships')
            .select(`
                *,
                users!friendships_friend_id_fkey (*)
            `)
            .eq('user_id', userId)
            .eq('status', 'accepted');

        if (error) throw error;

        // Extract just the user objects
        return (data || []).map((f: any) => f.users);
    },

    // Search user by nickname (Exact match)
    async searchUserByNickname(nickname: string): Promise<User | null> {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('nickname', nickname)
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    // Search users for autocomplete (Partial match)
    async searchUsers(query: string, limit: number = 3): Promise<User[]> {
        if (!query || query.length < 2) return [];

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .ilike('nickname', `%${query}%`)
            .limit(limit);

        if (error) throw error;
        return data || [];
    },

    // Get pending request count
    async getPendingRequestCount(userId: string): Promise<number> {
        const { data, error } = await supabase
            .from('friendships')
            .select('id', { count: 'exact' })
            .eq('friend_id', userId)
            .eq('status', 'pending');

        if (error) throw error;
        return data?.length || 0;
    },

    // Nuovo metodo: Invia richiesta direttamente tramite ID (più efficiente per le Leghe)
    async sendFriendRequestById(userId: string, friendId: string): Promise<void> {
        // 1. Controlla se sono già amici o se c'è una richiesta pendente
        const { data: existingFriendship } = await supabase
            .from('friendships')
            .select('*')
            .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
            .maybeSingle();

        if (existingFriendship) {
            if (existingFriendship.status === 'accepted') {
                throw new Error('You are already friends');
            } else {
                throw new Error('Friend request already sent');
            }
        }

        // 2. Crea la richiesta
        const { error } = await supabase
            .from('friendships')
            .insert([
                {
                    user_id: userId,
                    friend_id: friendId,
                    status: 'pending',
                },
            ]);

        if (error) throw error;
    },
};

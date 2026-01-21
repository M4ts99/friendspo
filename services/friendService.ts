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
        const { error } = await supabase
            .from('friendships')
            .update({ status: 'accepted' })
            .eq('id', requestId);

        if (error) throw error;
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
        const { error } = await supabase
            .from('friendships')
            .delete()
            .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);

        if (error) throw error;
    },

    // Get pending incoming requests (requests sent TO me)
    async getPendingRequests(userId: string): Promise<FriendshipWithUser[]> {
        const { data, error } = await supabase
            .from('friendships')
            .select(`
                *,
                users!friendships_user_id_fkey (*)
            `)
            .eq('friend_id', userId)
            .eq('status', 'pending');

        if (error) throw error;
        return data || [];
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

    // Search user by nickname
    async searchUserByNickname(nickname: string): Promise<User | null> {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('nickname', nickname)
            .maybeSingle();

        if (error) throw error;
        return data;
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
};

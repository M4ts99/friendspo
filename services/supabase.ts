import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use environment variables for security (especially for Cloudflare Pages)
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing Supabase environment variables! Check your .env file or Cloudflare settings.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'friendspo_auth_token',
    },
});

// Database types
export interface User {
    id: string;
    nickname: string;
    email?: string;
    is_sharing_enabled: boolean;
    created_at: string;
}

export interface Session {
    id: string;
    user_id: string;
    started_at: string;
    ended_at: string;
    duration: number; // in seconds
    is_private: boolean;
    message?: string;
    rating?: number;
    created_at: string;
}

export interface Friendship {
    id: string;
    user_id: string;
    friend_id: string;
    status: 'pending' | 'accepted';
    created_at: string;
}

export interface FriendshipWithUser extends Friendship {
    users: User; // The friend's user data
}

export interface SessionWithUser extends Session {
    users: User;
}


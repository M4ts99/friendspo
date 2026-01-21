import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use environment variables for security (especially for Cloudflare Pages)
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://degspdujeimikgbofubz.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZ3NwZHVqZWltaWtnYm9mdWJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODEyNDUsImV4cCI6MjA4NDU1NzI0NX0.3gI7H-9WMgTdQA4Fshvqb6tDaHKritZ9za6RfugoTRQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
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


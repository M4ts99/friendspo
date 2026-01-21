import { supabase } from './supabase';

export const authService = {
    // Check if nickname is available
    async checkNicknameAvailability(nickname: string): Promise<boolean> {
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .eq('nickname', nickname)
            .maybeSingle();

        return !data && !error;
    },

    // Sign up new user
    async signUp(nickname: string, password?: string, email?: string, isSharingEnabled: boolean = true) {
        try {
            // First check if nickname is available
            const isAvailable = await this.checkNicknameAvailability(nickname);
            if (!isAvailable) {
                throw new Error('Nickname already taken');
            }

            // Create user with Supabase Auth if email and password provided
            if (email && password) {
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                });

                if (authError) throw authError;

                // Create user profile
                const { error: profileError } = await supabase
                    .from('users')
                    .insert([
                        {
                            id: authData.user!.id,
                            nickname,
                            email,
                            is_sharing_enabled: isSharingEnabled,
                        },
                    ]);

                if (profileError) throw profileError;

                return authData.user;
            } else {
                // Anonymous user - generate a UUID
                const userId = crypto.randomUUID();

                const { data, error } = await supabase
                    .from('users')
                    .insert([
                        {
                            id: userId,
                            nickname,
                            email: null,
                            is_sharing_enabled: isSharingEnabled,
                        },
                    ])
                    .select()
                    .maybeSingle();

                if (error) throw error;

                // Store userId in local storage for anonymous users
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                await AsyncStorage.setItem('userId', userId);
                await AsyncStorage.setItem('nickname', nickname);

                return data;
            }
        } catch (error) {
            console.error('Sign up error:', error);
            throw error;
        }
    },

    // Sign in existing user (requires email/password)
    async signIn(identifier: string, password: string) {
        try {
            // Try email login first
            const { data, error } = await supabase.auth.signInWithPassword({
                email: identifier,
                password,
            });

            if (error) {
                // Try nickname lookup
                const { data: userData } = await supabase
                    .from('users')
                    .select('email')
                    .eq('nickname', identifier)
                    .maybeSingle();

                if (userData?.email) {
                    return await supabase.auth.signInWithPassword({
                        email: userData.email,
                        password,
                    });
                }

                throw error;
            }

            return data;
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    },

    // Sign out
    async signOut() {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Sign out error:', error);
        } finally {
            // Always clear local storage
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            await AsyncStorage.removeItem('userId');
            await AsyncStorage.removeItem('nickname');
        }
    },

    // Get current user
    async getCurrentUser() {
        try {
            // First try to get authenticated user
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const { data } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle();

                return data;
            }

            // Check for anonymous user in local storage
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const userId = await AsyncStorage.getItem('userId');

            if (userId) {
                const { data } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', userId)
                    .maybeSingle();

                return data;
            }

            return null;
        } catch (error) {
            console.error('Get current user error:', error);
            return null;
        }
    },

    // Check if current user has a password (email set)
    async hasPassword(): Promise<boolean> {
        try {
            const user = await this.getCurrentUser();
            return !!(user?.email);
        } catch (error) {
            console.error('Check password error:', error);
            return false;
        }
    },

    // Update privacy settings
    async updatePrivacySettings(userId: string, isSharingEnabled: boolean): Promise<void> {
        const { error } = await supabase
            .from('users')
            .update({ is_sharing_enabled: isSharingEnabled })
            .eq('id', userId);

        if (error) throw error;
    },

    // Delete user profile and all associated data
    async deleteProfile(userId: string): Promise<void> {
        // Supabase CASCADE will automatically delete:
        // - All sessions (sessions table has ON DELETE CASCADE)
        // - All friendships (friendships table has ON DELETE CASCADE)
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);

        if (error) throw error;

        // Sign out from Supabase auth (if authenticated user)
        try {
            await supabase.auth.signOut();
        } catch (err) {
            // Ignore errors if user wasn't authenticated
        }

        // Clear local storage
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.removeItem('userId');
        await AsyncStorage.removeItem('nickname');
    },
};

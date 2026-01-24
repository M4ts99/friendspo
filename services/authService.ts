import { supabase } from './supabase';
import * as Linking from 'expo-linking';

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

                if (authError) {
                    if (authError.message.includes("already registered")) {
                        throw new Error('USER_EXISTS');
                    }
                    throw authError;
                }

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

                if (profileError) {
                    console.error('ERRORE DATABASE PROFILO:', profileError.message);
                    throw profileError;
                }
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

    // Sign in existing user (supports email or nickname)
    async signIn(identifier: string, password: string) {
        try {
            let email = identifier;

            // If identifier doesn't look like an email, try nickname lookup
            if (!identifier.includes('@')) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('email')
                    .eq('nickname', identifier)
                    .maybeSingle();

                if (!userData?.email) {
                    throw new Error('User not found or has no password set');
                }
                email = userData.email;
            }

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                console.error("SUPABASE ERROR:", error.message);
                if (error.message.includes('Invalid login')) {
                    throw new Error('Invalid email/nickname or password');
                }
                throw error;
            }

            if (data.session) {
                await supabase.auth.setSession(data.session);
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
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            console.log('Get current user - supabase auth user:', user);
            if (authError) {
                console.error('Get current user auth error:', authError);
            }

            if (user) {
                console.log('Authenticated user found:', user.id);
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
    // Upgrade anonymous user to registered user (email is mandatory)
    async upgradeUser(email: string, password: string): Promise<void> {
        try {
            if (!email || !email.includes('@')) {
                throw new Error('A valid email address is required');
            }

            const currentUser = await this.getCurrentUser();
            if (!currentUser) throw new Error('No user to upgrade');

            console.log('Upgrading user with email:', email);

            // Sign up with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email,
                password: password,
            });

            if (authError) {
                if (authError.message.includes('already registered')) {
                    throw new Error('This email is already in use');
                }
                throw authError;
            }
            if (!authData.user) throw new Error('Failed to create auth user');

            const newUserId = authData.user.id;
            const oldUserId = currentUser.id;

            console.log(`Migrating data from ${oldUserId} to ${newUserId}`);

            // Migrate Data via RPC
            const { error: rpcError } = await supabase.rpc('migrate_user_data', {
                old_user_id: oldUserId,
                new_user_id: newUserId
            });

            if (rpcError) {
                console.error('Migration RPC failed:', rpcError);
                throw rpcError;
            }

            // Update Local Storage with new ID
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            await AsyncStorage.setItem('userId', newUserId);

            console.log('Upgrade successful');

        } catch (error) {
            console.error('Upgrade user error:', error);
            throw error;
        }
    },

    // MODIFICA QUESTA FUNZIONE
    async resetPassword(email: string) {
        // Genera l'URL corretto automaticamente:
        // - Su Web diventerà: http://localhost:8081
        // - Su Mobile (Expo Go) diventerà: exp://10.7.14.52:8081
        const redirectUrl = Linking.createURL('/');

        console.log('Reset Password Redirect URL:', redirectUrl);

        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl,
        });

        if (error) throw error;
        return data;
    },

    // Get account information for display
    async getAccountInfo(): Promise<{ email: string | null; hasPassword: boolean; nickname: string; canChangeNickname: boolean; nextNicknameChange: Date | null }> {
        const user = await this.getCurrentUser();
        if (!user) throw new Error('No user found');

        const hasPassword = !!(user.email);

        // Check nickname change cooldown (7 days)
        let canChangeNickname = true;
        let nextNicknameChange: Date | null = null;

        if (user.last_nickname_change) {
            const lastChange = new Date(user.last_nickname_change);
            const cooldownEnd = new Date(lastChange.getTime() + 7 * 24 * 60 * 60 * 1000);
            if (new Date() < cooldownEnd) {
                canChangeNickname = false;
                nextNicknameChange = cooldownEnd;
            }
        }

        // Only show real emails, not placeholder emails
        const displayEmail = user.email && !user.email.includes('@friendspo.placeholder')
            ? user.email
            : null;

        return {
            email: displayEmail,
            hasPassword,
            nickname: user.nickname,
            canChangeNickname,
            nextNicknameChange,
        };
    },

    // Change password (requires old password verification)
    async changePassword(oldPassword: string, newPassword: string): Promise<void> {
        const user = await this.getCurrentUser();
        if (!user || !user.email) throw new Error('No authenticated user found');

        // Verify old password by attempting to sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: oldPassword,
        });

        if (signInError) throw new Error('Current password is incorrect');

        // Update to new password
        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (updateError) throw updateError;
    },

    // Change nickname (requires password verification and 7-day cooldown)
    async changeNickname(newNickname: string, currentPassword: string): Promise<void> {
        const user = await this.getCurrentUser();
        if (!user) throw new Error('No user found');

        // Check cooldown
        if (user.last_nickname_change) {
            const lastChange = new Date(user.last_nickname_change);
            const cooldownEnd = new Date(lastChange.getTime() + 7 * 24 * 60 * 60 * 1000);
            if (new Date() < cooldownEnd) {
                const daysLeft = Math.ceil((cooldownEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
                throw new Error(`You can change your nickname again in ${daysLeft} days`);
            }
        }

        // Check if user has password (need to verify)
        if (user.email) {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: currentPassword,
            });
            if (signInError) throw new Error('Password is incorrect');
        }

        // Check if new nickname is available
        const isAvailable = await this.checkNicknameAvailability(newNickname);
        if (!isAvailable) throw new Error('Nickname is already taken');

        // Update nickname
        const { error: updateError } = await supabase
            .from('users')
            .update({
                nickname: newNickname,
                last_nickname_change: new Date().toISOString()
            })
            .eq('id', user.id);

        if (updateError) throw updateError;

        // Update local storage
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem('nickname', newNickname);
    },

    // Add email to existing account (for password reset capability)
    async addEmail(email: string, password: string): Promise<void> {
        const user = await this.getCurrentUser();
        if (!user) throw new Error('No user found');

        // If user doesn't have Supabase Auth yet, we need to upgrade them
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
            // Create new Supabase Auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) {
                if (authError.message.includes('already registered')) {
                    throw new Error('This email is already in use');
                }
                throw authError;
            }

            if (!authData.user) throw new Error('Failed to create auth user');

            // Migrate data
            const { error: rpcError } = await supabase.rpc('migrate_user_data', {
                old_user_id: user.id,
                new_user_id: authData.user.id,
            });

            if (rpcError) throw rpcError;

            // Update local storage
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            await AsyncStorage.setItem('userId', authData.user.id);
        } else {
            // User already has Supabase Auth, just update email
            const { error: updateError } = await supabase.auth.updateUser({ email });
            if (updateError) throw updateError;

            // Also update in users table
            const { error: dbError } = await supabase
                .from('users')
                .update({ email })
                .eq('id', user.id);
            if (dbError) throw dbError;
        }
    },
};


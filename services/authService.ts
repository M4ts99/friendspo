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
                console.log('📝 [SIGNUP] Starting sign up with email:', email);
                console.log('📝 [SIGNUP] Nickname:', nickname);

                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                });

                if (authError) {
                    console.error('❌ [SIGNUP] Supabase Auth error:', authError);
                    if (authError.message.includes("already registered")) {
                        throw new Error('USER_EXISTS');
                    }
                    throw authError;
                }

                console.log('✅ [SIGNUP] Supabase Auth user created:', authData.user!.id);
                console.log('📝 [SIGNUP] Creating user profile in database...');

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
                    console.error('❌ [SIGNUP] Database profile error:', profileError);
                    console.error('❌ [SIGNUP] Error code:', profileError.code);
                    console.error('❌ [SIGNUP] Error message:', profileError.message);
                    console.error('❌ [SIGNUP] Error details:', profileError.details);
                    throw profileError;
                }

                console.log('✅ [SIGNUP] User profile created successfully!');
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

    // Get current user profile
    async getCurrentUser(preloadedAuthUser: any = null) {
        try {
            console.log('🔍 [GET_USER] Starting getCurrentUser...');

            let user = preloadedAuthUser;
            let authError = null;

            // Se NON ci hanno passato l'utente, proviamo a recuperarlo noi
            if (!user) {
                console.log('🔍 [GET_USER] No preloaded user, calling supabase.auth.getUser()...');
                try {
                    // Add timeout to prevent infinite hanging
                    const userPromise = supabase.auth.getUser();
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('getUser timeout')), 5000)
                    );

                    const result = await Promise.race([userPromise, timeoutPromise]) as any;
                    user = result.data?.user;
                    authError = result.error;
                    console.log('🔍 [GET_USER] getUser() completed');
                } catch (error) {
                    console.warn('⚠️ [GET_USER] getUser() failed or timed out:', error);
                }
            } else {
                console.log('🔍 [GET_USER] Using preloaded user (Skipped auth fetch) ✅');
            }

            // --- DA QUI IN POI È UGUALE AL TUO CODICE ---

            console.log('Get current user - supabase auth user:', user?.id);
            
            if (user) {
                console.log('Authenticated user found:', user.id);
                console.log('🔍 [GET_USER] Querying users table for authenticated user...');

                const { data, error: dbError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle();

                if (dbError) console.error('❌ [GET_USER] Database error:', dbError);
                
                // Se l'utente auth esiste ma non c'è nel DB (caso raro ma possibile), 
                // ritorniamo null per forzare un logout/pulizia o gestirlo
                return data;
            }

            // Check for anonymous user in local storage
            console.log('🔍 [GET_USER] No auth user, checking local storage...');
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const userId = await AsyncStorage.getItem('userId');
            
            if (userId) {
                console.log('🔍 [GET_USER] Querying users table for anonymous user...');
                const { data, error: dbError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', userId)
                    .maybeSingle();

                if (dbError) console.error('❌ [GET_USER] Database error:', dbError);
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
            console.log('🔍 [HAS_PASSWORD] Checking if user has password...');
            const user = await this.getCurrentUser();
            console.log('🔍 [HAS_PASSWORD] User:', user?.id, 'Email:', user?.email);
            const result = !!(user?.email);
            console.log('🔍 [HAS_PASSWORD] Result:', result);
            return result;
        } catch (error) {
            console.error('❌ [HAS_PASSWORD] Check password error:', error);
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
            console.log('🔄 [UPGRADE] Starting upgrade process...');
            console.log('🔄 [UPGRADE] Email:', email);

            if (!email || !email.includes('@')) {
                console.error('❌ [UPGRADE] Invalid email format');
                throw new Error('A valid email address is required');
            }

            const currentUser = await this.getCurrentUser();
            console.log('🔄 [UPGRADE] Current user:', currentUser?.id, currentUser?.nickname);

            if (!currentUser) {
                console.error('❌ [UPGRADE] No current user found');
                throw new Error('No user to upgrade');
            }

            console.log('🔄 [UPGRADE] Calling Supabase signUp...');

            // Sign up with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email,
                password: password,
            });

            if (authError) {
                console.error('❌ [UPGRADE] Supabase signUp error:', authError);
                if (authError.message.includes('already registered')) {
                    throw new Error('This email is already in use');
                }
                throw authError;
            }

            if (!authData.user) {
                console.error('❌ [UPGRADE] No user returned from signUp');
                throw new Error('Failed to create auth user');
            }

            const newUserId = authData.user.id;
            const oldUserId = currentUser.id;

            console.log('✅ [UPGRADE] Supabase user created:', newUserId);
            console.log('🔄 [UPGRADE] Migrating data from', oldUserId, 'to', newUserId);

            // Migrate Data via RPC
            // This RPC will:
            // 1. Transfer sessions and friendships
            // 2. Update the NEW user with old user's data (nickname, settings)
            // 3. Delete the OLD user
            const { error: rpcError } = await supabase.rpc('migrate_user_data', {
                old_user_id: oldUserId,
                new_user_id: newUserId
            });

            if (rpcError) {
                console.error('❌ [UPGRADE] Migration RPC failed:', rpcError);
                throw rpcError;
            }

            console.log('✅ [UPGRADE] Data migration successful');
            console.log('🔄 [UPGRADE] Updating email in users table...');

            // Update email in users table (the RPC copies nickname but not email)
            const { error: emailUpdateError } = await supabase
                .from('users')
                .update({ email: email })
                .eq('id', newUserId);

            if (emailUpdateError) {
                console.error('⚠️ [UPGRADE] Failed to update email in users table:', emailUpdateError);
            } else {
                console.log('✅ [UPGRADE] Email updated in users table');
            }

            console.log('🔄 [UPGRADE] Signing in with new credentials...');

            // Sign in with the new credentials to establish session
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (signInError) {
                console.error('❌ [UPGRADE] Failed to sign in after upgrade:', signInError);
                throw new Error('Account created but login failed. Please try logging in manually.');
            }

            console.log('✅ [UPGRADE] Sign in successful');
            console.log('🔄 [UPGRADE] Updating local storage...');

            // Update Local Storage with new ID
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            await AsyncStorage.setItem('userId', newUserId);

            console.log('✅ [UPGRADE] Upgrade complete! New user ID:', newUserId);

        } catch (error) {
            console.error('❌ [UPGRADE] Upgrade user error:', error);
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

        const { data: authData} = await supabase.auth.getUser();
        const hasPassword = authData.user?.app_metadata?.provider === 'email' || !!authData.user?.email;

        // Check nickname change cooldown (7 days)
        let canChangeNickname = true;
        let nextNicknameChange: Date | null = null;

        if (user.last_nickname_change) {
            const lastChange = new Date(user.last_nickname_change);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            if (lastChange > sevenDaysAgo) {
                canChangeNickname = false;
                // Compute next allowed change date
                nextNicknameChange = new Date(lastChange);
                nextNicknameChange.setDate(nextNicknameChange.getDate() + 7);
            }
        }

        return {
            email: authData.user?.email || null,
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
    async changeNickname(newNickname: string, password?: string) {
        try {
            const user = await this.getCurrentUser();
            if (!user) throw new Error('User not found');

            // 1. Verifica disponibilità nickname
            const isAvailable = await this.checkNicknameAvailability(newNickname);
            if (!isAvailable) {
                throw new Error('This nickname is already taken');
            }

            // 2. Verifica Password (se l'utente ha una email/password)
            // Per verificare la password senza fare logout, proviamo un signIn
            // Nota: Supabase non ha un metodo "verifyPassword" diretto pulito, 
            // ma questo è il metodo standard sicuro.
            const { data: authUser } = await supabase.auth.getUser();
            
            if (authUser.user?.email && password) {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                email: authUser.user.email,
                password: password,
                });

                if (signInError) {
                throw new Error('Incorrect password');
                }
            }

            // 3. Controllo Cooldown (opzionale, per sicurezza lato backend)
            if (user.last_nickname_change) {
                const lastChange = new Date(user.last_nickname_change);
                const diffTime = Math.abs(new Date().getTime() - lastChange.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                if (diffDays < 7) {
                    throw new Error('You must wait 7 days before changing nickname again');
                }
            }

            // 4. Aggiornamento nel Database (Tabella users)
            // Questo NON manda mail, aggiorna solo il profilo pubblico
            const { error: updateError } = await supabase
                .from('users')
                .update({ 
                nickname: newNickname,
                last_nickname_change: new Date().toISOString()
                })
                .eq('id', user.id);

            if (updateError) throw updateError;

            // Aggiorniamo anche il local storage per l'interfaccia immediata
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            await AsyncStorage.setItem('nickname', newNickname);

            return true;

        } catch (error) {
            console.error('Change nickname error:', error);
            throw error;
        }
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


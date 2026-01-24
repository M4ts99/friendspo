import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../styles/theme';
import { authService } from '../services/authService';
import { supabase } from '../services/supabase';

interface WelcomeScreenProps {
    onComplete: () => void;
    initialStep?: OnboardingStep;
}

type OnboardingStep = 'nickname' | 'optional' | 'privacy' | 'reset_password';

export default function WelcomeScreen({ onComplete, initialStep }: WelcomeScreenProps) {
    console.log('WelcomeScreen initial step: ', initialStep);
    const [isLoginMode, setIsLoginMode] = useState(false);
    const [step, setStep] = useState<OnboardingStep>(initialStep ||'nickname');
    const [nickname, setNickname] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [isSharing, setIsSharing] = useState(true);
    const [loading, setLoading] = useState(false);
    const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);
    const [checkingNickname, setCheckingNickname] = useState(false);
    const [isSecureExpanded, setIsSecureExpanded] = useState(false);
    const [newPassword, setNewPassword] = useState('');

    useEffect(() => {
        // 1. Piano A: Controlla se l'URL del browser ha il token di reset
        if (Platform.OS === 'web') {
            const hash = window.location.hash;
            if (hash && (hash.includes('type=recovery') || hash.includes('access_token'))) {
                console.log("WelcomeScreen: Reset rilevato da URL Hash!");
                setStep('reset_password');
            }
        }

        // 2. Piano B: Ascolta l'evento ufficiale di Supabase direttamente qui
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            console.log("WelcomeScreen Evento Auth:", event);
            if (event === 'PASSWORD_RECOVERY') {
                setStep('reset_password');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Check nickname availability
    const checkNickname = async (value: string) => {
        if (value.length < 3) {
            setNicknameAvailable(null);
            return;
        }
        setCheckingNickname(true);
        try {
            const available = await authService.checkNicknameAvailability(value);
            setNicknameAvailable(available);
        } catch (error) {
            console.error('Error checking nickname:', error);
        } finally {
            setCheckingNickname(false);
        }
    };

    const handleNicknameChange = (value: string) => {
        setNickname(value);
        if (!isLoginMode) {
            // Debounce check
            const timer = setTimeout(() => checkNickname(value), 500);
            return () => clearTimeout(timer);
        }
    };

    const handleNextFromNickname = () => {
        if (nicknameAvailable === false) {
            Alert.alert('Error', 'This nickname is already taken');
            return;
        }
        setStep('optional');
    };

    const handleSignUp = async () => {
        setLoading(true);

        try {
            await authService.signUp(
                nickname.trim(),
                password.trim() || undefined,
                email.trim() || undefined,
                isSharing
            );

            onComplete();
        } catch (error: any) {
            if (error.message && error.message.includes('USER_EXISTS')) {
                const title = 'Account already exists';
                const message = 'This email is already registered. Would you like to reset your password?';

                if (Platform.OS === 'web') {
                    // Su Web Alert.alert non supporta i bottoni multipli in modo nativo standard
                    const confirmReset = window.confirm(`${title}\n\n${message}`);
                    if (confirmReset) {
                        handleForgotPassword(email);
                    }
                } else {
                    Alert.alert(
                        title,
                        message,
                        [
                            { text: 'Back', style: 'cancel' },
                            { 
                                text: 'Reset Password', 
                                onPress: () => handleForgotPassword(email) 
                            }
                        ]
                    );
                }
            } else {
                const msg = error.message || 'Failed to create account';
                Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        console.log('Login attempt:', nickname);
        if (!nickname.trim() || !password.trim()) {
            const msg = 'Please enter both nickname/email and password';
            Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
            return;
        }

        setLoading(true);

        try {
            console.log('Calling authService.signIn...');
            await authService.signIn(nickname.trim(), password.trim());
            setTimeout(() => {
                console.log('Sign in success, calling onComplete...');
                onComplete();
            }, 500);
        } catch (error: any) {
            console.error('Login error:', error);
            const msg = error.message || 'Invalid credentials';
            Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Login Failed', msg);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (email: string) => {
        try {
            await authService.resetPassword(email);
            Alert.alert("Email sended", "Check your email for the reset link.");
        } catch (error: any) {
            Alert.alert("Error", error.message);
        }
    };

    const renderStepIndicator = () => (
        <View style={styles.stepIndicator}>
            {(['nickname', 'optional', 'privacy'] as OnboardingStep[]).map((s, index) => (
                <View
                    key={s}
                    style={[
                        styles.stepDot,
                        step === s && styles.stepDotActive,
                        ['nickname', 'optional', 'privacy'].indexOf(step) > index && styles.stepDotCompleted,
                    ]}
                />
            ))}
        </View>
    );

    return (
    <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark, theme.colors.secondary]}
        style={styles.container}
    >
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
            >
                {step === 'reset_password' ? (
                    // SCHERMATA PULITA SOLO PER RESET
                    <View style={[styles.form, { marginTop: 60 }]}>
                        <View style={styles.header}>
                            <Text style={{ fontSize: 60, marginBottom: 10 }}>🔐</Text>
                            <Text style={styles.stepTitle}>Reset Your Password</Text>
                            <Text style={styles.stepSubtitle}>
                                Please enter a new secure password for your account.
                            </Text>
                        </View>

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="New Password"
                                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry
                                autoCapitalize="none"
                            />
                        </View>

                        <TouchableOpacity 
                            style={[styles.button, loading && styles.buttonDisabled]} 
                            disabled={loading}
                            onPress={async () => {
                                if (!newPassword || newPassword.length < 6) {
                                    Alert.alert("Error", "Password must be at least 6 characters");
                                    return;
                                }

                                setLoading(true);
                                try {
                                    // 1. Aggiorna la password
                                    const { error } = await supabase.auth.updateUser({ password: newPassword });

                                    if (error) {
                                        Alert.alert("Error", error.message);
                                        setLoading(false);
                                    } else {

                                        const handleSuccess = async () => {
                                        // 1. Logout forzato per pulire la sessione di recupero
                                        await supabase.auth.signOut();
                                        
                                        // 2. Reset stati locali UI
                                        setNewPassword('');
                                        setIsLoginMode(true);
                                        setStep('nickname');
                                        setLoading(false);
                                        
                                        // 3. Notifica App.tsx che abbiamo finito (tramite onComplete se necessario, 
                                        // ma il signOut scatenerà l'evento in App.tsx che mostrerà la login)
                                        // In questo caso, basta resettare l'interfaccia.
            };
                                        // 2. LOGICA POPUP (DA QUI IN POI È NUOVO)
                                        if (Platform.OS === 'web') {
                                            // Pulisci l'URL subito (rimuove il token dalla barra indirizzi)
                                            window.history.replaceState(null, "", window.location.pathname);
                                            
                                            // Alert bloccante del browser
                                            window.alert("Password Updated! 🎉\n\nYou can now log in with your new credentials.");
                                            
                                            // Reset stati e logout
                                            await handleSuccess();
                                        } else {
                                            // Mobile
                                            Alert.alert("Success! 🎉", "Password updated successfully.", [
                                                { 
                                                    text: "Go to Login", 
                                                    onPress: async () => {
                                                        await handleSuccess();
                                                    } 
                                                }
                                            ]);
                                        }
                                    }
                                } catch (err) {
                                    console.error(err);
                                    setLoading(false);
                                    Alert.alert("Error", "An unexpected error occurred");
                                }
                            }}
                        >
                            {loading ? <ActivityIndicator color={theme.colors.primary} /> : <Text style={styles.buttonText}>Save New Password 🚀</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={{ marginTop: 20, alignItems: 'center' }} 
                            onPress={() => {
                                setIsLoginMode(true);
                                setStep('nickname');
                            }}
                        >
                            <Text style={{ color: 'white', textDecorationLine: 'underline' }}>
                                Back to Login
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    // MODO STANDARD (WELCOME / LOGIN / SIGNUP)
                    <>
                        <View style={styles.header}>
                            <Text style={styles.emoji}>💩</Text>
                            <Text style={styles.title}>Friendspo</Text>
                            <Text style={styles.subtitle}>Track. Compare. Compete.</Text>
                        </View>

                        {/* Login/Signup Segmented Control */}
                        <View style={{
                            flexDirection: 'row',
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            borderRadius: theme.borderRadius.lg,
                            padding: 4,
                            marginBottom: theme.spacing.xl,
                        }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    paddingVertical: 12,
                                    alignItems: 'center',
                                    borderRadius: theme.borderRadius.md,
                                    backgroundColor: !isLoginMode ? 'rgba(255,255,255,0.2)' : 'transparent',
                                }}
                                onPress={() => {
                                    setIsLoginMode(false);
                                    setStep('nickname');
                                }}
                            >
                                <Text style={{
                                    color: !isLoginMode ? theme.colors.text : 'rgba(255,255,255,0.6)',
                                    fontWeight: 'bold',
                                    fontSize: 16,
                                }}>Sign Up</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    paddingVertical: 12,
                                    alignItems: 'center',
                                    borderRadius: theme.borderRadius.md,
                                    backgroundColor: isLoginMode ? 'rgba(255,255,255,0.2)' : 'transparent',
                                }}
                                onPress={() => {
                                    setIsLoginMode(true);
                                    setPassword('');
                                    setEmail('');
                                }}
                            >
                                <Text style={{
                                    color: isLoginMode ? theme.colors.text : 'rgba(255,255,255,0.6)',
                                    fontWeight: 'bold',
                                    fontSize: 16,
                                }}>Login</Text>
                            </TouchableOpacity>
                        </View>

                        {isLoginMode ? (
                            /* ===== LOGIN MODE ===== */
                            <View style={styles.form}>
                                <Text style={styles.stepTitle}>Welcome Back! 👋</Text>
                                <Text style={styles.stepSubtitle}>
                                    Login with your nickname and password
                                </Text>

                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Nickname or Email"
                                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                        value={nickname}
                                        onChangeText={setNickname}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Password"
                                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                        autoCapitalize="none"
                                    />
                                </View>

                                <TouchableOpacity
                                    style={[styles.button, loading && styles.buttonDisabled]}
                                    onPress={handleLogin}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color={theme.colors.primary} />
                                    ) : (
                                        <Text style={styles.buttonText}>Login 🚀</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        ) : (
                            /* ===== SIGNUP MODE ===== */
                            <View style={styles.form}>
                                {renderStepIndicator()}

                                {step === 'nickname' && (
                                    <>
                                        <Text style={styles.stepTitle}>Choose Your Nickname</Text>
                                        <Text style={styles.stepSubtitle}>
                                            This is how your friends will find you
                                        </Text>

                                        <View style={styles.inputContainer}>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Enter nickname..."
                                                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                                value={nickname}
                                                onChangeText={handleNicknameChange}
                                                autoCapitalize="none"
                                                autoCorrect={false}
                                            />
                                            {checkingNickname && <Text style={styles.inputIcon}>⏳</Text>}
                                            {!checkingNickname && nicknameAvailable === true && (
                                                <Text style={styles.inputIcon}>✓</Text>
                                            )}
                                            {!checkingNickname && nicknameAvailable === false && (
                                                <Text style={styles.inputIcon}>✕</Text>
                                            )}
                                        </View>

                                        {nicknameAvailable === false && (
                                            <Text style={styles.errorText}>
                                                This nickname is already taken
                                            </Text>
                                        )}

                                        <TouchableOpacity
                                            style={[
                                                styles.button,
                                                (!nickname || nicknameAvailable !== true) &&
                                                styles.buttonDisabled,
                                            ]}
                                            onPress={handleNextFromNickname}
                                            disabled={!nickname || nicknameAvailable !== true}
                                        >
                                            <Text style={styles.buttonText}>Next →</Text>
                                        </TouchableOpacity>
                                    </>
                                )}

                                {step === 'optional' && (
                                    <>
                                        <Text style={styles.stepTitle}>Secure Your Account</Text>
                                        <Text style={styles.stepSubtitle}>
                                            Create a password to save your progress
                                        </Text>

                                        <TouchableOpacity
                                            style={[styles.secureExpandHeader, isSecureExpanded && styles.secureExpandHeaderActive]}
                                            onPress={() => setIsSecureExpanded(!isSecureExpanded)}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                <Text style={{ fontSize: 24 }}>🔐</Text>
                                                <View>
                                                    <Text style={styles.secureOptionTitle}>Add Password & Email</Text>
                                                    <Text style={styles.secureOptionSubtitle}>Recommended for recovery</Text>
                                                </View>
                                            </View>
                                            <Text style={styles.arrowIcon}>{isSecureExpanded ? '▲' : '▼'}</Text>
                                        </TouchableOpacity>

                                        {isSecureExpanded && (
                                            <View style={styles.secureContent}>
                                                <View style={styles.warningBox}>
                                                    <Text style={styles.warningText}>
                                                        ⚠️ Without a password, logging out will delete your account permanently!
                                                    </Text>
                                                </View>

                                                <View style={styles.inputContainer}>
                                                    <TextInput
                                                        style={styles.input}
                                                        placeholder="Email (optional)"
                                                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                                        value={email}
                                                        onChangeText={setEmail}
                                                        keyboardType="email-address"
                                                        autoCapitalize="none"
                                                    />
                                                </View>

                                                <View style={styles.inputContainer}>
                                                    <TextInput
                                                        style={styles.input}
                                                        placeholder="Password"
                                                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                                        value={password}
                                                        onChangeText={setPassword}
                                                        secureTextEntry
                                                        autoCapitalize="none"
                                                    />
                                                </View>
                                            </View>
                                        )}

                                        <TouchableOpacity
                                            style={styles.button}
                                            onPress={() => setStep('privacy')}
                                        >
                                            <Text style={styles.buttonText}>
                                                {isSecureExpanded && password ? "Next →" : "Continue without Password"}
                                            </Text>
                                        </TouchableOpacity>
                                    </>
                                )}

                                {step === 'privacy' && (
                                    <>
                                        <Text style={styles.stepTitle}>Privacy Settings</Text>
                                        <Text style={styles.stepSubtitle}>
                                            How do you want to use Friendspo?
                                        </Text>

                                        <View style={styles.privacyOptions}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.privacyOption,
                                                    isSharing && styles.privacyOptionActive,
                                                ]}
                                                onPress={() => setIsSharing(true)}
                                            >
                                                <View style={styles.privacyContent}>
                                                    <Text style={styles.privacyEmoji}>👥</Text>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[styles.privacyTitle, isSharing && styles.privacyTitleActive]}>
                                                            Share with Friends
                                                        </Text>
                                                        <Text style={styles.privacyDescription}>
                                                            Shows your timeline to friends
                                                        </Text>
                                                    </View>
                                                </View>
                                                {isSharing && <Text style={styles.privacyCheckmark}>✓</Text>}
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[
                                                    styles.privacyOption,
                                                    !isSharing && styles.privacyOptionActive,
                                                ]}
                                                onPress={() => setIsSharing(false)}
                                            >
                                                <View style={styles.privacyContent}>
                                                    <Text style={styles.privacyEmoji}>🔒</Text>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[styles.privacyTitle, !isSharing && styles.privacyTitleActive]}>
                                                            Keep Private
                                                        </Text>
                                                        <Text style={styles.privacyDescription}>
                                                            Only you can see your stats
                                                        </Text>
                                                    </View>
                                                </View>
                                                {!isSharing && <Text style={styles.privacyCheckmark}>✓</Text>}
                                            </TouchableOpacity>
                                        </View>

                                        <TouchableOpacity
                                            style={[styles.button, loading && styles.buttonDisabled]}
                                            onPress={handleSignUp}
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <ActivityIndicator color={theme.colors.primary} />
                                            ) : (
                                                <Text style={styles.buttonText}>Let's Go! 🚀</Text>
                                            )}
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    </LinearGradient>
);
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        // justifyContent: 'center', // Can cause cut-off on small screens when content is large
        justifyContent: 'flex-start',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.xl, // Increase if needed or keep standard
        paddingTop: 60, // Ensure header space
    },
    header: {
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    emoji: {
        fontSize: 60,
        marginBottom: theme.spacing.sm,
    },
    title: {
        fontSize: theme.fontSize.xxxl,
        fontWeight: theme.fontWeight.extrabold,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    subtitle: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
        fontWeight: theme.fontWeight.medium,
    },
    toggleButton: {
        alignSelf: 'center',
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    toggleButtonText: {
        color: theme.colors.text,
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
        textDecorationLine: 'underline',
    },
    stepIndicator: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.lg,
    },
    stepDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    stepDotActive: {
        backgroundColor: theme.colors.text,
        width: 30,
    },
    stepDotCompleted: {
        backgroundColor: theme.colors.success,
    },
    form: {
        width: '100%',
        maxWidth: 500,
        alignSelf: 'center',
    },
    stepTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: theme.spacing.sm,
    },
    stepSubtitle: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: theme.spacing.lg,
    },
    inputContainer: {
        marginBottom: theme.spacing.md,
        position: 'relative',
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    inputIcon: {
        position: 'absolute',
        right: theme.spacing.md,
        top: '50%',
        transform: [{ translateY: -10 }],
        fontSize: 20,
    },
    errorText: {
        color: theme.colors.danger,
        fontSize: theme.fontSize.sm,
        marginTop: -theme.spacing.sm,
        marginBottom: theme.spacing.md,
        textAlign: 'center',
    },
    warningBox: {
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.warning,
    },
    warningText: {
        color: theme.colors.text,
        fontSize: theme.fontSize.sm,
        textAlign: 'center',
    },
    button: {
        backgroundColor: theme.colors.text,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.md,
        alignItems: 'center',
        marginTop: theme.spacing.sm,
        ...theme.shadows.lg,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: theme.colors.primary,
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
    },
    skipButton: {
        marginTop: theme.spacing.md,
        alignItems: 'center',
    },
    skipButtonText: {
        color: theme.colors.text,
        fontSize: theme.fontSize.sm,
        textDecorationLine: 'underline',
    },
    privacyOptions: {
        gap: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    privacyOption: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md, // Reduced padding
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        position: 'relative',
    },
    privacyOptionActive: {
        borderColor: theme.colors.text,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    privacyEmoji: {
        fontSize: 28, // Smaller emoji
        // marginBottom: theme.spacing.sm, // Removed margin bottom since it's row now
    },
    privacyTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
    },
    privacyTitleActive: {
        color: theme.colors.text,
    },
    privacyDescription: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    privacyCheckmark: {
        position: 'absolute',
        top: theme.spacing.md,
        right: theme.spacing.md,
        fontSize: 20,
        color: theme.colors.success,
    },
    // Secure Expandable Section Styles
    secureExpandHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: theme.spacing.md,
    },
    secureExpandHeaderActive: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderColor: theme.colors.text,
    },
    secureOptionTitle: {
        fontSize: theme.fontSize.md,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    secureOptionSubtitle: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    arrowIcon: {
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
    secureContent: {
        marginTop: theme.spacing.sm,
        marginBottom: theme.spacing.lg,
    },
    // Compact Privacy Styles
    privacyContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
    },
});

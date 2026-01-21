import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../styles/theme';
import { sessionService } from '../services/sessionService';
import { statsService } from '../services/statsService';
import { friendService } from '../services/friendService';
import { Session } from '../services/supabase';
import StatsHeader from '../components/StatsHeader';
import FriendsOverlay from '../components/FriendsOverlay';

interface HomeScreenProps {
    userId: string;
}

export default function HomeScreen({ userId }: HomeScreenProps) {
    const [activeSession, setActiveSession] = useState<Session | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [pulseAnim] = useState(new Animated.Value(1));
    const [streak, setStreak] = useState(0);
    const [avgDuration, setAvgDuration] = useState(0);
    const [pendingRequestCount, setPendingRequestCount] = useState(0);
    const [friendsOverlayVisible, setFriendsOverlayVisible] = useState(false);
    const [lastCompletedSession, setLastCompletedSession] = useState<{ startTime: string; duration: number } | null>(null);

    useEffect(() => {
        loadActiveSession();
        loadStats();
        loadPendingRequests();
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (activeSession) {
            interval = setInterval(() => {
                const startTime = new Date(activeSession.started_at).getTime();
                const now = Date.now();
                const elapsed = Math.floor((now - startTime) / 1000);
                setElapsedTime(elapsed);
            }, 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeSession]);

    useEffect(() => {
        if (!activeSession) {
            // Pulse animation for start button
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.05,
                        duration: 1000,
                        useNativeDriver: false,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: false,
                    }),
                ])
            ).start();
        }
    }, [activeSession]);

    const loadActiveSession = async () => {
        try {
            const session = await sessionService.getActiveSession(userId);
            setActiveSession(session);

            if (session) {
                const startTime = new Date(session.started_at).getTime();
                const now = Date.now();
                const elapsed = Math.floor((now - startTime) / 1000);
                setElapsedTime(elapsed);
            }
        } catch (error) {
            console.error('Error loading active session:', error);
        }
    };

    const loadStats = async () => {
        try {
            const stats = await statsService.calculateStats(userId);
            setStreak(stats.currentStreak);
            setAvgDuration(stats.averageDuration);
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    const loadPendingRequests = async () => {
        try {
            const count = await friendService.getPendingRequestCount(userId);
            setPendingRequestCount(count);
        } catch (error) {
            console.error('Error loading pending requests:', error);
        }
    };

    const handleStartSession = async () => {
        try {
            const session = await sessionService.startSession(userId);
            setActiveSession(session);
            setElapsedTime(0);
            setLastCompletedSession(null); // Clear previous session info
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to start session');
        }
    };

    const handleStopSession = async () => {
        if (!activeSession) return;

        try {
            const sessionStartTime = activeSession.started_at;
            const sessionDuration = elapsedTime;

            await sessionService.stopSession(activeSession.id);

            // Save completed session info for display
            setLastCompletedSession({
                startTime: sessionStartTime,
                duration: sessionDuration,
            });

            setActiveSession(null);
            setElapsedTime(0);

            // Reload stats after session completes
            loadStats();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to stop session');
        }
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <View style={styles.container}>
            <StatsHeader
                streak={streak}
                avgDuration={avgDuration}
                pendingRequestCount={pendingRequestCount}
                onFriendsPress={() => setFriendsOverlayVisible(true)}
            />

            <LinearGradient
                colors={
                    activeSession
                        ? [theme.colors.secondary, theme.colors.secondaryDark, theme.colors.primary]
                        : [theme.colors.background, theme.colors.backgroundLight]
                }
                style={styles.gradient}
            >
                <View style={styles.content}>
                    {activeSession ? (
                        <>
                            <Text style={styles.statusText}>Session in progress...</Text>
                            <View style={styles.timerContainer}>
                                <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
                                <Text style={styles.timerLabel}>minutes</Text>
                            </View>

                            <TouchableOpacity
                                style={[styles.button, styles.stopButton]}
                                onPress={handleStopSession}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={[theme.colors.danger, theme.colors.dangerLight]}
                                    style={styles.buttonGradient}
                                >
                                    <Text style={styles.buttonText}>Stop Shit 🛑</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Text style={styles.welcomeText}>Ready when you are...</Text>

                            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={handleStartSession}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={[theme.colors.primary, theme.colors.primaryDark]}
                                        style={styles.buttonGradient}
                                    >
                                        <Text style={styles.startButtonEmoji}>💩</Text>
                                        <Text style={styles.buttonText}>Start Shit</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </Animated.View>

                            <Text style={styles.hintText}>Tap to start tracking</Text>

                            {/* Saved Session Info */}
                            {lastCompletedSession && (
                                <View style={styles.savedSessionBox}>
                                    <View style={styles.savedSessionHeader}>
                                        <Text style={styles.savedSessionTitle}>💩 Saved Shit</Text>
                                        <TouchableOpacity
                                            onPress={() => setLastCompletedSession(null)}
                                            style={styles.closeButton}
                                        >
                                            <Text style={styles.closeButtonText}>✕</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.savedSessionRow}>
                                        <Text style={styles.savedSessionLabel}>Started:</Text>
                                        <Text style={styles.savedSessionValue}>
                                            {new Date(lastCompletedSession.startTime).toLocaleTimeString('de-DE', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </Text>
                                    </View>
                                    <View style={styles.savedSessionRow}>
                                        <Text style={styles.savedSessionLabel}>Duration:</Text>
                                        <Text style={styles.savedSessionValue}>
                                            {formatTime(lastCompletedSession.duration)}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </>
                    )}
                </View>
            </LinearGradient>

            <FriendsOverlay
                visible={friendsOverlayVisible}
                userId={userId}
                onClose={() => setFriendsOverlayVisible(false)}
                onRequestsUpdated={loadPendingRequests}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    gradient: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
    },
    welcomeText: {
        fontSize: theme.fontSize.xl,
        color: theme.colors.textSecondary,
        fontWeight: theme.fontWeight.medium,
        marginBottom: theme.spacing.xxl,
    },
    statusText: {
        fontSize: theme.fontSize.lg,
        color: theme.colors.text,
        fontWeight: theme.fontWeight.medium,
        marginBottom: theme.spacing.lg,
    },
    timerContainer: {
        alignItems: 'center',
        marginBottom: theme.spacing.xxl,
    },
    timerText: {
        fontSize: 80,
        color: theme.colors.text,
        fontWeight: theme.fontWeight.extrabold,
        letterSpacing: 4,
    },
    timerLabel: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
        fontWeight: theme.fontWeight.medium,
        marginTop: theme.spacing.sm,
    },
    button: {
        borderRadius: theme.borderRadius.xl,
        ...theme.shadows.lg,
    },
    stopButton: {
        marginTop: theme.spacing.lg,
    },
    buttonGradient: {
        paddingVertical: theme.spacing.xl,
        paddingHorizontal: theme.spacing.xxl,
        borderRadius: theme.borderRadius.xl,
        alignItems: 'center',
        minWidth: 250,
    },
    startButtonEmoji: {
        fontSize: 60,
        marginBottom: theme.spacing.sm,
    },
    buttonText: {
        fontSize: theme.fontSize.xl,
        color: theme.colors.text,
        fontWeight: theme.fontWeight.bold,
    },
    hintText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textTertiary,
        marginTop: theme.spacing.xl,
    },
    savedSessionBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginTop: theme.spacing.xl,
        borderWidth: 2,
        borderColor: theme.colors.success,
        minWidth: 280,
    },
    savedSessionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    savedSessionTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    closeButton: {
        padding: theme.spacing.xs,
    },
    closeButtonText: {
        fontSize: theme.fontSize.lg,
        color: theme.colors.textSecondary,
        fontWeight: theme.fontWeight.bold,
    },
    savedSessionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.xs,
    },
    savedSessionLabel: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
    },
    savedSessionValue: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
});

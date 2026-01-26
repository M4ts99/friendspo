import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../styles/theme';
import { sessionService } from '../services/sessionService';
import { statsService } from '../services/statsService';
import { authService } from '../services/authService';
import { friendService } from '../services/friendService';
import { SessionWithUser } from '../services/supabase';
import FriendsOverlay from '../components/FriendsOverlay';
import StarRating from '../components/StarRating';
import { User, Lock, Users, Coffee } from 'lucide-react-native';
import { usePushNotifications } from '../hooks/usePushNotification';

// 1. IMPORTA IL COMPONENTE WRAPPER
// Se non hai creato il file separato, fammelo sapere e ti do la versione senza import
import { ScreenContainer } from '../components/ScreenContainer';

interface FeedScreenProps {
    userId: string;
}

export default function FeedScreen({ userId }: FeedScreenProps) {
    const [sessions, setSessions] = useState<SessionWithUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isSharingEnabled, setIsSharingEnabled] = useState(true);
    const [hasFriends, setHasFriends] = useState(false);
    const [friendsOverlayVisible, setFriendsOverlayVisible] = useState(false);

    usePushNotifications(userId);

    useFocusEffect(
        React.useCallback(() => {
            loadUserSettings();
        }, [userId])
    );

    useEffect(() => {
        loadUserSettings();
        loadFeed();
        const interval = setInterval(loadFeed, 10000);
        return () => clearInterval(interval);
    }, [userId]);

    const loadUserSettings = async () => {
        try {
            const user = await authService.getCurrentUser();
            if (user) {
                setIsSharingEnabled(user.is_sharing_enabled);
            }
            const friends = await friendService.getFriends(userId);
            setHasFriends(friends.length > 0);
        } catch (error) {
            console.error('Error loading user settings:', error);
        }
    };

    const loadFeed = async () => {
        try {
            const data = await sessionService.getFriendsSessions(userId);
            setSessions(data);
        } catch (error) {
            console.error('Error loading feed:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadFeed();
    };

    const renderFeedItem = ({ item }: { item: SessionWithUser }) => {
        const duration = Math.floor(item.duration / 60);
        const timeAgo = statsService.formatTimeAgo(item.started_at);

        return (
            <View style={styles.feedItem}>
                <View style={styles.feedIcon}>
                    <User size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.feedContent}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.feedText}>
                            <Text style={styles.feedNickname}>{item.users.nickname}</Text>
                        </Text>
                        {item.rating && (
                            <StarRating rating={item.rating} size={14} />
                        )}
                    </View>
                    <Text style={styles.feedText}>
                        shitted for{' '}
                        <Text style={styles.feedDuration}>{duration} min</Text>
                    </Text>

                    {item.message && (
                        <View style={styles.messageBubble}>
                            <Text style={styles.messageText}>"{item.message}"</Text>
                        </View>
                    )}

                    <Text style={styles.feedTime}>{timeAgo}</Text>
                </View>
            </View>
        );
    };

    const renderEmptyState = () => {
        if (!isSharingEnabled) {
            return (
                <View style={styles.emptyContainer}>
                    <Lock size={48} color={theme.colors.textTertiary} style={styles.emptyIcon} />
                    <Text style={styles.emptyTitle}>Feed Disabled</Text>
                    <Text style={styles.emptyText}>
                        You have sharing disabled. Enable sharing in Settings to see your friends' activity.
                    </Text>
                </View>
            );
        }

        if (!hasFriends) {
            return (
                <View style={styles.emptyContainer}>
                    <Users size={48} color={theme.colors.textTertiary} style={styles.emptyIcon} />
                    <Text style={styles.emptyTitle}>No Friends Yet</Text>
                    <Text style={styles.emptyText}>
                        Add friends to see their activity here!
                    </Text>
                    <TouchableOpacity
                        style={styles.addFriendButton}
                        onPress={() => setFriendsOverlayVisible(true)}
                    >
                        <Text style={styles.addFriendButtonText}>Add Friend</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <View style={styles.emptyContainer}>
                <Coffee size={48} color={theme.colors.textTertiary} style={styles.emptyIcon} />
                <Text style={styles.emptyTitle}>No Activity</Text>
                <Text style={styles.emptyText}>
                    Your friends haven't shared anything yet
                </Text>
            </View>
        );
    };

    return (
        // 2. SOSTITUZIONE VIEW CON SCREENCONTAINER
        // Questo gestisce automaticamente notch, isola dinamica e status bar
        <ScreenContainer>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Activity Feed</Text>
                <Text style={styles.headerSubtitle}>See what your friends are up to</Text>
            </View>

            <FlatList
                data={sessions}
                renderItem={renderFeedItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={renderEmptyState}
            />

            <FriendsOverlay
                visible={friendsOverlayVisible}
                userId={userId}
                onClose={() => setFriendsOverlayVisible(false)}
                onRequestsUpdated={loadUserSettings}
            />
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    // 3. Nota: Ho rimosso 'container' perché ScreenContainer gestisce già flex:1 e background
    // Se vuoi puoi lasciarlo vuoto o rimuovere del tutto questo stile.
    
    header: {
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        // Non serve paddingTop extra qui, perché ScreenContainer
        // spinge già giù il contenuto sotto la notch
    },
    headerTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    headerSubtitle: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    listContent: {
        padding: theme.spacing.lg,
        // Aggiungiamo un po' di padding extra in basso per non far
        // finire l'ultimo elemento proprio attaccato alla barra di navigazione
        paddingBottom: theme.spacing.xxl, 
    },
    feedItem: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    feedIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: theme.colors.backgroundLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    feedContent: {
        flex: 1,
    },
    feedText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    feedNickname: {
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.primary,
    },
    feedDuration: {
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.secondary,
    },
    feedTime: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textTertiary,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.xxl * 2,
    },
    emptyIcon: {
        marginBottom: theme.spacing.lg,
    },
    emptyTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    emptyText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: theme.spacing.lg,
    },
    addFriendButton: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.lg,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.xl,
        marginTop: theme.spacing.lg,
        ...theme.shadows.md,
    },
    addFriendButtonText: {
        color: theme.colors.text,
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.bold,
    },
    messageBubble: {
        backgroundColor: theme.colors.background,
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        marginTop: theme.spacing.xs,
        marginBottom: theme.spacing.xs,
        alignSelf: 'flex-start',
        maxWidth: '100%',
    },
    messageText: {
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.sm,
        fontStyle: 'italic',
    },
});
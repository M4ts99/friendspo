import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import { theme } from '../styles/theme';
import { sessionService } from '../services/sessionService';
import { statsService } from '../services/statsService';
import { authService } from '../services/authService';
import { friendService } from '../services/friendService';
import { SessionWithUser } from '../services/supabase';
import FriendsOverlay from '../components/FriendsOverlay';

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

    useEffect(() => {
        loadUserSettings();
        loadFeed();

        // Set up real-time subscription (optional enhancement)
        const interval = setInterval(loadFeed, 30000); // Refresh every 30 seconds

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
        const duration = Math.floor(item.duration / 60); // Convert to minutes
        const timeAgo = statsService.formatTimeAgo(item.started_at);

        return (
            <View style={styles.feedItem}>
                <View style={styles.feedIcon}>
                    <Text style={styles.feedEmoji}>💩</Text>
                </View>

                <View style={styles.feedContent}>
                    <Text style={styles.feedText}>
                        <Text style={styles.feedNickname}>{item.users.nickname}</Text>
                        {' '}shitted for{' '}
                        <Text style={styles.feedDuration}>{duration} min</Text>
                    </Text>
                    <Text style={styles.feedTime}>{timeAgo}</Text>
                </View>
            </View>
        );
    };

    const renderEmptyState = () => {
        if (!isSharingEnabled) {
            return (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyEmoji}>🔒</Text>
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
                    <Text style={styles.emptyEmoji}>👥</Text>
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
                <Text style={styles.emptyEmoji}>😴</Text>
                <Text style={styles.emptyTitle}>No Activity</Text>
                <Text style={styles.emptyText}>
                    Your friends haven't shared anything yet
                </Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
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
    feedEmoji: {
        fontSize: 24,
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
    emptyEmoji: {
        fontSize: 80,
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
});

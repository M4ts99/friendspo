import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { theme } from '../styles/theme';
import { statsService, Stats } from '../services/statsService';
import CalendarView from '../components/CalendarView';

interface StatsScreenProps {
    userId: string;
}

type LeaderboardCategory = 'streak' | 'speed' | 'activity' | 'consistency';

export default function StatsScreen({ userId }: StatsScreenProps) {
    const [viewMode, setViewMode] = useState<'personal' | 'friends'>('personal');
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [leaderboardCategory, setLeaderboardCategory] = useState<LeaderboardCategory>('streak');
    const [leaderboard, setLeaderboard] = useState<any[]>([]);

    useEffect(() => {
        loadStats();
    }, [userId, viewMode]);

    useEffect(() => {
        if (viewMode === 'friends') {
            loadLeaderboard();
        }
    }, [viewMode, leaderboardCategory]);

    const loadStats = async () => {
        try {
            const data = await statsService.calculateStats(userId);
            setStats(data);
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadLeaderboard = async () => {
        try {
            const data = await statsService.getFriendsLeaderboard(userId, leaderboardCategory);
            setLeaderboard(data);
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadStats();
        if (viewMode === 'friends') {
            loadLeaderboard();
        }
    };

    const formatDuration = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        return `${minutes}m ${seconds % 60}s`;
    };

    const formatHour = (hour: number): string => {
        if (hour === 0) return '12 AM';
        if (hour < 12) return `${hour} AM`;
        if (hour === 12) return '12 PM';
        return `${hour - 12} PM`;
    };

    const getCategoryIcon = (category: LeaderboardCategory): string => {
        switch (category) {
            case 'streak': return '🔥';
            case 'speed': return '⏱️';
            case 'activity': return '💩';
            case 'consistency': return '📊';
        }
    };

    const getCategoryLabel = (category: LeaderboardCategory): string => {
        switch (category) {
            case 'streak': return 'Streak Leader';
            case 'speed': return 'Speed Demon';
            case 'activity': return 'Most Active';
            case 'consistency': return 'Most Consistent';
        }
    };

    const formatLeaderboardScore = (score: number, category: LeaderboardCategory): string => {
        switch (category) {
            case 'streak': return `${score} days`;
            case 'speed': return formatDuration(score);
            case 'activity': return `${score} sessions`;
            case 'consistency': return `${score}%`;
        }
    };

    return (
        <View style={styles.container}>
            {/* Toggle Buttons */}
            <View style={styles.toggleContainer}>
                <TouchableOpacity
                    style={[
                        styles.toggleButton,
                        viewMode === 'personal' && styles.toggleButtonActive,
                    ]}
                    onPress={() => setViewMode('personal')}
                >
                    <Text
                        style={[
                            styles.toggleText,
                            viewMode === 'personal' && styles.toggleTextActive,
                        ]}
                    >
                        Personal
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.toggleButton,
                        viewMode === 'friends' && styles.toggleButtonActive,
                    ]}
                    onPress={() => setViewMode('friends')}
                >
                    <Text
                        style={[
                            styles.toggleText,
                            viewMode === 'friends' && styles.toggleTextActive,
                        ]}
                    >
                        Friends
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {viewMode === 'personal' ? (
                    <>
                        {/* Streak Card */}
                        <View style={[styles.card, styles.streakCard]}>
                            <Text style={styles.streakEmoji}>🔥</Text>
                            <Text style={styles.streakNumber}>
                                {stats?.currentStreak || 0}
                            </Text>
                            <Text style={styles.streakLabel}>Day Streak</Text>
                        </View>

                        {/* Regularity Score */}
                        <View style={styles.regularityCard}>
                            <Text style={styles.regularityTitle}>📈 Regularity Score</Text>
                            <Text style={styles.regularityScore}>
                                {stats?.regularityScore || 0}%
                            </Text>
                            <Text style={styles.regularityLabel}>
                                {stats ? statsService.getRegularityLabel(stats.regularityScore) : 'No data yet'}
                            </Text>
                        </View>

                        {/* Stats Grid */}
                        <View style={styles.statsGrid}>
                            <View style={styles.statCard}>
                                <Text style={styles.statValue}>{stats?.weeklySessionCount || 0}</Text>
                                <Text style={styles.statLabel}>This Week</Text>
                            </View>

                            <View style={styles.statCard}>
                                <Text style={styles.statValue}>{stats?.monthlySessionCount || 0}</Text>
                                <Text style={styles.statLabel}>This Month</Text>
                            </View>

                            <View style={styles.statCard}>
                                <Text style={styles.statValue}>{stats?.totalSessions || 0}</Text>
                                <Text style={styles.statLabel}>All Time</Text>
                            </View>

                            <View style={styles.statCard}>
                                <Text style={styles.statValue}>
                                    {stats ? formatDuration(stats.averageDuration) : '0m'}
                                </Text>
                                <Text style={styles.statLabel}>Avg Duration</Text>
                            </View>
                        </View>

                        {/* Detailed Stats */}
                        <View style={styles.detailsCard}>
                            <Text style={styles.detailsTitle}>📊 Detailed Stats</Text>

                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Longest Session</Text>
                                <Text style={styles.detailValue}>
                                    {stats ? formatDuration(stats.longestSession) : '0m'}
                                </Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Shortest Session</Text>
                                <Text style={styles.detailValue}>
                                    {stats ? formatDuration(stats.shortestSession) : '0m'}
                                </Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Most Active Hour</Text>
                                <Text style={styles.detailValue}>
                                    {stats ? formatHour(stats.mostActiveHour) : 'N/A'}
                                </Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Total Time (Week)</Text>
                                <Text style={styles.detailValue}>
                                    {stats ? formatDuration(stats.totalTimeThisWeek) : '0m'}
                                </Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Total Time (Month)</Text>
                                <Text style={styles.detailValue}>
                                    {stats ? formatDuration(stats.totalTimeThisMonth) : '0m'}
                                </Text>
                            </View>
                        </View>

                        {/* Calendar View */}
                        <View style={styles.calendarCard}>
                            <Text style={styles.calendarTitle}>📅 Activity Calendar</Text>
                            <CalendarView userId={userId} />
                        </View>
                    </>
                ) : (
                    /* Friends Leaderboard */
                    <>
                        {/* Category Selector */}
                        <View style={styles.categorySelector}>
                            {(['streak', 'speed', 'activity', 'consistency'] as LeaderboardCategory[]).map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[
                                        styles.categoryButton,
                                        leaderboardCategory === cat && styles.categoryButtonActive,
                                    ]}
                                    onPress={() => setLeaderboardCategory(cat)}
                                >
                                    <Text style={styles.categoryEmoji}>{getCategoryIcon(cat)}</Text>
                                    <Text style={[
                                        styles.categoryText,
                                        leaderboardCategory === cat && styles.categoryTextActive,
                                    ]}>
                                        {getCategoryLabel(cat)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Leaderboard List */}
                        <View style={styles.leaderboardCard}>
                            <Text style={styles.leaderboardTitle}>
                                {getCategoryIcon(leaderboardCategory)} {getCategoryLabel(leaderboardCategory)}
                            </Text>

                            {leaderboard.length === 0 ? (
                                <View style={styles.emptyLeaderboard}>
                                    <Text style={styles.emptyEmoji}>👥</Text>
                                    <Text style={styles.emptyText}>
                                        Add friends to see the leaderboard!
                                    </Text>
                                </View>
                            ) : (
                                leaderboard.map((item, index) => (
                                    <View key={item.user.id} style={styles.leaderboardItem}>
                                        <View style={styles.leaderboardRank}>
                                            <Text style={[
                                                styles.rankText,
                                                index === 0 && styles.rankTextGold,
                                                index === 1 && styles.rankTextSilver,
                                                index === 2 && styles.rankTextBronze,
                                            ]}>
                                                #{item.rank}
                                            </Text>
                                        </View>

                                        <View style={styles.leaderboardContent}>
                                            <Text style={styles.leaderboardNickname}>
                                                {item.user.nickname}
                                            </Text>
                                            <Text style={styles.leaderboardScore}>
                                                {formatLeaderboardScore(item.score, leaderboardCategory)}
                                            </Text>
                                        </View>

                                        {index < 3 && (
                                            <Text style={styles.medal}>
                                                {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                            </Text>
                                        )}
                                    </View>
                                ))
                            )}
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        margin: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xs,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: theme.spacing.sm,
        alignItems: 'center',
        borderRadius: theme.borderRadius.md,
    },
    toggleButtonActive: {
        backgroundColor: theme.colors.primary,
    },
    toggleText: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.textSecondary,
    },
    toggleTextActive: {
        color: theme.colors.text,
    },
    scrollView: {
        flex: 1,
    },
    streakCard: {
        backgroundColor: theme.colors.primary,
        margin: theme.spacing.lg,
        marginTop: 0,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        alignItems: 'center',
        ...theme.shadows.lg,
    },
    streakEmoji: {
        fontSize: 60,
        marginBottom: theme.spacing.sm,
    },
    streakNumber: {
        fontSize: 56,
        fontWeight: theme.fontWeight.extrabold,
        color: theme.colors.text,
    },
    streakLabel: {
        fontSize: theme.fontSize.lg,
        color: theme.colors.text,
        fontWeight: theme.fontWeight.medium,
        marginTop: theme.spacing.xs,
    },
    regularityCard: {
        backgroundColor: theme.colors.secondary,
        margin: theme.spacing.lg,
        marginTop: 0,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        alignItems: 'center',
        ...theme.shadows.lg,
    },
    regularityTitle: {
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        fontWeight: theme.fontWeight.medium,
        marginBottom: theme.spacing.sm,
    },
    regularityScore: {
        fontSize: 48,
        fontWeight: theme.fontWeight.extrabold,
        color: theme.colors.text,
    },
    regularityLabel: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: theme.spacing.lg,
        gap: theme.spacing.md,
    },
    statCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.lg,
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        margin: theme.spacing.lg,
        ...theme.shadows.md,
    },
    statValue: {
        fontSize: theme.fontSize.xxl,
        fontWeight: theme.fontWeight.extrabold,
        color: theme.colors.primary,
    },
    statLabel: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
        textAlign: 'center',
    },
    detailsCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        margin: theme.spacing.lg,
        ...theme.shadows.md,
    },
    detailsTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    detailLabel: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
    },
    detailValue: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.text,
    },
    calendarCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        margin: theme.spacing.lg,
        ...theme.shadows.md,
    },
    calendarTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    categorySelector: {
        padding: theme.spacing.lg,
        gap: theme.spacing.sm,
    },
    categoryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    categoryButtonActive: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.backgroundLight,
    },
    categoryEmoji: {
        fontSize: 24,
        marginRight: theme.spacing.sm,
    },
    categoryText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
        fontWeight: theme.fontWeight.medium,
    },
    categoryTextActive: {
        color: theme.colors.primary,
        fontWeight: theme.fontWeight.bold,
    },
    leaderboardCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        margin: theme.spacing.lg,
        marginTop: 0,
        ...theme.shadows.md,
    },
    leaderboardTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    leaderboardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    leaderboardRank: {
        width: 50,
        alignItems: 'center',
    },
    rankText: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textSecondary,
    },
    rankTextGold: {
        color: '#FFD700',
    },
    rankTextSilver: {
        color: '#C0C0C0',
    },
    rankTextBronze: {
        color: '#CD7F32',
    },
    leaderboardContent: {
        flex: 1,
    },
    leaderboardNickname: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    leaderboardScore: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    medal: {
        fontSize: 24,
    },
    emptyLeaderboard: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xxl,
    },
    emptyEmoji: {
        fontSize: 60,
        marginBottom: theme.spacing.md,
    },
    emptyText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
});

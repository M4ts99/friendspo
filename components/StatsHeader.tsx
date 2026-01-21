import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';
import { Flame, Timer, Users } from 'lucide-react-native';

interface StatsHeaderProps {
    streak: number;
    avgDuration: number; // in seconds
    pendingRequestCount: number;
    onFriendsPress: () => void;
}

export default function StatsHeader({
    streak,
    avgDuration,
    pendingRequestCount,
    onFriendsPress,
}: StatsHeaderProps) {
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        return `${mins}m`;
    };

    return (
        <View style={styles.container}>
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Flame color={theme.colors.primary} size={24} style={styles.icon} />
                    <Text style={styles.statValue}>{streak}</Text>
                    <Text style={styles.statLabel}>Day Streak</Text>
                </View>

                <View style={styles.statItem}>
                    <Timer color={theme.colors.secondary} size={24} style={styles.icon} />
                    <Text style={styles.statValue}>{formatTime(avgDuration)}</Text>
                    <Text style={styles.statLabel}>Avg Time</Text>
                </View>

                <TouchableOpacity style={styles.friendsButton} onPress={onFriendsPress}>
                    <Users color="#FFF" size={24} />
                    {pendingRequestCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>!</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    icon: {
        marginBottom: theme.spacing.xs,
    },
    statValue: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    statLabel: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    friendsButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        ...theme.shadows.md,
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: theme.colors.danger,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.surface,
    },
    badgeText: {
        color: theme.colors.text,
        fontSize: 12,
        fontWeight: theme.fontWeight.bold,
    },
});

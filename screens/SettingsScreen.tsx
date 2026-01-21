import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Switch,
    Platform,
} from 'react-native';
import { theme } from '../styles/theme';
import { authService } from '../services/authService';
import { friendService } from '../services/friendService';
import { User } from '../services/supabase';
import FriendsOverlay from '../components/FriendsOverlay';

interface SettingsScreenProps {
    userId: string;
    nickname: string;
    onLogout: () => void;
}

export default function SettingsScreen({
    userId,
    nickname,
    onLogout,
}: SettingsScreenProps) {
    const [isSharingEnabled, setIsSharingEnabled] = useState(true);
    const [friends, setFriends] = useState<User[]>([]);
    const [friendsOverlayVisible, setFriendsOverlayVisible] = useState(false);

    useEffect(() => {
        loadSettings();
        loadFriends();
    }, []);

    const loadSettings = async () => {
        try {
            const user = await authService.getCurrentUser();
            if (user) {
                setIsSharingEnabled(user.is_sharing_enabled);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };

    const loadFriends = async () => {
        try {
            const friendsList = await friendService.getFriends(userId);
            setFriends(friendsList);
        } catch (error) {
            console.error('Error loading friends:', error);
        }
    };

    const confirmAction = (title: string, message: string, onConfirm: () => void, isDestructive = false) => {
        if (Platform.OS === 'web') {
            if (window.confirm(`${title}\n\n${message}`)) {
                onConfirm();
            }
        } else {
            Alert.alert(
                title,
                message,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: isDestructive ? 'Delete' : 'OK',
                        style: isDestructive ? 'destructive' : 'default',
                        onPress: onConfirm,
                    },
                ]
            );
        }
    };

    const handleToggleSharing = async (value: boolean) => {
        try {
            await authService.updatePrivacySettings(userId, value);
            setIsSharingEnabled(value);

            if (!value) {
                if (Platform.OS === 'web') {
                    window.alert('Sharing Disabled\n\nYour activity feed has been disabled. Friends will not see your sessions.');
                } else {
                    Alert.alert(
                        'Sharing Disabled',
                        'Your activity feed has been disabled. Friends will not see your sessions.',
                        [{ text: 'OK', style: 'default' }]
                    );
                }
            }
        } catch (error: any) {
            const msg = error.message || 'Failed to update privacy settings';
            Platform.OS === 'web' ? window.alert(`Error: ${msg}`) : Alert.alert('Error', msg);
            // Revert back on error
            setIsSharingEnabled(!value);
        }
    };

    const handleDeleteProfile = async () => {
        confirmAction(
            '⚠️ Delete Profile',
            'Are you sure you want to delete your profile?\n\nThis will permanently delete:\n• All your sessions\n• All friendships\n• All stats and data\n\nThis action CANNOT be undone!',
            () => {
                // Second confirmation
                confirmAction(
                    '🛑 Final Warning',
                    'This is your last chance!\n\nAre you absolutely sure you want to permanently delete your account?',
                    async () => {
                        try {
                            console.log('Deleting profile...');
                            await authService.deleteProfile(userId);
                            if (Platform.OS === 'web') window.alert('Profile Deleted: Your profile has been deleted successfully.');
                            else Alert.alert('Profile Deleted', 'Your profile has been deleted successfully.');
                            onLogout();
                        } catch (error: any) {
                            console.error('Delete profile error:', error);
                            const msg = error.message || 'Failed to delete profile';
                            Platform.OS === 'web' ? window.alert(`Error: ${msg}`) : Alert.alert('Error', msg);
                        }
                    },
                    true
                );
            },
            true
        );
    };

    const handleRemoveFriend = async (friendId: string, friendNickname: string) => {
        confirmAction(
            'Remove Friend',
            `Remove ${friendNickname} from your friends?`,
            async () => {
                try {
                    await friendService.removeFriend(userId, friendId);
                    loadFriends();
                } catch (error: any) {
                    const msg = error.message || 'Failed to remove friend';
                    Platform.OS === 'web' ? window.alert(`Error: ${msg}`) : Alert.alert('Error', msg);
                }
            },
            true
        );
    };

    const handleLogout = async () => {
        try {
            console.log('Checking password status...');
            const hasPassword = await authService.hasPassword();
            console.log('Has password:', hasPassword);

            if (!hasPassword) {
                // Warning for passwordless accounts
                confirmAction(
                    '⚠️ Warning: No Password Set',
                    'You did not set a password for this account!\n\nIf you logout now, you will NOT be able to log back in and your account will be PERMANENTLY DELETED.\n\nAre you sure you want to logout and delete your account?',
                    async () => {
                        try {
                            console.log('Deleting anonymous profile...');
                            // Delete account for passwordless users
                            await authService.deleteProfile(userId);
                            onLogout();
                        } catch (error: any) {
                            console.error('Logout delete error:', error);
                            const msg = error.message || 'Failed to logout';
                            Platform.OS === 'web' ? window.alert(`Error: ${msg}`) : Alert.alert('Error', msg);
                        }
                    },
                    true
                );
            } else {
                // Normal logout for users with password
                confirmAction(
                    'Logout',
                    'Are you sure you want to logout?',
                    async () => {
                        try {
                            console.log('Signing out...');
                            await authService.signOut();
                            onLogout();
                        } catch (error: any) {
                            console.error('Sign out error:', error);
                            const msg = error.message || 'Failed to logout';
                            Platform.OS === 'web' ? window.alert(`Error: ${msg}`) : Alert.alert('Error', msg);
                        }
                    },
                    true
                );
            }
        } catch (error) {
            console.error('Handle logout error:', error);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerEmoji}>⚙️</Text>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>

            {/* Profile Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Profile</Text>

                <View style={styles.profileCard}>
                    <Text style={styles.profileEmoji}>👤</Text>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileLabel}>Nickname</Text>
                        <Text style={styles.profileValue}>{nickname}</Text>
                    </View>
                </View>
            </View>

            {/* Privacy Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Privacy</Text>

                <View style={styles.menuItem}>
                    <View style={styles.menuItemLeft}>
                        <Text style={styles.menuItemText}>Share Activity</Text>
                        <Text style={styles.menuItemSubtext}>
                            {isSharingEnabled
                                ? 'Friends can see your sessions'
                                : 'Your activity is private'}
                        </Text>
                    </View>
                    <Switch
                        value={isSharingEnabled}
                        onValueChange={handleToggleSharing}
                        trackColor={{
                            false: theme.colors.border,
                            true: theme.colors.primary,
                        }}
                        thumbColor={theme.colors.text}
                    />
                </View>

                {!isSharingEnabled && (
                    <View style={styles.warningBox}>
                        <Text style={styles.warningText}>
                            ⚠️ Your activity feed is disabled while sharing is off
                        </Text>
                    </View>
                )}
            </View>

            {/* Friends Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Friends ({friends.length})</Text>

                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => setFriendsOverlayVisible(true)}
                >
                    <Text style={styles.menuItemText}>Manage Friends</Text>
                    <Text style={styles.menuItemIcon}>→</Text>
                </TouchableOpacity>

                {friends.length > 0 && (
                    <View style={styles.friendsList}>
                        {friends.slice(0, 3).map((friend) => (
                            <View key={friend.id} style={styles.friendItem}>
                                <View style={styles.friendItemLeft}>
                                    <Text style={styles.friendEmoji}>👤</Text>
                                    <Text style={styles.friendNickname}>{friend.nickname}</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => handleRemoveFriend(friend.id, friend.nickname)}
                                >
                                    <Text style={styles.removeText}>Remove</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                        {friends.length > 3 && (
                            <TouchableOpacity
                                style={styles.viewAllButton}
                                onPress={() => setFriendsOverlayVisible(true)}
                            >
                                <Text style={styles.viewAllText}>
                                    View all {friends.length} friends →
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            {/* About Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>

                <View style={styles.infoCard}>
                    <Text style={styles.infoText}>
                        Friendspo - Track your bathroom habits and compete with friends!
                    </Text>
                    <Text style={styles.versionText}>Version 1.0.0</Text>
                </View>
            </View>

            {/* Danger Zone */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Danger Zone</Text>

                <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteProfile}>
                    <Text style={styles.dangerButtonText}>Delete Profile</Text>
                </TouchableOpacity>
            </View>

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
                <Text style={styles.footerText}>Made with 💩 and ❤️</Text>
            </View>

            <FriendsOverlay
                visible={friendsOverlayVisible}
                userId={userId}
                onClose={() => setFriendsOverlayVisible(false)}
                onRequestsUpdated={loadFriends}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        alignItems: 'center',
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.surface,
    },
    headerEmoji: {
        fontSize: 60,
        marginBottom: theme.spacing.sm,
    },
    headerTitle: {
        fontSize: theme.fontSize.xxl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    section: {
        marginTop: theme.spacing.lg,
        paddingHorizontal: theme.spacing.lg,
    },
    sectionTitle: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        ...theme.shadows.sm,
    },
    profileEmoji: {
        fontSize: 40,
        marginRight: theme.spacing.md,
    },
    profileInfo: {
        flex: 1,
    },
    profileLabel: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
    },
    profileValue: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.sm,
        ...theme.shadows.sm,
    },
    menuItemLeft: {
        flex: 1,
    },
    menuItemText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        fontWeight: theme.fontWeight.medium,
    },
    menuItemSubtext: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    menuItemIcon: {
        fontSize: theme.fontSize.lg,
        color: theme.colors.primary,
        fontWeight: theme.fontWeight.bold,
    },
    warningBox: {
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginTop: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.warning,
    },
    warningText: {
        color: theme.colors.text,
        fontSize: theme.fontSize.sm,
        textAlign: 'center',
    },
    friendsList: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.sm,
        marginTop: theme.spacing.sm,
    },
    friendItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    friendItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    friendEmoji: {
        fontSize: 20,
        marginRight: theme.spacing.sm,
    },
    friendNickname: {
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
    },
    removeText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.danger,
        fontWeight: theme.fontWeight.semibold,
    },
    viewAllButton: {
        padding: theme.spacing.sm,
        alignItems: 'center',
    },
    viewAllText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.primary,
        fontWeight: theme.fontWeight.semibold,
    },
    infoCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        ...theme.shadows.sm,
    },
    infoText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
        lineHeight: 22,
        marginBottom: theme.spacing.md,
    },
    versionText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textTertiary,
    },
    dangerButton: {
        backgroundColor: theme.colors.danger,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        alignItems: 'center',
        ...theme.shadows.md,
    },
    dangerButtonText: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    logoutButton: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        margin: theme.spacing.lg,
        marginTop: theme.spacing.xl,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.danger,
    },
    logoutButtonText: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.danger,
    },
    footer: {
        alignItems: 'center',
        padding: theme.spacing.xl,
    },
    footerText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textTertiary,
    },
});

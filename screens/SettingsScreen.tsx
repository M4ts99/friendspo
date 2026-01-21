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
    TextInput,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { theme } from '../styles/theme';
import { authService } from '../services/authService';
import { friendService } from '../services/friendService';
import { User } from '../services/supabase';
import FriendsOverlay from '../components/FriendsOverlay';
import ConfirmationModal from '../components/ConfirmationModal';
import { User as UserIcon, Settings as SettingsIcon, ChevronRight, AlertTriangle, Lock, Mail, Key } from 'lucide-react-native';

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

    // Confirmation Modal State
    const [modalConfig, setModalConfig] = useState({
        visible: false,
        title: '',
        message: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        isDestructive: false,
        onConfirm: () => { },
    });
    const [hasPassword, setHasPassword] = useState(true);

    // Account Modal State
    const [accountModalVisible, setAccountModalVisible] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [updating, setUpdating] = useState(false);

    const hideModal = () => {
        setModalConfig(prev => ({ ...prev, visible: false }));
    };

    const confirmAction = (
        title: string,
        message: string,
        onConfirm: () => void,
        isDestructive = false,
        confirmText = isDestructive ? 'Delete' : 'OK',
        cancelText = 'Cancel'
    ) => {
        setModalConfig({
            visible: true,
            title,
            message,
            onConfirm: () => {
                hideModal();
                onConfirm();
            },
            isDestructive,
            confirmText,
            cancelText,
        });
    };

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

    const checkPasswordStatus = async () => {
        const status = await authService.hasPassword();
        setHasPassword(status);
    };

    useEffect(() => {
        checkPasswordStatus();
    }, []);

    const handleUpdateAccount = async () => {
        if (!password) {
            Alert.alert('Error', 'Password is required');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        setUpdating(true);
        try {
            await authService.upgradeUser(password, email.trim() || undefined);
            Alert.alert('Success', 'Account updated successfully!');
            setAccountModalVisible(false);
            setHasPassword(true);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update account');
        } finally {
            setUpdating(false);
        }
    };

    // confirmAction replaced by state-based implementation above

    const handleToggleSharing = async (value: boolean) => {
        try {
            await authService.updatePrivacySettings(userId, value);
            setIsSharingEnabled(value);

            if (!value) {
                confirmAction(
                    'Sharing Disabled',
                    'Your activity feed has been disabled. Friends will not see your sessions.',
                    () => { },
                    false,
                    'OK',
                    'Close'
                );
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
                setTimeout(() => {
                    confirmAction(
                        '🛑 Final Warning',
                        'This is your last chance!\n\nAre you absolutely sure you want to permanently delete your account?',
                        async () => {
                            try {
                                console.log('Deleting profile...');
                                await authService.deleteProfile(userId);
                                onLogout();
                            } catch (error: any) {
                                console.error('Delete profile error:', error);
                                Alert.alert('Error', error.message || 'Failed to delete profile');
                            }
                        },
                        true,
                        'Yes, Delete My Account'
                    );
                }, 300);
            },
            true,
            'Delete Forever'
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
                    Alert.alert('Error', error.message || 'Failed to remove friend');
                }
            },
            true,
            'Remove'
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
                            Alert.alert('Error', error.message || 'Failed to logout');
                        }
                    },
                    true,
                    'Logout & Delete'
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
                            Alert.alert('Error', error.message || 'Failed to logout');
                        }
                    },
                    true,
                    'Logout'
                );
            }
        } catch (error) {
            console.error('Handle logout error:', error);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <SettingsIcon size={60} color={theme.colors.text} style={{ marginBottom: theme.spacing.sm }} />
                <Text style={styles.headerTitle}>Settings</Text>
            </View>

            {/* Profile Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Profile</Text>

                <View style={styles.profileCard}>
                    <UserIcon size={40} color={theme.colors.text} style={{ marginRight: theme.spacing.md }} />
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <AlertTriangle size={16} color={theme.colors.text} />
                            <Text style={styles.warningText}>
                                Your activity feed is disabled while sharing is off
                            </Text>
                        </View>
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
                    <ChevronRight size={24} color={theme.colors.primary} />
                </TouchableOpacity>

                {friends.length > 0 && (
                    <View style={styles.friendsList}>
                        {friends.slice(0, 3).map((friend) => (
                            <View key={friend.id} style={styles.friendItem}>
                                <View style={styles.friendItemLeft}>
                                    <UserIcon size={20} color={theme.colors.text} style={{ marginRight: theme.spacing.sm }} />
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

            {/* Account Section (Conditional) */}
            {!hasPassword && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => setAccountModalVisible(true)}
                    >
                        <View style={styles.menuItemLeft}>
                            <Text style={styles.menuItemText}>Account Information</Text>
                            <Text style={styles.menuItemSubtext}>Add email and password to secure account</Text>
                        </View>
                        <Lock size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>
            )}

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

            <ConfirmationModal
                visible={modalConfig.visible}
                title={modalConfig.title}
                message={modalConfig.message}
                confirmText={modalConfig.confirmText}
                cancelText={modalConfig.cancelText}
                isDestructive={modalConfig.isDestructive}
                onConfirm={modalConfig.onConfirm}
                onCancel={hideModal}
            />

            {/* Account Info Modal */}
            <Modal
                visible={accountModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setAccountModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Secure Account</Text>
                            <TouchableOpacity onPress={() => setAccountModalVisible(false)}>
                                <Text style={styles.closeText}>Close</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalContent}>
                            <Text style={styles.modalDescription}>
                                Add a password to ensure you can log back in later. Email is optional but recommended for recovery.
                            </Text>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Email (Optional)</Text>
                                <View style={styles.inputWrapper}>
                                    <Mail size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        value={email}
                                        onChangeText={setEmail}
                                        placeholder="email@example.com"
                                        placeholderTextColor={theme.colors.textTertiary}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                </View>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Password *</Text>
                                <View style={styles.inputWrapper}>
                                    <Key size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        value={password}
                                        onChangeText={setPassword}
                                        placeholder="Min. 6 characters"
                                        placeholderTextColor={theme.colors.textTertiary}
                                        secureTextEntry
                                    />
                                </View>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Confirm Password *</Text>
                                <View style={styles.inputWrapper}>
                                    <Key size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        placeholder="Retype password"
                                        placeholderTextColor={theme.colors.textTertiary}
                                        secureTextEntry
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.saveButton, updating && styles.disabledButton]}
                                onPress={handleUpdateAccount}
                                disabled={updating}
                            >
                                {updating ? (
                                    <ActivityIndicator color={theme.colors.text} />
                                ) : (
                                    <Text style={styles.saveButtonText}>Save Account Info</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: theme.spacing.lg,
    },
    modalContainer: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    modalTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    closeText: {
        color: theme.colors.primary,
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.medium,
    },
    modalContent: {
        padding: theme.spacing.lg,
    },
    modalDescription: {
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.md,
        marginBottom: theme.spacing.xl,
        lineHeight: 20,
    },
    inputContainer: {
        marginBottom: theme.spacing.lg,
    },
    inputLabel: {
        color: theme.colors.text,
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.bold,
        marginBottom: theme.spacing.sm,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: theme.spacing.md,
    },
    inputIcon: {
        marginRight: theme.spacing.sm,
    },
    input: {
        flex: 1,
        paddingVertical: theme.spacing.md,
        color: theme.colors.text,
        fontSize: theme.fontSize.md,
    },
    saveButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        marginTop: theme.spacing.sm,
    },
    disabledButton: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: theme.colors.text,
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.bold,
    },
});

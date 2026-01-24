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

    // Account Info State
    const [accountInfo, setAccountInfo] = useState<{
        email: string | null;
        hasPassword: boolean;
        nickname: string;
        canChangeNickname: boolean;
        nextNicknameChange: Date | null;
    } | null>(null);

    // Account Modal State
    const [accountModalVisible, setAccountModalVisible] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [updating, setUpdating] = useState(false);

    // Change Password Modal State
    const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    // Change Nickname Modal State
    const [changeNicknameModalVisible, setChangeNicknameModalVisible] = useState(false);
    const [newNickname, setNewNickname] = useState('');
    const [nicknamePassword, setNicknamePassword] = useState('');

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

    const loadAccountInfo = async () => {
        try {
            const info = await authService.getAccountInfo();
            setAccountInfo(info);
            setHasPassword(info.hasPassword);
        } catch (error) {
            console.error('Error loading account info:', error);
        }
    };

    useEffect(() => {
        loadAccountInfo();
    }, []);

    const handleUpdateAccount = async () => {
        console.log('🔧 [SETTINGS] handleUpdateAccount called');

        if (updating) {
            console.log('⚠️ [SETTINGS] Already updating, ignoring call');
            return; // Prevent multiple calls
        }

        console.log('🔧 [SETTINGS] Email:', email);
        console.log('🔧 [SETTINGS] Password length:', password?.length);

        if (!email || !email.includes('@')) {
            console.log('❌ [SETTINGS] Invalid email');
            Alert.alert('Error', 'A valid email address is required');
            return;
        }
        if (!password) {
            console.log('❌ [SETTINGS] No password');
            Alert.alert('Error', 'Password is required');
            return;
        }
        if (password !== confirmPassword) {
            console.log('❌ [SETTINGS] Passwords do not match');
            Alert.alert('Error', 'Passwords do not match');
            return;
        }
        if (password.length < 6) {
            console.log('❌ [SETTINGS] Password too short');
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        console.log('🔧 [SETTINGS] Starting upgrade...');
        setUpdating(true);

        try {
            await authService.upgradeUser(email.trim(), password);
            console.log('✅ [SETTINGS] Upgrade successful!');
            Alert.alert('Success', 'Account secured successfully!');
            setAccountModalVisible(false);
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            await loadAccountInfo();
        } catch (error: any) {
            console.error('❌ [SETTINGS] Update account error:', error);
            Alert.alert('Error', error.message || 'Failed to update account');
        } finally {
            console.log('🔧 [SETTINGS] Setting updating to false');
            setUpdating(false);
        }
    };

    const handleChangePassword = async () => {
        if (!oldPassword) {
            Alert.alert('Error', 'Current password is required');
            return;
        }
        if (!newPassword || newPassword.length < 6) {
            Alert.alert('Error', 'New password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            Alert.alert('Error', 'New passwords do not match');
            return;
        }

        setUpdating(true);
        try {
            await authService.changePassword(oldPassword, newPassword);
            Alert.alert('Success', 'Password changed successfully!');
            setChangePasswordModalVisible(false);
            setOldPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to change password');
        } finally {
            setUpdating(false);
        }
    };

    const handleChangeNickname = async () => {
        if (!newNickname || newNickname.length < 3) {
            Alert.alert('Error', 'Nickname must be at least 3 characters');
            return;
        }
        if (hasPassword && !nicknamePassword) {
            Alert.alert('Error', 'Password is required to change nickname');
            return;
        }

        setUpdating(true);
        try {
            await authService.changeNickname(newNickname, nicknamePassword);
            Alert.alert('Success', 'Nickname changed successfully!');
            setChangeNicknameModalVisible(false);
            setNewNickname('');
            setNicknamePassword('');
            loadAccountInfo();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to change nickname');
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

            {/* Account Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account</Text>

                {/* Email Display */}
                <View style={styles.accountInfoCard}>
                    <View style={styles.accountInfoRow}>
                        <Mail size={20} color={theme.colors.textSecondary} />
                        <View style={styles.accountInfoContent}>
                            <Text style={styles.accountInfoLabel}>Email</Text>
                            <Text style={styles.accountInfoValue}>
                                {accountInfo?.email || 'Not set'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.accountInfoRow}>
                        <Key size={20} color={theme.colors.textSecondary} />
                        <View style={styles.accountInfoContent}>
                            <Text style={styles.accountInfoLabel}>Password</Text>
                            <Text style={styles.accountInfoValue}>
                                {hasPassword ? '••••••••' : 'Not set'}
                            </Text>
                        </View>
                        {hasPassword && (
                            <TouchableOpacity onPress={() => setChangePasswordModalVisible(true)}>
                                <Text style={styles.changeLink}>Change</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.accountInfoRow}>
                        <UserIcon size={20} color={theme.colors.textSecondary} />
                        <View style={styles.accountInfoContent}>
                            <Text style={styles.accountInfoLabel}>Nickname</Text>
                            <Text style={styles.accountInfoValue}>{accountInfo?.nickname || nickname}</Text>
                        </View>
                        {accountInfo?.canChangeNickname ? (
                            <TouchableOpacity onPress={() => setChangeNicknameModalVisible(true)}>
                                <Text style={styles.changeLink}>Change</Text>
                            </TouchableOpacity>
                        ) : (
                            <Text style={styles.cooldownText}>Wait 7 days</Text>
                        )}
                    </View>
                </View>

                {/* Secure Account Button - only for guest users */}
                {!hasPassword && (
                    <TouchableOpacity
                        style={styles.secureButton}
                        onPress={() => setAccountModalVisible(true)}
                    >
                        <Lock size={20} color={theme.colors.text} />
                        <Text style={styles.secureButtonText}>Secure Your Account</Text>
                    </TouchableOpacity>
                )}
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
                                Add email and password to secure your account. Email is required for password recovery.
                            </Text>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Email *</Text>
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
                                    <Text style={styles.saveButtonText}>Secure Account</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Change Password Modal */}
            <Modal
                visible={changePasswordModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setChangePasswordModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Change Password</Text>
                            <TouchableOpacity onPress={() => setChangePasswordModalVisible(false)}>
                                <Text style={styles.closeText}>Close</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalContent}>
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Current Password *</Text>
                                <View style={styles.inputWrapper}>
                                    <Key size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        value={oldPassword}
                                        onChangeText={setOldPassword}
                                        placeholder="Enter current password"
                                        placeholderTextColor={theme.colors.textTertiary}
                                        secureTextEntry
                                    />
                                </View>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>New Password *</Text>
                                <View style={styles.inputWrapper}>
                                    <Key size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                        placeholder="Min. 6 characters"
                                        placeholderTextColor={theme.colors.textTertiary}
                                        secureTextEntry
                                    />
                                </View>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Confirm New Password *</Text>
                                <View style={styles.inputWrapper}>
                                    <Key size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        value={confirmNewPassword}
                                        onChangeText={setConfirmNewPassword}
                                        placeholder="Retype new password"
                                        placeholderTextColor={theme.colors.textTertiary}
                                        secureTextEntry
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.saveButton, updating && styles.disabledButton]}
                                onPress={handleChangePassword}
                                disabled={updating}
                            >
                                {updating ? (
                                    <ActivityIndicator color={theme.colors.text} />
                                ) : (
                                    <Text style={styles.saveButtonText}>Change Password</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Change Nickname Modal */}
            <Modal
                visible={changeNicknameModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setChangeNicknameModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Change Nickname</Text>
                            <TouchableOpacity onPress={() => setChangeNicknameModalVisible(false)}>
                                <Text style={styles.closeText}>Close</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalContent}>
                            <Text style={styles.modalDescription}>
                                You can only change your nickname once per week.
                            </Text>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>New Nickname *</Text>
                                <View style={styles.inputWrapper}>
                                    <UserIcon size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        value={newNickname}
                                        onChangeText={setNewNickname}
                                        placeholder="Min. 3 characters"
                                        placeholderTextColor={theme.colors.textTertiary}
                                        autoCapitalize="none"
                                    />
                                </View>
                            </View>

                            {hasPassword && (
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Current Password *</Text>
                                    <View style={styles.inputWrapper}>
                                        <Key size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            value={nicknamePassword}
                                            onChangeText={setNicknamePassword}
                                            placeholder="Verify with password"
                                            placeholderTextColor={theme.colors.textTertiary}
                                            secureTextEntry
                                        />
                                    </View>
                                </View>
                            )}

                            <TouchableOpacity
                                style={[styles.saveButton, updating && styles.disabledButton]}
                                onPress={handleChangeNickname}
                                disabled={updating}
                            >
                                {updating ? (
                                    <ActivityIndicator color={theme.colors.text} />
                                ) : (
                                    <Text style={styles.saveButtonText}>Change Nickname</Text>
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
    accountInfoCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        ...theme.shadows.sm,
    },
    accountInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    accountInfoContent: {
        flex: 1,
        marginLeft: theme.spacing.md,
    },
    accountInfoLabel: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    accountInfoValue: {
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        fontWeight: theme.fontWeight.medium,
    },
    changeLink: {
        color: theme.colors.primary,
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
    },
    cooldownText: {
        color: theme.colors.textTertiary,
        fontSize: theme.fontSize.xs,
    },
    secureButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginTop: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    secureButtonText: {
        color: theme.colors.text,
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.bold,
    },
});

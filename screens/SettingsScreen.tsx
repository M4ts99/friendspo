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
import { 
    User as UserIcon, 
    Settings as SettingsIcon, 
    ChevronRight, 
    AlertTriangle, 
    Lock, 
    Mail, 
    Key,
    ChevronDown, 
    ChevronUp 
} from 'lucide-react-native';

import { ScreenContainer } from '../components/ScreenContainer';

interface SettingsScreenProps {
    userId: string;
    nickname: string;
    onLogout: () => void;
    onUserUpdate: (data: { nickname: string }) => void;
}

export default function SettingsScreen({
    userId,
    nickname,
    onLogout,
    onUserUpdate,
}: SettingsScreenProps) {
    const [isSharingEnabled, setIsSharingEnabled] = useState(true);
    const [friends, setFriends] = useState<User[]>([]);
    const [friendsOverlayVisible, setFriendsOverlayVisible] = useState(false);
    
    // Stato per mostrare/nascondere i dettagli account
    const [showAccountDetails, setShowAccountDetails] = useState(false);

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
            console.log("Account Info Loaded:", info); // <--- DEBUG: Controlla cosa stampa questo log
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
        if (updating) return;

        if (!email || !email.includes('@')) {
            Alert.alert('Error', 'A valid email address is required');
            return;
        }
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
            await authService.upgradeUser(email.trim(), password);
            Alert.alert('Success', 'Account secured successfully!');
            setAccountModalVisible(false);
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            await loadAccountInfo();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update account');
        } finally {
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
            Alert.alert('Success', 'Nickname changed successfully! 🥸');
            setChangeNicknameModalVisible(false);
            setNicknamePassword('');
            setAccountInfo(prev => {
                if (!prev) return null;
                const nextDate = new Date();
                nextDate.setDate(nextDate.getDate() + 7);
                return {
                    ...prev,
                    nickname: newNickname,
                    canChangeNickname: false,
                    nextNicknameChange: nextDate
                };
            });
            onUserUpdate({ nickname: newNickname });
            setNewNickname('');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to change nickname');
        } finally {
            setUpdating(false);
        }
    };

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
            setIsSharingEnabled(!value);
        }
    };

    const handleDeleteProfile = async () => {
        confirmAction(
            '⚠️ Delete Profile',
            'Are you sure you want to delete your profile?\n\nThis will permanently delete:\n• All your sessions\n• All friendships\n• All stats and data\n\nThis action CANNOT be undone!',
            () => {
                setTimeout(() => {
                    confirmAction(
                        '🛑 Final Warning',
                        'This is your last chance!\n\nAre you absolutely sure you want to permanently delete your account?',
                        async () => {
                            try {
                                await authService.deleteProfile(userId);
                                onLogout();
                            } catch (error: any) {
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

    const handleLogout = async () => {
        try {
            const hasPassword = await authService.hasPassword();
            if (!hasPassword) {
                confirmAction(
                    '⚠️ Warning: No Password Set',
                    'You did not set a password for this account!\n\nIf you logout now, you will NOT be able to log back in and your account will be PERMANENTLY DELETED.\n\nAre you sure you want to logout and delete your account?',
                    async () => {
                        try {
                            await authService.deleteProfile(userId);
                            onLogout();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to logout');
                        }
                    },
                    true,
                    'Logout & Delete'
                );
            } else {
                confirmAction(
                    'Logout',
                    'Are you sure you want to logout?',
                    async () => {
                        try {
                            await authService.signOut();
                            onLogout();
                        } catch (error: any) {
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
        <ScreenContainer>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.header}>
                    <SettingsIcon size={60} color={theme.colors.text} style={{ marginBottom: theme.spacing.sm }} />
                    <Text style={styles.headerTitle}>Settings</Text>
                </View>

                {/* Profile & Account Section Combined */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account & Profile</Text>

                    {/* Guest Warning */}
                    {!hasPassword && (
                        <View style={[styles.warningBox, { marginBottom: theme.spacing.md }]}>
                            <Text style={styles.warningText}>
                                ⚠️ Guest Mode: Data lost on logout.
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity 
                        style={styles.profileCard} 
                        onPress={() => setShowAccountDetails(!showAccountDetails)}
                        activeOpacity={0.8}
                    >
                        {/* Header Visibile Sempre */}
                        <View style={styles.profileHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                <UserIcon size={40} color={theme.colors.text} style={{ marginRight: theme.spacing.md }} />
                                <View>
                                    <Text style={styles.profileLabel}>Nickname</Text>
                                    <Text style={styles.profileValue}>{nickname}</Text>
                                </View>
                            </View>
                            
                            {/* Guest Badge or Chevron */}
                            <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                {!hasPassword && (
                                    <View style={styles.guestBadge}>
                                        <Text style={styles.guestBadgeText}>Guest</Text>
                                    </View>
                                )}
                                {showAccountDetails ? (
                                    <ChevronUp size={20} color={theme.colors.textSecondary} />
                                ) : (
                                    <ChevronDown size={20} color={theme.colors.textSecondary} />
                                )}
                            </View>
                        </View>

                        {/* Dettagli Espandibili (Email, Pwd, Actions) */}
                        {showAccountDetails && (
                            <View style={styles.expandedDetails}>
                                <View style={styles.divider} />
                                
                                {/* Email Row */}
                                <View style={styles.accountInfoRow}>
                                    <Mail size={20} color={theme.colors.textSecondary} />
                                    <View style={styles.accountInfoContent}>
                                        <Text style={styles.accountInfoLabel}>Email</Text>
                                        <Text style={styles.accountInfoValue}>
                                            {accountInfo?.email || 'Not set'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Password Row */}
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

                                {/* Nickname Change Action */}
                                <View style={styles.actionsRow}>
                                    {accountInfo?.canChangeNickname ? (
                                        <TouchableOpacity 
                                            style={styles.actionButtonOutline}
                                            onPress={() => setChangeNicknameModalVisible(true)}
                                        >
                                            <Text style={styles.actionButtonTextOutline}>Change Nickname</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <Text style={styles.cooldownText}>
                                            {accountInfo?.nextNicknameChange ? (
                                                <CooldownTimer targetDate={accountInfo.nextNicknameChange} />
                                            ) : (
                                                "Nickname change unavailable"
                                            )}
                                        </Text>
                                    )}
                                </View>

                                {/* Create Account (Guest Only) */}
                                {!hasPassword && (
                                    <TouchableOpacity
                                        style={styles.secureButton}
                                        onPress={() => setAccountModalVisible(true)}
                                    >
                                        <Lock size={18} color={theme.colors.text} />
                                        <Text style={styles.secureButtonText}>Create Account</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </TouchableOpacity>
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
                                    Your activity feed is disabled
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Friends Section - SEMPLIFICATA */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Friends ({friends.length})</Text>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => setFriendsOverlayVisible(true)}
                    >
                        <Text style={styles.menuItemText}>Manage Friends</Text>
                        <ChevronRight size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                    {/* Lista anteprima rimossa come richiesto */}
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
            </ScrollView>

            {/* --- MODALS (Codice invariato) --- */}
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
                                Add email and password to secure your account.
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
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: theme.spacing.xxl * 2,
    },
    header: {
        alignItems: 'center',
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.surface,
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
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        ...theme.shadows.sm,
    },
    profileHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    expandedDetails: {
        marginTop: theme.spacing.md,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginBottom: theme.spacing.md,
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
    actionsRow: {
        marginTop: theme.spacing.md,
        alignItems: 'center',
    },
    actionButtonOutline: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.primary,
        width: '100%',
        alignItems: 'center',
    },
    actionButtonTextOutline: {
        color: theme.colors.primary,
        fontWeight: theme.fontWeight.semibold,
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
    // Modals
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
        textAlign: 'center',
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
    guestBadge: {
        backgroundColor: 'rgba(255,165,0,0.2)',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: 'rgba(255,165,0,0.5)',
    },
    guestBadgeText: {
        color: theme.colors.warning || '#FFA500',
        fontSize: theme.fontSize.xs,
        fontWeight: theme.fontWeight.bold,
    },
});

// Componente per il conto alla rovescia dinamico
const CooldownTimer = ({ targetDate }: { targetDate: Date | string }) => {
    const [timeString, setTimeString] = useState('');

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date().getTime();
            const target = new Date(targetDate).getTime();
            const distance = target - now;

            if (distance < 0) {
                setTimeString("Available now");
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            if (days > 0) {
                setTimeString(`${days} day${days > 1 ? 's' : ''}`);
            } else if (hours > 0) {
                setTimeString(`${hours} hour${hours > 1 ? 's' : ''}`);
            } else if (minutes > 0) {
                setTimeString(`${minutes} minute${minutes > 1 ? 's' : ''}`);
            } else {
                setTimeString(`${seconds} second${seconds !== 1 ? 's' : ''}`);
            }
        };

        // Aggiorna subito e poi ogni secondo
        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [targetDate]);

    return <Text>{`Nickname change available in ${timeString}`}</Text>;
};
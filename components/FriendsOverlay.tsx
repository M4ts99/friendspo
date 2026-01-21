import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    FlatList,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { theme } from '../styles/theme';
import { friendService } from '../services/friendService';
import { User, FriendshipWithUser } from '../services/supabase';
import { User as UserIcon, Users, Mail, X, Plus, ChevronDown, ChevronUp, PlusCircle, CheckCircle } from 'lucide-react-native';
import ConfirmationModal from './ConfirmationModal';
import { Platform } from 'react-native';

interface FriendsOverlayProps {
    visible: boolean;
    userId: string;
    onClose: () => void;
    onRequestsUpdated: () => void;
}

export default function FriendsOverlay({
    visible,
    userId,
    onClose,
    onRequestsUpdated,
}: FriendsOverlayProps) {
    const [tab, setTab] = useState<'friends' | 'requests'>('friends');
    const [friends, setFriends] = useState<User[]>([]);
    const [requests, setRequests] = useState<FriendshipWithUser[]>([]);
    const [addFriendNickname, setAddFriendNickname] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [showAddSection, setShowAddSection] = useState(false);
    const [loading, setLoading] = useState(false);

    // UI States
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; nickname: string } | null>(null);
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    useEffect(() => {
        if (visible) {
            loadData();
        }
    }, [visible]);

    const loadData = async () => {
        try {
            const [friendsData, requestsData] = await Promise.all([
                friendService.getFriends(userId),
                friendService.getPendingRequests(userId),
            ]);
            setFriends(friendsData);
            setRequests(requestsData);
        } catch (error) {
            console.error('Error loading friends data:', error);
        }
    };

    // Live search effect
    useEffect(() => {
        const search = async () => {
            if (addFriendNickname.trim().length >= 2) {
                try {
                    const results = await friendService.searchUsers(addFriendNickname.trim());
                    // Filter out self and existing friends
                    const filtered = results.filter(
                        user => user.id !== userId && !friends.some(f => f.id === user.id)
                    );
                    setSearchResults(filtered);
                } catch (error) {
                    console.error('Search error:', error);
                }
            } else {
                setSearchResults([]);
            }
        };

        const timeoutId = setTimeout(search, 300); // 300ms debounce
        return () => clearTimeout(timeoutId);
    }, [addFriendNickname, userId, friends]);

    const handleSendRequest = async (nickname: string) => {
        setLoading(true);
        try {
            await friendService.sendFriendRequest(userId, nickname);

            // Show success feedback
            setShowSuccessToast(true);
            setAddFriendNickname('');
            setSearchResults([]);

            // Hide feedback and close section after delay
            setTimeout(() => {
                setShowSuccessToast(false);
                setShowAddSection(false);
                loadData();
            }, 2000);

        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to send friend request');
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptRequest = async (requestId: string) => {
        try {
            await friendService.acceptFriendRequest(requestId);
            Alert.alert('Success', 'Friend request accepted!');
            loadData();
            onRequestsUpdated();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to accept request');
        }
    };

    const handleDeclineRequest = async (requestId: string) => {
        try {
            await friendService.declineFriendRequest(requestId);
            loadData();
            onRequestsUpdated();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to decline request');
        }
    };

    const handleRemoveClick = (friendId: string, friendNickname: string) => {
        setDeleteConfirmation({ id: friendId, nickname: friendNickname });
    };

    const confirmRemoveFriend = async () => {
        if (!deleteConfirmation) return;

        try {
            await friendService.removeFriend(userId, deleteConfirmation.id);
            loadData();
            setDeleteConfirmation(null);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to remove friend');
        }
    };

    const renderFriend = ({ item }: { item: User }) => (
        <View style={styles.listItem}>
            <View style={styles.listItemLeft}>
                <UserIcon size={24} color={theme.colors.text} style={{ marginRight: theme.spacing.sm }} />
                <Text style={styles.listItemText}>{item.nickname}</Text>
            </View>
            <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveClick(item.id, item.nickname)}
            >
                <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
        </View>
    );

    const renderRequest = ({ item }: { item: FriendshipWithUser }) => (
        <View style={styles.listItem}>
            <View style={styles.listItemLeft}>
                <UserIcon size={24} color={theme.colors.text} style={{ marginRight: theme.spacing.sm }} />
                <Text style={styles.listItemText}>{item.users.nickname}</Text>
            </View>
            <View style={styles.requestButtons}>
                <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAcceptRequest(item.id)}
                >
                    <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.declineButton}
                    onPress={() => handleDeclineRequest(item.id)}
                >
                    <Text style={styles.declineButtonText}>Decline</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Friends</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabs}>
                        <TouchableOpacity
                            style={[styles.tab, tab === 'friends' && styles.tabActive]}
                            onPress={() => setTab('friends')}
                        >
                            <Text style={[styles.tabText, tab === 'friends' && styles.tabTextActive]}>
                                Friends ({friends.length})
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, tab === 'requests' && styles.tabActive]}
                            onPress={() => setTab('requests')}
                        >
                            <Text style={[styles.tabText, tab === 'requests' && styles.tabTextActive]}>
                                Requests ({requests.length})
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Add Friend Section (Collapsible) */}
                    <View style={styles.addSectionContainer}>
                        <TouchableOpacity
                            style={styles.addSectionHeader}
                            onPress={() => setShowAddSection(!showAddSection)}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Plus size={20} color={theme.colors.primary} />
                                <Text style={styles.addSectionTitle}>Add new Friend</Text>
                            </View>
                            {showAddSection ? (
                                <ChevronUp size={20} color={theme.colors.textSecondary} />
                            ) : (
                                <ChevronDown size={20} color={theme.colors.textSecondary} />
                            )}
                        </TouchableOpacity>

                        {showAddSection && (
                            <View style={styles.addFriendSection}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Search by nickname..."
                                    placeholderTextColor={theme.colors.textTertiary}
                                    value={addFriendNickname}
                                    onChangeText={setAddFriendNickname}
                                    autoCapitalize="none"
                                />

                                {/* Search Results */}
                                {searchResults.length > 0 && (
                                    <View style={styles.searchResults}>
                                        {searchResults.map((user) => (
                                            <TouchableOpacity
                                                key={user.id}
                                                style={styles.searchResultItem}
                                                onPress={() => handleSendRequest(user.nickname)}
                                            >
                                                <Text style={styles.searchResultName}>{user.nickname}</Text>
                                                <PlusCircle size={24} color={theme.colors.success} />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    {/* List */}
                    <FlatList
                        data={tab === 'friends' ? friends : (requests as any[])}
                        renderItem={tab === 'friends' ? renderFriend : renderRequest as any}
                        keyExtractor={(item) => item.id}
                        style={styles.list}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                {tab === 'friends' ? (
                                    <Users size={60} color={theme.colors.textTertiary} style={{ marginBottom: theme.spacing.md }} />
                                ) : (
                                    <Mail size={60} color={theme.colors.textTertiary} style={{ marginBottom: theme.spacing.md }} />
                                )}
                                <Text style={styles.emptyText}>
                                    {tab === 'friends'
                                        ? 'No friends yet. Add some!'
                                        : 'No pending requests'}
                                </Text>
                            </View>
                        }
                    />
                </View>

                {/* Success Toast */}
                {showSuccessToast && (
                    <View style={styles.toast}>
                        <CheckCircle size={24} color={theme.colors.success} />
                        <Text style={styles.toastText}>Friend Request Sent!</Text>
                    </View>
                )}
            </View>

            {/* Custom Confirmation Modal */}
            <ConfirmationModal
                visible={!!deleteConfirmation}
                title="Remove Friend"
                message={`Are you sure you want to remove ${deleteConfirmation?.nickname}? This action cannot be undone.`}
                confirmText="Remove"
                cancelText="Keep"
                isDestructive
                onConfirm={confirmRemoveFriend}
                onCancel={() => setDeleteConfirmation(null)}
            />
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '90%',
        maxWidth: 500,
        maxHeight: '80%', // Limit height to avoid overflow on small screens
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.xl,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    title: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    closeButton: {
        padding: theme.spacing.sm,
    },
    closeButtonText: {
        fontSize: theme.fontSize.xl,
        color: theme.colors.textSecondary,
    },
    tabs: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    tab: {
        flex: 1,
        paddingVertical: theme.spacing.md,
        alignItems: 'center',
    },
    tabActive: {
        borderBottomWidth: 2,
        borderBottomColor: theme.colors.primary,
    },
    tabText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
        fontWeight: theme.fontWeight.medium,
    },
    tabTextActive: {
        color: theme.colors.primary,
        fontWeight: theme.fontWeight.bold,
    },
    addSectionContainer: {
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    addSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    addSectionTitle: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.primary,
    },
    addFriendSection: {
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.lg,
        gap: theme.spacing.md,
    },
    searchResults: {
        marginTop: theme.spacing.xs,
        gap: theme.spacing.sm,
    },
    searchResultItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    searchResultName: {
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        fontWeight: theme.fontWeight.medium,
    },
    input: {
        width: '100%',
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    list: {
        flex: 1,
    },
    listItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    listItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    listItemEmoji: {
        fontSize: 24,
        marginRight: theme.spacing.sm,
    },
    listItemText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        fontWeight: theme.fontWeight.medium,
    },
    requestButtons: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    acceptButton: {
        backgroundColor: theme.colors.success,
        borderRadius: theme.borderRadius.sm,
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
    },
    acceptButtonText: {
        color: theme.colors.text,
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.bold,
    },
    declineButton: {
        backgroundColor: theme.colors.danger,
        borderRadius: theme.borderRadius.sm,
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
    },
    declineButtonText: {
        color: theme.colors.text,
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.bold,
    },
    removeButton: {
        backgroundColor: theme.colors.danger,
        borderRadius: theme.borderRadius.sm,
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
    },
    removeButtonText: {
        color: theme.colors.text,
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.bold,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.xxl * 2,
    },
    emptyEmoji: {
        fontSize: 60,
        marginBottom: theme.spacing.md,
    },
    emptyText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
    },
    toast: {
        position: 'absolute',
        top: '10%',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.full,
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        ...theme.shadows.lg,
        borderWidth: 1,
        borderColor: theme.colors.success,
        zIndex: 1000,
    },
    toastText: {
        color: theme.colors.text,
        fontWeight: theme.fontWeight.bold,
        fontSize: theme.fontSize.md,
    },
});

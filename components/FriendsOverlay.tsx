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
import { User as UserIcon, Users, Mail, X } from 'lucide-react-native';

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
    const [loading, setLoading] = useState(false);

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

    const handleAddFriend = async () => {
        if (!addFriendNickname.trim()) {
            Alert.alert('Error', 'Please enter a nickname');
            return;
        }

        setLoading(true);
        try {
            await friendService.sendFriendRequest(userId, addFriendNickname.trim());
            Alert.alert('Success', 'Friend request sent!');
            setAddFriendNickname('');
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

    const handleRemoveFriend = async (friendId: string, friendNickname: string) => {
        Alert.alert(
            'Remove Friend',
            `Remove ${friendNickname} from your friends?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await friendService.removeFriend(userId, friendId);
                            loadData();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to remove friend');
                        }
                    },
                },
            ]
        );
    };

    const renderFriend = ({ item }: { item: User }) => (
        <View style={styles.listItem}>
            <View style={styles.listItemLeft}>
                <UserIcon size={24} color={theme.colors.text} style={{ marginRight: theme.spacing.sm }} />
                <Text style={styles.listItemText}>{item.nickname}</Text>
            </View>
            <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveFriend(item.id, item.nickname)}
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

                    {/* Add Friend */}
                    <View style={styles.addFriendSection}>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter nickname to add"
                            placeholderTextColor={theme.colors.textTertiary}
                            value={addFriendNickname}
                            onChangeText={setAddFriendNickname}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity
                            style={[styles.addButton, loading && styles.addButtonDisabled]}
                            onPress={handleAddFriend}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={theme.colors.text} size="small" />
                            ) : (
                                <Text style={styles.addButtonText}>Add</Text>
                            )}
                        </TouchableOpacity>
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
            </View>
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
        height: '70%',
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
    addFriendSection: {
        flexDirection: 'row',
        padding: theme.spacing.lg,
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
    },
    input: {
        flex: 1,
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    addButton: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.lg,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 80,
    },
    addButtonDisabled: {
        opacity: 0.6,
    },
    addButtonText: {
        color: theme.colors.text,
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.bold,
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
});

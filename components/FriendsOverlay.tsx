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
import { User as UserIcon, Users, Mail, X, Plus, Search, CheckCircle, Trash2, UserMinus, UserCheck } from 'lucide-react-native'; // Aggiunte icone nuove
import ConfirmationModal from './ConfirmationModal';
import { supabase } from '../services/supabase';
import { sendFriendRequestNotification } from '../hooks/usePushNotification';

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
    
    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    
    const [loading, setLoading] = useState(false);
    const [myNickname, setMyNickname] = useState('');

    // UI States
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; nickname: string } | null>(null);
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    useEffect(() => {
        if (visible) {
            loadData();
            // Reset search on open
            setSearchQuery('');
            setSearchResults([]);
        }
    }, [visible]);

    const loadData = async () => {
        try {
            const [friendsData, requestsData, myProfileData] = await Promise.all([
                friendService.getFriends(userId),
                friendService.getPendingRequests(userId),
                supabase.from('users').select('nickname').eq('id', userId).single()
            ]);
            
            setFriends(friendsData);
            setRequests(requestsData);
            
            if (myProfileData.data) {
                setMyNickname(myProfileData.data.nickname);
            }

        } catch (error) {
            console.error('Error loading friends data:', error);
        }
    };

    // Live search effect
    useEffect(() => {
        const search = async () => {
            if (searchQuery.trim().length >= 2) {
                setIsSearching(true);
                try {
                    // 1. Cerchiamo nel DB globale
                    const results = await friendService.searchUsers(searchQuery.trim());
                    
                    // 2. Filtriamo noi stessi dai risultati
                    const filtered = results.filter(user => user.id !== userId);
                    
                    setSearchResults(filtered);
                } catch (error) {
                    console.error('Search error:', error);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
                setIsSearching(false);
            }
        };

        const timeoutId = setTimeout(search, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, userId]);

    const handleSendRequest = async (nickname: string) => {
        // ... (Logica di invio notifica invariata) ...
        const { data: targetUser } = await supabase.from('users').select('expo_push_token').eq('nickname', nickname).single();

        setLoading(true);
        try {
            await friendService.sendFriendRequest(userId, nickname);

            if (targetUser?.expo_push_token) {
                const senderName = myNickname || "Un nuovo amico";
                await sendFriendRequestNotification(targetUser.expo_push_token, senderName);
            }

            setShowSuccessToast(true);
            
            // Non resettiamo la ricerca, così l'utente vede che ha aggiunto
            setTimeout(() => {
                setShowSuccessToast(false);
                loadData(); // Ricarichiamo per aggiornare stati eventuali
            }, 2000);

        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to send friend request');
        } finally {
            setLoading(false);
        }
    };

    // ... (handleAcceptRequest e handleDeclineRequest invariati) ...
    const handleAcceptRequest = async (requestId: string) => {
        try {
            await friendService.acceptFriendRequest(requestId);
            loadData();
            onRequestsUpdated();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const handleDeclineRequest = async (requestId: string) => {
        try {
            await friendService.declineFriendRequest(requestId);
            loadData();
            onRequestsUpdated();
        } catch (error: any) {
            Alert.alert('Error', error.message);
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
            // Se stiamo cercando, aggiorniamo anche i risultati per mostrare il tasto "+" di nuovo
            if (searchQuery.length >= 2) {
                // Trucco per forzare un refresh visivo: la logica di renderUserItem ricalcolerà lo stato
                setFriends(prev => prev.filter(f => f.id !== deleteConfirmation.id)); 
            }
            setDeleteConfirmation(null);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to remove friend');
        }
    };

    // --- RENDER FUNCTIONS ---

    // Renderizza un utente (sia dalla lista amici che dalla ricerca)
    const renderUserItem = ({ item }: { item: User }) => {
        // Controlliamo se questo utente è già amico
        const isAlreadyFriend = friends.some(f => f.id === item.id);
        
        // Controlliamo se c'è una richiesta pendente (opzionale, ma carino per la UX)
        // const isPending = ... (richiederebbe di scaricare le richieste inviate)

        return (
            <View style={styles.listItem}>
                <View style={styles.listItemLeft}>
                    <UserIcon size={24} color={theme.colors.text} style={{ marginRight: theme.spacing.sm }} />
                    <Text style={styles.listItemText}>{item.nickname}</Text>
                </View>

                {isAlreadyFriend ? (
                    <TouchableOpacity
                        style={styles.actionButtonSecondary}
                        onPress={() => handleRemoveClick(item.id, item.nickname)}
                    >
                        <UserMinus size={18} color={theme.colors.danger} />
                        <Text style={[styles.actionButtonText, { color: theme.colors.danger }]}>Remove</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.actionButtonPrimary}
                        onPress={() => handleSendRequest(item.nickname)}
                    >
                        <Plus size={18} color={theme.colors.background} />
                        <Text style={[styles.actionButtonText, { color: theme.colors.background }]}>Add</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    // Render Requests (Invariato)
    const renderRequest = ({ item }: { item: FriendshipWithUser }) => {
        const requestUser = Array.isArray(item.users) ? item.users[0] : item.users;
        if (!requestUser) return null;

        return (
            <View style={styles.listItem}>
                <View style={styles.listItemLeft}>
                    <UserIcon size={24} color={theme.colors.text} style={{ marginRight: theme.spacing.sm }} />
                    <Text style={styles.listItemText}>{requestUser.nickname || "Senza Nome"}</Text>
                </View>
                <View style={styles.requestButtons}>
                    <TouchableOpacity style={styles.acceptButton} onPress={() => handleAcceptRequest(item.id)}>
                        <Text style={styles.acceptButtonText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.declineButton} onPress={() => handleDeclineRequest(item.id)}>
                        <Text style={styles.declineButtonText}>Decline</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // Determina quali dati mostrare nella lista principale
    const listData = searchQuery.length >= 2 ? searchResults : friends;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
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

                    {/* CONTENT AREA */}
                    <View style={styles.contentContainer}>
                        
                        {/* Se siamo nel tab FRIENDS, mostriamo la Search Bar fissa */}
                        {tab === 'friends' && (
                            <View style={styles.searchBarContainer}>
                                <Search size={20} color={theme.colors.textTertiary} style={styles.searchIcon} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search friends or add new..."
                                    placeholderTextColor={theme.colors.textTertiary}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    autoCapitalize="none"
                                />
                                {loading && <ActivityIndicator size="small" color={theme.colors.primary} style={{marginLeft: 8}}/>}
                            </View>
                        )}

                        {/* LISTA DINAMICA */}
                        {tab === 'friends' ? (
                            <FlatList
                                data={listData}
                                renderItem={renderUserItem}
                                keyExtractor={(item) => item.id}
                                style={styles.flatList}
                                contentContainerStyle={{ paddingBottom: 20 }}
                                ListEmptyComponent={
                                    <View style={styles.emptyState}>
                                        {searchQuery.length >= 2 ? (
                                            <>
                                                <UserIcon size={50} color={theme.colors.textTertiary} style={{marginBottom: 10}} />
                                                <Text style={styles.emptyText}>No users found.</Text>
                                            </>
                                        ) : (
                                            <>
                                                <Users size={60} color={theme.colors.textTertiary} style={styles.emptyIcon} />
                                                <Text style={styles.emptyText}>
                                                    {friends.length === 0 ? "You have no friends yet." : "Search to find more friends!"}
                                                </Text>
                                            </>
                                        )}
                                    </View>
                                }
                            />
                        ) : (
                            /* REQUESTS LIST */
                            <FlatList
                                data={requests}
                                renderItem={renderRequest}
                                keyExtractor={(item) => item.id}
                                style={styles.flatList}
                                contentContainerStyle={{ paddingBottom: 20 }}
                                ListEmptyComponent={
                                    <View style={styles.emptyState}>
                                        <Mail size={60} color={theme.colors.textTertiary} style={styles.emptyIcon} />
                                        <Text style={styles.emptyText}>No pending requests</Text>
                                    </View>
                                }
                            />
                        )}
                    </View>
                </View>

                {/* Success Toast */}
                {showSuccessToast && (
                    <View style={styles.toast}>
                        <CheckCircle size={24} color={theme.colors.success} />
                        <Text style={styles.toastText}>Friend Request Sent!</Text>
                    </View>
                )}
            </View>

            {/* Confirmation Modal */}
            <ConfirmationModal
                visible={!!deleteConfirmation}
                title="Remove Friend"
                message={`Are you sure you want to remove ${deleteConfirmation?.nickname}?`}
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
        height: '60%',
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.xl,
        overflow: 'hidden',
        display: 'flex', 
        flexDirection: 'column',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,   // Meno spazio sopra e sotto (riduce altezza)
        paddingHorizontal: theme.spacing.lg, // Mantiene lo spazio ai lati
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
    contentContainer: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    // Nuova Search Bar
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        marginHorizontal: theme.spacing.md,
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        height: 44,
    },
    searchIcon: {
        marginRight: theme.spacing.sm,
    },
    searchInput: {
        flex: 1,
        color: theme.colors.text,
        fontSize: theme.fontSize.md,
        height: '100%',
    },
    // Styles Lista Unificata
    flatList: {
        flex: 1,
        width: '100%',
    },
    listItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        minHeight: 48,
    },
    listItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    listItemText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        fontWeight: theme.fontWeight.medium,
    },
    // Buttons
    actionButtonPrimary: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: theme.borderRadius.md,
        gap: 4,
    },
    actionButtonSecondary: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.danger,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: theme.borderRadius.md,
        gap: 4,
    },
    actionButtonText: {
        fontSize: theme.fontSize.sm,
        fontWeight: 'bold',
    },
    // Requests Buttons (Vecchi stili mantenuti)
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
        color: '#FFFFFF',
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
        color: '#FFFFFF',
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.bold,
    },
    // Empty State
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.xxl * 2,
    },
    emptyIcon: {
        marginBottom: theme.spacing.md,
    },
    emptyText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    // Toast
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
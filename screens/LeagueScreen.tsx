import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    TextInput,
    Modal,
    Alert,
    ActivityIndicator,
    RefreshControl,
    Platform, 
    KeyboardAvoidingView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../styles/theme';
import { leagueService, League, LeagueMemberStats } from '../services/leagueService';
import { Trophy, Plus, Users, Crown, ChevronRight, Search, Copy, UserPlus, X, UserCheck, LogOut } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

// 1. IMPORTA IL WRAPPER
import { ScreenContainer } from '../components/ScreenContainer';
import { supabase } from '../services/supabase';
import { sendFriendRequestNotification } from '../services/notificationService';
import { friendService } from '../services/friendService';

interface LeagueScreenProps {
    userId: string;
}

export default function LeagueScreen({ userId }: LeagueScreenProps) {
    const [leagues, setLeagues] = useState<League[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modals state
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [joinModalVisible, setJoinModalVisible] = useState(false);
    const [activeLeague, setActiveLeague] = useState<League | null>(null);
    
    // Form state
    const [newLeagueName, setNewLeagueName] = useState('');
    const [joinCode, setJoinCode] = useState('');

    // Leaderboard state
    const [leaderboard, setLeaderboard] = useState<LeagueMemberStats[]>([]);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

    // Stati per il Popup Utente
    const [userModalVisible, setUserModalVisible] = useState(false);
    const [selectedMember, setSelectedMember] = useState<LeagueMemberStats | null>(null);
    const [sendingRequest, setSendingRequest] = useState(false);
    const [myNickname, setMyNickname] = useState('');
    const [myFriendIds, setMyFriendIds] = useState<string[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Eseguiamo tutte le chiamate in parallelo: molto più veloce
            const [leaguesData, friendsData, myProfileData] = await Promise.all([
                leagueService.getMyLeagues(userId),       // 1. Le tue leghe
                friendService.getFriends(userId),         // 2. I tuoi amici (per vedere se sei già amico)
                supabase.from('users').select('nickname').eq('id', userId).single() // 3. Il tuo nickname (per le notifiche)
            ]);

            // Aggiorniamo gli stati
            setLeagues(leaguesData);
            setMyFriendIds(friendsData.map(f => f.id)); // Salviamo solo gli ID per controllo rapido
            
            if (myProfileData.data) {
                setMyNickname(myProfileData.data.nickname);
            }

        } catch (error) {
            console.error(error);
        } finally {
            // Spegniamo tutti i caricamenti
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleCreateLeague = async () => {
        if (!newLeagueName.trim()) return;
        try {
            await leagueService.createLeague(newLeagueName, '', userId);
            setCreateModalVisible(false);
            setNewLeagueName('');
            loadData();
            Alert.alert('Success', 'League created successfully!');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const handleJoinLeague = async () => {
        if (!joinCode.trim()) return;
        try {
            await leagueService.joinLeagueByCode(joinCode.trim(), userId);
            setJoinModalVisible(false);
            setJoinCode('');
            loadData();
            Alert.alert('Success', 'You joined the league!');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const openLeaderboard = async (league: League) => {
        setActiveLeague(league);
        setLoadingLeaderboard(true);
        try {
            const stats = await leagueService.getLeagueLeaderboard(league.id);
            setLeaderboard(stats);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingLeaderboard(false);
        }
    };

    const copyToClipboard = async (code: string) => {
        await Clipboard.setStringAsync(code);
        Alert.alert('Copied', `League code ${code} copied to clipboard!`);
    };

    const renderLeagueItem = ({ item }: { item: League }) => (
        <TouchableOpacity 
            style={styles.leagueCard}
            onPress={() => openLeaderboard(item)}
        >
            <View style={styles.leagueIcon}>
                <Trophy color={theme.colors.primary} size={24} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.leagueName}>{item.name}</Text>
                <Text style={styles.leagueCode}>Code: {item.code}</Text>
            </View>
            <ChevronRight color={theme.colors.textSecondary} size={24} />
        </TouchableOpacity>
    );

    const renderLeaderboardItem = ({ item, index }: { item: LeagueMemberStats, index: number }) => {
        let rankIcon;
        if (index === 0) rankIcon = <Text style={{fontSize: 24}}>🥇</Text>;
        else if (index === 1) rankIcon = <Text style={{fontSize: 24}}>🥈</Text>;
        else if (index === 2) rankIcon = <Text style={{fontSize: 24}}>🥉</Text>;
        else rankIcon = <Text style={styles.rankText}>#{index + 1}</Text>;

        const isMe = item.userId === userId;

        return (
            <TouchableOpacity style={[styles.leaderboardRow, isMe && styles.myRow]}
                onPress={() => onMemberPress(item)}
                disabled={isMe}
                activeOpacity={0.7}
            >
                <View style={styles.rankContainer}>{rankIcon}</View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.memberName, isMe && styles.myName]}>
                        {item.nickname} {isMe ? '(You)' : ''}
                    </Text>
                    <Text style={styles.memberStats}>
                        {item.totalDuration} mins total time
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.scoreText}>{item.totalSessions}</Text>
                    <Text style={styles.scoreLabel}>sessions</Text>
                </View>
            </TouchableOpacity>
        );
    };

    // Apre il popup quando clicchi su un membro
    const onMemberPress = (member: LeagueMemberStats) => {
        console.log("Toccato utente:", member.nickname);
        if (member.userId === userId) return; // Non cliccare su se stessi
        setSelectedMember(member);
        setUserModalVisible(true);
    };

    // Gestisce l'invio della richiesta e della notifica
    const handleSendFriendRequest = async () => {
        if (!selectedMember) return;
        
        setSendingRequest(true);
        try {
            // 1. Invia richiesta al DB
            await friendService.sendFriendRequestById(userId, selectedMember.userId);

            // 2. Cerca il token dell'utente per la notifica push
            const { data: targetUser } = await supabase
                .from('users')
                .select('expo_push_token')
                .eq('id', selectedMember.userId)
                .single();

            // 3. Invia notifica se il token esiste
            if (targetUser?.expo_push_token) {
                const senderName = myNickname || "A new friend";
                await sendFriendRequestNotification(targetUser.expo_push_token, senderName);
            }

            Alert.alert('Success', `Friend request sent to ${selectedMember.nickname}!`);
            setUserModalVisible(false); // Chiudi popup
        } catch (error: any) {
            Alert.alert('Notice', error.message);
        } finally {
            setSendingRequest(false);
        }
    };

    const handleLeaveLeague = async () => {
        if (!activeLeague) return;

        // --- VERSIONE WEB (Computer) ---
        if (Platform.OS === 'web') {
            const confirm = window.confirm(`Are you sure you want to leave "${activeLeague.name}"?`);
            if (confirm) {
                await performLeave(); // Chiama la logica di uscita
            }
            return;
        }

        // --- VERSIONE MOBILE (iPad/Android) ---
        Alert.alert(
            "Leave League",
            `Are you sure you want to leave "${activeLeague.name}"?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Leave",
                    style: "destructive",
                    onPress: performLeave // Chiama la logica di uscita
                }
            ]
        );
    };

    // Funzione separata per evitare di duplicare il codice
    const performLeave = async () => {
        try {
            setLoading(true);
            await leagueService.leaveLeague(activeLeague!.id, userId);
            setActiveLeague(null); // Chiude il modale
            loadData(); // Aggiorna la lista
            
            // Feedback diverso per Web e Mobile
            if (Platform.OS === 'web') {
                window.alert("You have left the league.");
            } else {
                Alert.alert("Left", "You have left the league.");
            }
        } catch (error: any) {
            if (Platform.OS === 'web') {
                window.alert(error.message);
            } else {
                Alert.alert("Error", error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    // Funzione per formattare automaticamente il codice (XXXX-XXXX)
    const handleCodeChange = (text: string) => {
        // 1. Rimuovi tutto ciò che non è alfanumerico e converti in maiuscolo
        let cleaned = text.replace(/[^A-Z0-9]/gi, '').toUpperCase();

        // 2. Limita a 8 caratteri (senza contare il trattino)
        if (cleaned.length > 8) {
            cleaned = cleaned.substring(0, 8);
        }

        // 3. Inserisci il trattino dopo il 4° carattere se necessario
        let formatted = cleaned;
        if (cleaned.length > 4) {
            formatted = cleaned.substring(0, 4) + '-' + cleaned.substring(4);
        }

        setJoinCode(formatted);
    };

    return (
        // 2. USO DEL WRAPPER
        <ScreenContainer>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Leagues 🏆</Text>
                <Text style={styles.headerSubtitle}>Compete with the world</Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
                <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: theme.colors.surface }]}
                    onPress={() => setJoinModalVisible(true)}
                >
                    <Search color={theme.colors.text} size={20} />
                    <Text style={styles.actionButtonText}>Join League</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                    onPress={() => setCreateModalVisible(true)}
                >
                    <Plus color={theme.colors.text} size={20} />
                    <Text style={[styles.actionButtonText, { fontWeight: 'bold' }]}>Create</Text>
                </TouchableOpacity>
            </View>

            {/* League List */}
            {loading ? (
                <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={leagues}
                    renderItem={renderLeagueItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl 
                            refreshing={refreshing} 
                            onRefresh={() => { setRefreshing(true); loadData(); }} 
                            tintColor={theme.colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>You are not in any league yet.</Text>
                            <Text style={styles.emptySubtext}>Create one or join with a code!</Text>
                        </View>
                    }
                />
            )}

            {/* --- MODAL: LEADERBOARD (GENITORE) --- */}
            <Modal visible={!!activeLeague} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalContainer}>
                    {/* Header Classifica */}
                    <View style={styles.modalHeader}>
                        {/* Parte Sinistra: Titolo e Codice */}
                        <View style={{ flex: 1 }}>
                            <Text style={styles.modalTitle} numberOfLines={1}>{activeLeague?.name}</Text>
                            <TouchableOpacity 
                                style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}
                                onPress={() => activeLeague && copyToClipboard(activeLeague.code)}
                            >
                                <Text style={styles.modalSubtitle}>Code: {activeLeague?.code}</Text>
                                <Copy size={14} color={theme.colors.primary} style={{ marginLeft: 6 }}/>
                            </TouchableOpacity>
                        </View>

                        {/* Parte Destra: Bottoni Azione */}
                        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                            {/* Bottone ESCI (Rosso) */}
                            <TouchableOpacity 
                                onPress={handleLeaveLeague} 
                                style={[styles.closeButton, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]} // Sfondo rosso chiaro
                            >
                                <LogOut size={20} color={theme.colors.danger || '#FF3B30'} />
                            </TouchableOpacity>

                            {/* Bottone CHIUDI (X) */}
                            <TouchableOpacity onPress={() => setActiveLeague(null)} style={styles.closeButton}>
                                <X size={20} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Lista Classifica */}
                    {loadingLeaderboard ? (
                        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
                    ) : (
                        <FlatList
                            data={leaderboard}
                            renderItem={renderLeaderboardItem}
                            keyExtractor={item => item.userId}
                            contentContainerStyle={styles.listContent}
                        />
                    )}

                    {/* --- MODAL: USER PROFILE & ADD FRIEND (NIDIFICATO QUI) --- */}
                    <Modal 
                        visible={userModalVisible} 
                        transparent={true}
                        animationType="fade"
                        presentationStyle='overFullScreen'
                        onRequestClose={() => setUserModalVisible(false)}
                        statusBarTranslucent={true}
                    >
                        <View style={styles.dialogOverlay}>
                            <View style={styles.userPopupBox}>
                                {/* Header Popup */}
                                <View style={styles.popupHeader}>
                                    <Text style={styles.popupTitle}>Member Profile</Text>
                                    <TouchableOpacity onPress={() => setUserModalVisible(false)}>
                                        <X color={theme.colors.textSecondary} size={24} />
                                    </TouchableOpacity>
                                </View>

                                {/* Avatar e Info */}
                                <View style={styles.userInfoContainer}>
                                    <View style={styles.avatarPlaceholder}>
                                        <Text style={styles.avatarText}>
                                            {selectedMember?.nickname.substring(0, 2).toUpperCase()}
                                        </Text>
                                    </View>
                                    <Text style={styles.userPopupName}>{selectedMember?.nickname}</Text>
                                    <Text style={styles.userPopupStats}>
                                        {selectedMember?.totalSessions} Sessions • {selectedMember?.totalDuration} Mins
                                    </Text>
                                </View>

                                {/* Bottone Azione */}
                                {(() => {
                                    // Controllo sicuro che restituisce sempre true o false
                                    const isAlreadyFriend = selectedMember 
                                        ? myFriendIds.includes(selectedMember.userId) 
                                        : false;

                                    return (
                                        <TouchableOpacity 
                                            style={[
                                                styles.friendRequestButton, 
                                                isAlreadyFriend && styles.friendRequestButtonDisabled
                                            ]}
                                            onPress={handleSendFriendRequest}
                                            disabled={sendingRequest || isAlreadyFriend}
                                        >
                                            {sendingRequest ? (
                                                <ActivityIndicator color={theme.colors.background} />
                                            ) : isAlreadyFriend ? (
                                                <>
                                                    <UserCheck color={theme.colors.textSecondary} size={20} />
                                                    <Text style={styles.friendRequestButtonTextDisabled}>
                                                        You are friends
                                                    </Text>
                                                </>
                                            ) : (
                                                <>
                                                    <UserPlus color={theme.colors.background} size={20} />
                                                    <Text style={styles.friendRequestButtonText}>
                                                        Send Friend Request
                                                    </Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })()}
                            </View>
                        </View>
                    </Modal>
                    {/* --- FINE MODAL NIDIFICATO --- */}

                </View>
            </Modal>

            {/* --- MODAL: CREATE LEAGUE --- */}
            <Modal visible={createModalVisible} transparent animationType="fade">
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={styles.dialogOverlay}>
                        <View style={styles.dialogBox}>
                            <Text style={styles.dialogTitle}>Create New League</Text>
                            <Text style={styles.dialogSubtitle}>Give your league a cool name!</Text>
                            
                            <TextInput 
                                style={styles.input} 
                                placeholder="Name (e.g. Office Poopers)" 
                                placeholderTextColor={theme.colors.textTertiary}
                                value={newLeagueName}
                                onChangeText={setNewLeagueName}
                                autoCorrect={false}
                            />
                            
                            <View style={styles.dialogButtons}>
                                <TouchableOpacity onPress={() => setCreateModalVisible(false)} style={styles.dialogButtonCancel}>
                                    <Text style={styles.dialogButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleCreateLeague} style={styles.dialogButtonConfirm}>
                                    <Text style={[styles.dialogButtonText, { color: theme.colors.background }]}>Create</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* --- MODAL: JOIN LEAGUE --- */}
            <Modal visible={joinModalVisible} transparent animationType="fade">
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={styles.dialogOverlay}>
                        <View style={styles.dialogBox}>
                            <Text style={styles.dialogTitle}>Join a League</Text>
                            <Text style={styles.dialogSubtitle}>Enter the invite code below.</Text>
                            
                            <TextInput 
                                style={[styles.input, styles.textInputCode]} 
                                placeholder="XXXX-0000" 
                                placeholderTextColor={theme.colors.textTertiary}
                                value={joinCode}
                                onChangeText={handleCodeChange}
                                autoCapitalize="characters"
                                autoCorrect={false}
                                maxLength={9}
                                keyboardType="ascii-capable"
                            />
                            
                            <View style={styles.dialogButtons}>
                                <TouchableOpacity onPress={() => setJoinModalVisible(false)} style={styles.dialogButtonCancel}>
                                    <Text style={styles.dialogButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleJoinLeague} style={styles.dialogButtonConfirm}>
                                    <Text style={[styles.dialogButtonText, { color: theme.colors.background }]}>Join</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    // Ho rimosso 'container' perché ScreenContainer gestisce già padding e background
    
    header: {
        paddingHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    headerSubtitle: {
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
    actionsContainer: {
        flexDirection: 'row',
        paddingHorizontal: theme.spacing.lg,
        gap: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        gap: 8,
    },
    actionButtonText: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: theme.spacing.lg,
        // 3. Padding extra per la Bottom Tab Bar
        paddingBottom: theme.spacing.xxl * 2,
    },
    leagueCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    leagueIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing.md,
    },
    leagueName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    leagueCode: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 8,
    },
    emptySubtext: {
        color: theme.colors.textSecondary,
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    modalSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    closeButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
    },
    // Leaderboard Rows
    leaderboardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    myRow: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginHorizontal: -theme.spacing.lg,
        paddingHorizontal: theme.spacing.lg,
    },
    rankContainer: {
        width: 40,
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    rankText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.textSecondary,
    },
    memberName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    myName: {
        color: theme.colors.primary,
    },
    memberStats: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    scoreText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    scoreLabel: {
        fontSize: 10,
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
    },    
    dialogOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    dialogBox: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.xl,
        borderWidth: 1,
        borderColor: theme.colors.border,
        // Shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    dialogTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    dialogSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.lg,
        textAlign: 'center',
    },
    input: {
        width: '100%',
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.lg,
        paddingVertical: 14,
        paddingHorizontal: theme.spacing.md,
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.xl,
        fontSize: 16,
    },
    textInputCode: {
        textAlign: 'center',
        fontSize: 24,
        fontWeight: 'bold',
        letterSpacing: 4,
        fontVariant: ['tabular-nums'],
        textTransform: 'uppercase',
    },
    dialogButtons: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    dialogButtonCancel: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.lg,
    },
    dialogButtonConfirm: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.lg,
    },
    dialogButtonText: {
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    
    // User Popup Styles
    userPopupBox: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.lg,
        width: '85%',
        maxWidth: 340,
        alignItems: 'center', 
        
        // Ombre per farlo risaltare ("Pop")
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.30,
        shadowRadius: 4.65,
        elevation: 8,
    },
    popupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: theme.spacing.lg,
    },
    popupTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    userInfoContainer: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.1)', // Sfondo leggero
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.md,
        borderWidth: 2,
        borderColor: theme.colors.primary,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    userPopupName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 4,
    },
    userPopupStats: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    friendRequestButton: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        gap: 8,
    },
    friendRequestButtonText: {
        color: theme.colors.background, // Usa colore scuro per contrasto col primary
        fontSize: 16,
        fontWeight: 'bold',
    },
    friendRequestButtonDisabled: {
        backgroundColor: theme.colors.surface, // O un grigio chiaro/scuro a seconda del tema
        borderWidth: 1,
        borderColor: theme.colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        gap: 8,
        opacity: 0.8,
    },
    friendRequestButtonTextDisabled: {
        color: theme.colors.textSecondary,
        fontSize: 16,
        fontWeight: '600',
    },
});
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
    RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../styles/theme';
import { leagueService, League, LeagueMemberStats } from '../services/leagueService';
import { Trophy, Plus, Users, Crown, ChevronRight, Search, Copy } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

// 1. IMPORTA IL WRAPPER
import { ScreenContainer } from '../components/ScreenContainer';

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

    useEffect(() => {
        loadLeagues();
    }, []);

    const loadLeagues = async () => {
        try {
            const data = await leagueService.getMyLeagues(userId);
            setLeagues(data);
        } catch (error) {
            console.error(error);
        } finally {
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
            loadLeagues();
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
            loadLeagues();
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
            <View style={[styles.leaderboardRow, isMe && styles.myRow]}>
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
            </View>
        );
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
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadLeagues(); }} tintColor={theme.colors.primary}/>}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>You are not in any league yet.</Text>
                            <Text style={styles.emptySubtext}>Create one or join with a code!</Text>
                        </View>
                    }
                />
            )}

            {/* --- MODAL: LEADERBOARD --- */}
            <Modal visible={!!activeLeague} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>{activeLeague?.name}</Text>
                            <TouchableOpacity 
                                style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}
                                onPress={() => activeLeague && copyToClipboard(activeLeague.code)}
                            >
                                <Text style={styles.modalSubtitle}>Code: {activeLeague?.code}</Text>
                                <Copy size={14} color={theme.colors.primary} style={{ marginLeft: 6 }}/>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity onPress={() => setActiveLeague(null)} style={styles.closeButton}>
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>

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
                </View>
            </Modal>

            {/* --- MODAL: CREATE LEAGUE --- */}
            <Modal visible={createModalVisible} transparent animationType="fade">
                <View style={styles.dialogOverlay}>
                    <View style={styles.dialogBox}>
                        <Text style={styles.dialogTitle}>Create New League</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="League Name (e.g. Office Poopers)" 
                            placeholderTextColor={theme.colors.textTertiary}
                            value={newLeagueName}
                            onChangeText={setNewLeagueName}
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
            </Modal>

            {/* --- MODAL: JOIN LEAGUE --- */}
            <Modal visible={joinModalVisible} transparent animationType="fade">
                <View style={styles.dialogOverlay}>
                    <View style={styles.dialogBox}>
                        <Text style={styles.dialogTitle}>Join a League</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Enter Code (e.g. PIZZA-1234)" 
                            placeholderTextColor={theme.colors.textTertiary}
                            value={joinCode}
                            onChangeText={setJoinCode}
                            autoCapitalize="characters"
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
        alignItems: 'center',
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
    },
    closeButtonText: {
        color: theme.colors.text,
        fontWeight: '600',
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
    // Dialog Styles
    dialogOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        padding: theme.spacing.xl,
    },
    dialogBox: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.xl,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    dialogTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: theme.spacing.lg,
        textAlign: 'center',
    },
    input: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.lg,
    },
    dialogButtons: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    dialogButtonCancel: {
        flex: 1,
        padding: theme.spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
    },
    dialogButtonConfirm: {
        flex: 1,
        padding: theme.spacing.md,
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.md,
    },
    dialogButtonText: {
        fontWeight: 'bold',
        color: theme.colors.text,
    }
});
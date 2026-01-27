import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    TouchableWithoutFeedback,
    Keyboard,
    Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; // Reintrodotto per i bottoni
import { theme } from '../styles/theme';
import { X } from 'lucide-react-native';
import StarRating from './StarRating';

interface SessionCompletionModalProps {
    visible: boolean;
    duration: number; // in secondi
    startTime: Date;
    onPublish: (message: string, rating: number) => void;
    onDelete: () => void;
    onClose: () => void;
}

export default function SessionCompletionModal({
    visible,
    duration,
    startTime,
    onPublish,
    onDelete,
    onClose
}: SessionCompletionModalProps) {
    const [message, setMessage] = useState('');
    const [rating, setRating] = useState(0); 
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasRated, setHasRated] = useState(false);

    useEffect(() => {
        if (visible) {
            setMessage('');
            setRating(0);
            setHasRated(false);
            setIsSubmitting(false);
        }
    }, [visible]);

    const handlePublish = () => {
        if (!hasRated) {
            Alert.alert(
                "Rate Session", 
                "Please select a rating (even 0) to save the session."
            );
            return
        };         
        setIsSubmitting(true);
        onPublish(message, rating); 
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const content = (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.overlay}
        >
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Session Complete! 💩</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <X size={24} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Stats Summary */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Time</Text>
                        <Text style={styles.statValue}>
                            {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Duration</Text>
                        <Text style={styles.statValue}>{formatDuration(duration)}</Text>
                    </View>
                </View>

                {/* Rating Section (Nuova Logica 2.5/5) */}
                <View style={styles.ratingSection}>
                    <Text style={styles.sectionTitle}>How did it go?</Text>
                    
                    <StarRating 
                        rating={rating}
                        onRatingChange={(newRating) => {
                                setRating(newRating);
                                setHasRated(true); // Segna che l'utente ha interagito
                            }}
                        interactive={true}
                        size={42}
                        color="#FFC107"
                        emptyColor={theme.colors.border}
                    />

                    {/* Voto decimale (es. 2.5 / 5) */}
                    <Text style={styles.ratingText}>
                        {rating > 0 ? (
                            <Text style={styles.ratingValue}>{rating / 2}</Text>
                        ) : (
                            <Text style={styles.ratingValue}>-</Text>
                        )}
                        <Text style={styles.ratingScale}> / 5</Text>
                    </Text>
                </View>

                {/* Note Input */}
                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Add a note (optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Thoughts? Struggles? Victory?"
                        placeholderTextColor={theme.colors.textTertiary}
                        value={message}
                        onChangeText={(text) => setMessage(text.slice(0, 100))}
                        multiline
                        maxLength={100}
                        textAlignVertical="top"
                    />
                    <Text style={styles.charCount}>{message.length}/100</Text>
                </View>

                {/* Actions (VECCHI BOTTONI RIPRISTINATI) */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={onDelete}
                        disabled={isSubmitting}
                    >
                        <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.publishButton}
                        onPress={handlePublish}
                        disabled={isSubmitting}
                    >
                        <LinearGradient
                            colors={[theme.colors.success, theme.colors.successLight]}
                            style={styles.gradient}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.publishButtonText}>Publish</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            {Platform.OS === 'web' ? (
                content
            ) : (
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    {content}
                </TouchableWithoutFeedback>
            )}
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        padding: theme.spacing.lg,
    },
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.xl,
        borderWidth: 1,
        borderColor: theme.colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    closeButton: {
        padding: 4,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.xl,
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    divider: {
        width: 1,
        height: '80%',
        backgroundColor: theme.colors.border,
    },
    ratingSection: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
        fontSize: theme.fontSize.lg,
        color: theme.colors.text,
        fontWeight: '600',
        marginBottom: theme.spacing.md,
    },
    ratingText: {
        marginTop: theme.spacing.md,
        fontSize: 18,
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    ratingValue: {
        fontWeight: 'bold',
        color: theme.colors.primary,
        fontSize: 24,
    },
    ratingScale: {
        color: theme.colors.textSecondary,
        fontSize: 18,
    },
    inputContainer: {
        marginBottom: theme.spacing.xl,
    },
    inputLabel: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
        marginLeft: 4,
    },
    input: {
        backgroundColor: theme.colors.background, // Sfondo scuro input
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        color: theme.colors.text,
        fontSize: theme.fontSize.md,
        height: 100,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    charCount: {
        textAlign: 'right',
        color: theme.colors.textTertiary,
        fontSize: theme.fontSize.xs,
        marginTop: 4,
    },
    
    // --- STILI BOTTONI VECCHI RIPRISTINATI ---
    actionButtons: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    deleteButton: {
        flex: 1,
        paddingVertical: theme.spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)', // Rosso chiaro trasparente
        borderRadius: theme.borderRadius.lg,
    },
    deleteButtonText: {
        color: theme.colors.danger,
        fontWeight: 'bold',
        fontSize: theme.fontSize.md,
    },
    publishButton: {
        flex: 2,
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden', // Importante per il gradiente
    },
    gradient: {
        paddingVertical: theme.spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    publishButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: theme.fontSize.md,
    },
});
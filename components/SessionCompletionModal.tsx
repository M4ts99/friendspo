import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    KeyboardAvoidingView,
} from 'react-native';
import { theme } from '../styles/theme';
import { Plus, Minus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SessionCompletionModalProps {
    visible: boolean;
    duration: number; // in seconds
    startTime: Date;
    onPublish: (message: string, rating: number) => void;
    onDelete: () => void;
}

export default function SessionCompletionModal({
    visible,
    duration,
    startTime,
    onPublish,
    onDelete,
}: SessionCompletionModalProps) {
    const [message, setMessage] = useState('');
    const [rating, setRating] = useState(5);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const content = (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.overlay}
        >
            <View style={styles.dialog}>
                <View style={styles.header}>
                    <Text style={styles.emoji}>🎉</Text>
                    <Text style={styles.title}>Shit Complete!</Text>
                    <Text style={styles.subtitle}>
                        Duration: {formatTime(duration)} • Started: {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>

                {/* Rating Section */}
                <View style={styles.section}>
                    <Text style={styles.label}>How was it? (1-10)</Text>
                    <View style={styles.ratingContainer}>
                        <TouchableOpacity
                            style={styles.ratingButton}
                            onPress={() => setRating(Math.max(1, rating - 1))}
                        >
                            <Minus size={24} color={theme.colors.text} />
                        </TouchableOpacity>

                        <View style={styles.ratingValueContainer}>
                            <Text style={styles.ratingValue}>{rating}</Text>
                            <Text style={styles.ratingScale}>/10</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.ratingButton}
                            onPress={() => setRating(Math.min(10, rating + 1))}
                        >
                            <Plus size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.ratingBar}>
                        <View style={[styles.ratingFill, { width: `${rating * 10}%` }]} />
                    </View>
                </View>

                {/* Message Section */}
                <View style={styles.section}>
                    <Text style={styles.label}>Add a note (optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Thoughts? Struggles? Victory?"
                        placeholderTextColor={theme.colors.textTertiary}
                        value={message}
                        onChangeText={(text) => setMessage(text.slice(0, 100))}
                        multiline
                        maxLength={100}
                    />
                    <Text style={styles.charCount}>{message.length}/100</Text>
                </View>

                {/* Actions */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={onDelete}
                    >
                        <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.publishButton}
                        onPress={() => onPublish(message, rating)}
                    >
                        <LinearGradient
                            colors={[theme.colors.success, theme.colors.successLight]}
                            style={styles.gradient}
                        >
                            <Text style={styles.publishButtonText}>Publish</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onDelete}
        >
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
    dialog: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.xl,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.lg,
    },
    header: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    emoji: {
        fontSize: 48,
        marginBottom: theme.spacing.sm,
    },
    title: {
        fontSize: theme.fontSize.xxl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    subtitle: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    section: {
        marginBottom: theme.spacing.xl,
    },
    label: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.md,
    },
    ratingButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ratingButtonText: {
        fontSize: 24,
        color: theme.colors.text,
        fontWeight: 'bold',
        lineHeight: 28,
    },
    ratingValueContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginHorizontal: theme.spacing.xl,
        width: 80,
        justifyContent: 'center',
    },
    ratingValue: {
        fontSize: 48,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    ratingScale: {
        fontSize: theme.fontSize.lg,
        color: theme.colors.textTertiary,
        marginLeft: 4,
    },
    ratingBar: {
        height: 6,
        backgroundColor: theme.colors.surfaceLight,
        borderRadius: 3,
        overflow: 'hidden',
    },
    ratingFill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
    },
    input: {
        backgroundColor: theme.colors.surfaceLight,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        color: theme.colors.text,
        height: 80,
        textAlignVertical: 'top',
        fontSize: theme.fontSize.md,
    },
    charCount: {
        textAlign: 'right',
        color: theme.colors.textTertiary,
        fontSize: theme.fontSize.xs,
        marginTop: 4,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    deleteButton: {
        flex: 1,
        paddingVertical: theme.spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
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
        overflow: 'hidden',
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

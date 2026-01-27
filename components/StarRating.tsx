import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Star, StarHalf } from 'lucide-react-native';
import { theme } from '../styles/theme';

interface StarRatingProps {
    rating: number; // 0-10 (dove 10 = 5 stelle piene)
    onRatingChange?: (rating: number) => void;
    size?: number;
    interactive?: boolean;
    color?: string;
    emptyColor?: string;
}

export default function StarRating({
    rating,
    onRatingChange,
    size = 32, // Aumentato leggermente il default per facilitare il tocco
    interactive = false,
    color = "#FFD700", // Colore Oro di default (o usa theme.colors.primary)
    emptyColor = theme.colors.textTertiary, // Colore per i contorni vuoti
}: StarRatingProps) {
    const stars = [1, 2, 3, 4, 5];

    const handlePress = (starIndex: number) => {
        if (!onRatingChange || !interactive) return;

        const starValueFull = starIndex * 2;     // Es. Stella 3 vale 6
        const starValueHalf = starValueFull - 1; // Es. Stella 3 vale 5 (mezza)

        // Logica Toggle:
        // 1. Se clicco su una stella già piena -> diventa mezza
        // 2. Se clicco su una stella mezza -> diventa piena
        // 3. Altrimenti -> diventa piena (comportamento standard)
        
        if (rating === starValueFull) {
            onRatingChange(starValueHalf);
        } else if (rating === starValueHalf) {
            onRatingChange(starValueFull);
        } else {
            onRatingChange(starValueFull);
        }
    };

    return (
        <View style={styles.container}>
            {stars.map((starIndex) => {
                const value = starIndex * 2;
                const isFull = rating >= value;
                const isHalf = rating === value - 1;

                return (
                    <TouchableOpacity
                        key={starIndex}
                        onPress={() => handlePress(starIndex)}
                        activeOpacity={interactive ? 0.5 : 1}
                        disabled={!interactive}
                        style={styles.starContainer}
                        // hitSlop aumenta l'area cliccabile senza ingrandire l'icona
                        hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
                    >
                        <View>
                            {/* LOGICA DI RENDERIZZAZIONE MIGLIORATA */}
                            
                            {/* CASO 1: Stella Piena */}
                            {isFull ? (
                                <Star
                                    size={size}
                                    color={color}
                                    fill={color} // Riempimento pieno
                                    strokeWidth={0} // Nessun contorno
                                />
                            ) : isHalf ? (
                                /* CASO 2: Mezza Stella */
                                <View style={{ width: size, height: size }}>
                                    {/* Sfondo: Stella vuota (outline) */}
                                    <Star
                                        size={size}
                                        color={emptyColor}
                                        strokeWidth={2}
                                        style={StyleSheet.absoluteFill} // Posizionamento perfetto
                                    />
                                    {/* Primo piano: Mezza stella piena */}
                                    <StarHalf
                                        size={size}
                                        color={color}
                                        fill={color}
                                        strokeWidth={0}
                                        style={StyleSheet.absoluteFill} // Sovrapposizione perfetta
                                    />
                                </View>
                            ) : (
                                /* CASO 3: Stella Vuota */
                                <Star
                                    size={size}
                                    color={emptyColor} // Colore del bordo
                                    fill="transparent" // Nessun riempimento
                                    strokeWidth={2} // Spessore bordo
                                />
                            )}
                        </View>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center', // Centra le stelle
        gap: 8, // Spazio tra le stelle
    },
    starContainer: {
        padding: 2,
    },
});
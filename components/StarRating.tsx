import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Star, StarHalf } from 'lucide-react-native';
import { theme } from '../styles/theme';

interface StarRatingProps {
    rating: number; // 0-10
    onRatingChange?: (rating: number) => void;
    size?: number;
    interactive?: boolean;
    color?: string;
}

export default function StarRating({
    rating,
    onRatingChange,
    size = 24,
    interactive = false,
    color = theme.colors.primary,
}: StarRatingProps) {
    const stars = [1, 2, 3, 4, 5];

    const handlePress = (starIndex: number) => {
        if (!onRatingChange || !interactive) return;

        const starValueFull = starIndex * 2;
        const starValueHalf = starValueFull - 1;

        // If clicking on the current "highest" star
        if (rating === starValueFull) {
            // If full, toggle to half
            onRatingChange(starValueHalf);
        } else if (rating === starValueHalf) {
            // If half, toggle to full
            onRatingChange(starValueFull);
        } else {
            // Otherwise set to full
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
                        activeOpacity={interactive ? 0.7 : 1}
                        disabled={!interactive}
                        style={styles.starContainer}
                    >
                        {isFull ? (
                            <Star
                                size={size}
                                color={color}
                                fill={color}
                                strokeWidth={0}
                            />
                        ) : isHalf ? (
                            <View style={{ position: 'relative' }}>
                                {/* Background empty star for outline consistency */}
                                <Star
                                    size={size}
                                    color={theme.colors.surfaceLight}
                                    fill={theme.colors.surfaceLight}
                                    strokeWidth={0}
                                    style={{ position: 'absolute' }}
                                />
                                <StarHalf
                                    size={size}
                                    color={color}
                                    fill={color}
                                    strokeWidth={0}
                                />
                            </View>

                        ) : (
                            <Star
                                size={size}
                                color={theme.colors.surfaceLight} // Inactive color
                                fill={theme.colors.surfaceLight}
                                strokeWidth={0}
                            />
                        )}
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
        gap: 4,
    },
    starContainer: {
        padding: 2,
    },
});

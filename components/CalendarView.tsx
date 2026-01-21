import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { theme } from '../styles/theme';
import { statsService, Stats, CalendarDay } from '../services/statsService';

interface CalendarViewProps {
    userId: string;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CALENDAR_PADDING = theme.spacing.lg * 2;
const DAY_SIZE = (SCREEN_WIDTH - CALENDAR_PADDING - 6 * theme.spacing.xs) / 7;

export default function CalendarView({ userId }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCalendarData();
    }, [userId, currentDate]);

    const loadCalendarData = async () => {
        try {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const data = await statsService.getCalendarData(userId, year, month);
            setCalendarData(data);
        } catch (error) {
            console.error('Error loading calendar data:', error);
        } finally {
            setLoading(false);
        }
    };

    const goToPreviousMonth = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(currentDate.getMonth() - 1);
        setCurrentDate(newDate);
    };

    const goToNextMonth = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(currentDate.getMonth() + 1);
        setCurrentDate(newDate);
    };

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const getFirstDayOfMonth = () => {
        return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    };

    const renderCalendar = () => {
        const firstDay = getFirstDayOfMonth();
        const emptyDays = Array(firstDay).fill(null);
        const allDays = [...emptyDays, ...calendarData];

        return (
            <View style={styles.calendarGrid}>
                {dayNames.map((day) => (
                    <View key={day} style={[styles.dayCell, styles.dayHeader]}>
                        <Text style={styles.dayHeaderText}>{day}</Text>
                    </View>
                ))}

                {allDays.map((day, index) => {
                    if (!day) {
                        return <View key={`empty-${index}`} style={styles.dayCell} />;
                    }

                    const today = new Date().toISOString().split('T')[0];
                    const isToday = day.date === today;

                    return (
                        <View
                            key={day.date}
                            style={[
                                styles.dayCell,
                                day.hasSessions ? styles.dayCellGreen : styles.dayCellRed,
                                isToday && styles.dayCellToday,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.dayText,
                                    day.hasSessions ? styles.dayTextGreen : styles.dayTextRed,
                                ]}
                            >
                                {new Date(day.date).getDate()}
                            </Text>
                            {day.sessionCount > 1 && (
                                <Text style={styles.sessionCountText}>
                                    {day.sessionCount}
                                </Text>
                            )}
                        </View>
                    );
                })}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
                    <Text style={styles.navButtonText}>←</Text>
                </TouchableOpacity>

                <Text style={styles.monthText}>
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </Text>

                <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
                    <Text style={styles.navButtonText}>→</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <Text style={styles.loadingText}>Loading...</Text>
            ) : (
                renderCalendar()
            )}

            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendBox, styles.legendBoxGreen]} />
                    <Text style={styles.legendText}>Had sessions</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendBox, styles.legendBoxRed]} />
                    <Text style={styles.legendText}>No sessions</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: theme.spacing.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    navButton: {
        padding: theme.spacing.sm,
    },
    navButtonText: {
        fontSize: theme.fontSize.xxl,
        color: theme.colors.primary,
        fontWeight: theme.fontWeight.bold,
    },
    monthText: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.xs,
    },
    dayCell: {
        width: DAY_SIZE,
        height: DAY_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: theme.borderRadius.sm,
    },
    dayHeader: {
        backgroundColor: 'transparent',
        marginBottom: theme.spacing.xs,
    },
    dayHeaderText: {
        fontSize: theme.fontSize.xs,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.textSecondary,
    },
    dayCellGreen: {
        backgroundColor: theme.colors.calendarGreen,
    },
    dayCellRed: {
        backgroundColor: theme.colors.calendarRed,
        opacity: 0.3,
    },
    dayCellToday: {
        borderWidth: 2,
        borderColor: theme.colors.primary,
    },
    dayText: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
    },
    dayTextGreen: {
        color: theme.colors.text,
    },
    dayTextRed: {
        color: theme.colors.textSecondary,
    },
    sessionCountText: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.text,
        marginTop: 2,
        fontWeight: theme.fontWeight.bold,
    },
    loadingText: {
        textAlign: 'center',
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xl,
    },
    legend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: theme.spacing.lg,
        marginTop: theme.spacing.lg,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    legendBox: {
        width: 16,
        height: 16,
        borderRadius: theme.borderRadius.sm,
    },
    legendBoxGreen: {
        backgroundColor: theme.colors.calendarGreen,
    },
    legendBoxRed: {
        backgroundColor: theme.colors.calendarRed,
        opacity: 0.3,
    },
    legendText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
});

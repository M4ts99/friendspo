export const theme = {
  colors: {
    primary: '#8B5CF6', // Vibrant purple
    primaryDark: '#7C3AED',
    primaryLight: '#A78BFA',

    secondary: '#06B6D4', // Cyan
    secondaryDark: '#0891B2',

    success: '#10B981', // Green
    successLight: '#34D399',

    danger: '#EF4444', // Red
    dangerLight: '#F87171',

    warning: '#F59E0B',

    background: '#0F172A', // Dark navy
    backgroundLight: '#1E293B',
    backgroundLighter: '#334155',

    surface: '#1E293B',
    surfaceLight: '#334155',

    text: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textTertiary: '#94A3B8',

    border: '#334155',
    borderLight: '#475569',

    // Calendar colors
    calendarGreen: '#10B981',
    calendarRed: '#EF4444',
    calendarEmpty: '#334155',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },

  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },

  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
  },

  animations: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
};

export type Theme = typeof theme;

import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';

// 1. Definiamo l'interfaccia per dire a TS cosa aspettarsi
interface ScreenContainerProps {
  children: React.ReactNode;       // Accetta qualsiasi elemento React (View, Text, etc.)
  style?: StyleProp<ViewStyle>;    // Accetta stili validi per una View (opzionale)
}

// 2. Assegniamo il tipo alle props del componente
export const ScreenContainer = ({ children, style }: ScreenContainerProps) => {
  return (
    <SafeAreaView 
      style={[styles.safeArea, style]} 
      edges={['top']} 
    >
      <View style={styles.content}>
        {children}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background, 
  },
  content: {
    flex: 1,
  }
});
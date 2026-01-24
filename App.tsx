import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text as RNText, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { theme } from './styles/theme';
import { authService } from './services/authService';

// Screens
import WelcomeScreen from './screens/WelcomeScreen';
import HomeScreen from './screens/HomeScreen';
import StatsScreen from './screens/StatsScreen';
import FeedScreen from './screens/FeedScreen';
import SettingsScreen from './screens/SettingsScreen';
import { Home, BarChart2, Activity, Settings } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './services/supabase';
import { enableScreens } from 'react-native-screens';

const Tab = createBottomTabNavigator();

// Enable native screens for better performance
enableScreens(false);

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [initialStep, setInitialStep] = useState<'nickname' | 'optional' | 'privacy' | 'reset_password'>('nickname');

  useEffect(() => {
    const initializeApp = async () => {
      console.log('1. Inizializzazione App...');

      // Test Storage (opzionale, come da tuo codice)
      try {
        await AsyncStorage.setItem('test_key', 'funziona!');
      } catch (e) {
        console.error('Critical storage error', e);
      }

      // --- CONTROLLO URL RECUPERO (Specifico per Web) ---
      // Lo facciamo SUBITO, prima di controllare l'auth standard
      if (Platform.OS === 'web') {
        const hash = window.location.hash;
        // Se c'è un hash che indica recupero password...
        if (hash && (hash.includes('type=recovery') || hash.includes('access_token'))) {
          console.log("2. URL di Recovery rilevato all'avvio!");

          // Impostiamo lo stato di reset
          setIsResettingPassword(true);
          setInitialStep('reset_password');

          // Importante: togliamo il caricamento ma NON carichiamo l'utente
          // così rimaniamo sulla WelcomeScreen
          setIsLoading(false);
          return; // STOP: Non eseguire checkAuth()
        }
      }

      // Se non siamo in recovery, controlla l'utente normalmente
      await checkAuth();
    };

    initializeApp();

    // --- ASCOLTATORE EVENTI AUTH ---
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("3. Evento Auth:", event);

      if (event === 'PASSWORD_RECOVERY') {
        // Evento specifico di recupero
        console.log('Recovery mode attivata via Evento.');
        setIsResettingPassword(true);
        setInitialStep('reset_password');
        setIsLoading(false);

      } else if (event === 'SIGNED_IN') {
        // QUI È IL PUNTO CRITICO:
        // Se l'utente clicca sul link della mail, Supabase fa il login automatico (SIGNED_IN).
        // Ma noi dobbiamo BLOCCARE il reindirizzamento alla Home se stiamo resettando la password.

        // Controllo 1: Se lo stato locale dice che stiamo resettando
        if (isResettingPassword || initialStep === 'reset_password') {
          console.log('BLOCCO NAVIGAZIONE: Utente loggato ma in fase di reset password.');
          return; // Esce dalla funzione, non imposta l'user, quindi resta su WelcomeScreen
        }

        // Controllo 2 (Sicurezza per Web): Se l'URL dice ancora recovery
        if (Platform.OS === 'web' && window.location.hash.includes('type=recovery')) {
          console.log('BLOCCO NAVIGAZIONE: Hash URL ancora presente.');
          setIsResettingPassword(true);
          setInitialStep('reset_password');
          return;
        }

        // Se non stiamo resettando, allora è un login normale -> Carica l'utente e vai alla Home
        console.log('Login standard rilevato.');
        setInitialStep('nickname');
        await checkAuth();

      } else if (event === 'SIGNED_OUT') {
        // Logout avvenuto (es. dopo aver cambiato password con successo)
        setUser(null);
        setIsResettingPassword(false);
        setInitialStep('nickname');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isResettingPassword, initialStep]); // Le dipendenze sono importanti qui

  const checkStorage = async () => {
    const allKeys = await AsyncStorage.getAllKeys();
    console.log('Keys presented in storage:', allKeys);
  };

  const checkAuth = async () => {
    try {
      console.log('App: Checking auth...');

      // check if session exists
      const { data: { session } } = await supabase.auth.getSession();
      console.log('App: Does technical session exist?', !!session);

      const currentUser = await authService.getCurrentUser();

      // ORPHANED SESSION DETECTION
      // If we have a Supabase session but no user in the database, it might be:
      // 1. An orphaned session from old placeholder emails (needs cleanup)
      // 2. A fresh sign up that hasn't written to DB yet (needs time)
      if (session && !currentUser) {
        console.warn('⚠️ [APP] Session exists but no user record found.');
        console.log('🔧 [APP] Waiting for fresh sign ups to complete (checking 5 times over 10 seconds)...');

        // Try 5 times with 2 second delays (total 10 seconds)
        // This gives the sign up process plenty of time to complete
        let currentUserAfterDelay = null;
        for (let attempt = 1; attempt <= 5; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          console.log(`🔧 [APP] Attempt ${attempt}/5: Checking for user...`);
          currentUserAfterDelay = await authService.getCurrentUser();

          if (currentUserAfterDelay) {
            console.log(`✅ [APP] Fresh sign up detected on attempt ${attempt}, user created:`, currentUserAfterDelay.id);
            setUser(currentUserAfterDelay);
            setIsLoading(false);
            return;
          }
        }

        // Still no user after 5 attempts (10 seconds) - this is truly an orphaned session
        console.warn('⚠️ [APP] Confirmed orphaned session after 5 attempts! Cleaning up...');

        try {
          await supabase.auth.signOut();
          await AsyncStorage.clear();
          console.log('✅ [APP] Orphaned session cleaned up successfully');
        } catch (cleanupError) {
          console.error('❌ [APP] Failed to clean up orphaned session:', cleanupError);
        }

        setUser(null);
        setIsLoading(false);
        return;
      }

      if (currentUser) {
        console.log('App: User loaded with success:', currentUser.id);
        setUser(currentUser);
      } else {
        console.log('App: No user found');
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthComplete = async () => {
    console.log('App: Authentication complete, checking auth state...');
    //setIsResettingPassword(false);
    setIsLoading(true);
    setTimeout(async () => await checkAuth(), 1000);
  };

  const handleLogout = async () => {
    try {
      console.log('App: Logging out...');
      await authService.signOut();
      console.log('App: Sign out complete');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      console.log('App: Clearing user state');
      setUser(null);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!user || isResettingPassword || initialStep === 'reset_password') {
    return (
      <>
        <StatusBar style="light" />
        <WelcomeScreen
          onComplete={() => {
            setIsResettingPassword(false);
            handleAuthComplete();
          }}
          initialStep={initialStep as any} />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: styles.tabBar,
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: theme.colors.textTertiary,
            tabBarLabelStyle: styles.tabBarLabel,
          }}
        >


          <Tab.Screen
            name="Home"
            options={{
              tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
            }}
          >
            {() => <HomeScreen userId={user.id} />}
          </Tab.Screen>

          <Tab.Screen
            name="Stats"
            options={{
              tabBarIcon: ({ color, size }) => <BarChart2 color={color} size={size} />,
            }}
          >
            {() => <StatsScreen userId={user.id} />}
          </Tab.Screen>

          <Tab.Screen
            name="Feed"
            options={{
              tabBarIcon: ({ color, size }) => <Activity color={color} size={size} />,
            }}
          >
            {() => <FeedScreen userId={user.id} />}
          </Tab.Screen>

          <Tab.Screen
            name="Settings"
            options={{
              tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
            }}
          >
            {() => (
              <SettingsScreen
                userId={user.id}
                nickname={user.nickname}
                onLogout={handleLogout}
              />
            )}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  tabBar: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
    height: Platform.OS === 'ios' ? 90 : 70,
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
  },
  tabBarLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
  },
  tabIcon: {
    fontSize: 24,
  },
});

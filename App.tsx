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
import LeagueScreen from './screens/LeagueScreen';
import SettingsScreen from './screens/SettingsScreen';
import { Home, BarChart2, Activity, Settings, Trophy } from 'lucide-react-native';
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

  const handleUserUpdate = (updatedFields: any) => {
    console.log('🔄 [APP] Updating global user state:', updatedFields);
    setUser((prevUser: any) => {
      if (!prevUser) return null;
      return { ...prevUser, ...updatedFields };
    });
  };

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
             console.log('Utente loggato tramite link di recupero. Rimango su WelcomeScreen.');
             // Importante: aggiorniamo lo user nello stato locale per permettere l'updateUser
             if (session?.user) {
                 setUser(session.user); 
             }
             setIsLoading(false);
             return; 
        }

        // Controllo 2 (Sicurezza per Web): Se l'URL dice ancora recovery
        if (Platform.OS === 'web' && window.location.hash.includes('type=recovery')) {
          console.log('BLOCCO NAVIGAZIONE: Hash URL ancora presente.');
          setIsResettingPassword(true);
          setInitialStep('reset_password');
          if (session?.user) 
            setUser(session.user);
          setIsLoading(false);
          return;
        }

        // Se non stiamo resettando, allora è un login normale -> Carica l'utente e vai alla Home
        console.log('Login standard rilevato.');
        //setInitialStep('nickname');
        if (session?.user) {
            console.log('⚡️ [APP] Passaggio utente diretto a getCurrentUser (Fast Path)');
            try {
                // Passiamo session.user come parametro! 
                // Questo evita che getCurrentUser chiami di nuovo getUser()
                const currentUser = await authService.getCurrentUser(session.user);
                setUser(currentUser);
            } catch (e) {
                console.error("Errore caricamento profilo:", e);
            }
        } else {
            // Fallback al metodo classico se per caso session è null
            await checkAuth(); 
        }

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
  }, []); 

  const checkStorage = async () => {
    const allKeys = await AsyncStorage.getAllKeys();
    console.log('Keys presented in storage:', allKeys);
  };

  const checkAuth = async () => {
    try {
      console.log('App: Checking auth...');

      // check if session exists with timeout
      console.log('🔍 [APP] Calling supabase.auth.getSession()...');

      let session = null;
      try {
        // Add timeout to prevent infinite hanging
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('getSession timeout')), 5000)
        );

        const result = await Promise.race([sessionPromise, timeoutPromise]) as any;
        session = result.data?.session;
        console.log('🔍 [APP] getSession() completed');
      } catch (error) {
        console.warn('⚠️ [APP] getSession() failed or timed out:', error);
        // Continue anyway - getCurrentUser will handle auth check
      }

      console.log('App: Does technical session exist?', !!session);

      console.log('🔍 [APP] Calling authService.getCurrentUser()...');
      const currentUser = await authService.getCurrentUser();
      console.log('🔍 [APP] getCurrentUser() completed');

      // NOTE: Orphaned session cleanup has been removed from here
      // It was causing race conditions with the sign up process
      // The sign up process creates the Supabase Auth user first (triggers SIGNED_IN event)
      // Then creates the users table entry (takes time)
      // The cleanup would delete the session before the users table entry was created
      // 
      // Orphaned sessions from old placeholder emails are rare and will be cleaned up
      // when users try to log in (they'll get an error and can create a new account)

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
            name="Leagues"
            options={{
              tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} />,
            }}
          >
            {() => <LeagueScreen userId={user.id} />}
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
                onUserUpdate={handleUserUpdate}
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

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

  useEffect(() => {
    const testStorage = async () => {
      try {
        await AsyncStorage.setItem('test_key', 'funziona!');
        const val = await AsyncStorage.getItem('test_key');
        console.log('Test Storage Locale:', val);
      } catch (e) {
        console.error('Critical error: phone can\'t write to storage', e);
      }
    };

    testStorage();
    checkAuth();
  }, []);

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

  if (!user) {
    return (
      <>
        <StatusBar style="light" />
        <WelcomeScreen onComplete={handleAuthComplete} />
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

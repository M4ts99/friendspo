import { useState, useEffect } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../services/supabase'; // Assicurati che il percorso sia giusto

// CORREZIONE 1: Aggiunte le proprietà mancanti (shouldShowBanner, shouldShowList)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, // <--- NUOVO
    shouldShowList: true,   // <--- NUOVO
  }),
});

export function usePushNotifications(userId: string | undefined) {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      setExpoPushToken(token);
      if (token && userId) {
        saveTokenToSupabase(token, userId);
      }
    });
  }, [userId]);

  return { expoPushToken };
}

// Funzione interna per salvare il token
async function saveTokenToSupabase(token: string, userId: string) {
  const { error } = await supabase
    .from('users')
    .update({ expo_push_token: token })
    .eq('id', userId);

  if (error) console.error("Errore salvataggio token:", error);
  else console.log("Token salvato per utente:", userId);
}

// Funzione interna per ottenere i permessi
async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      // alert('Permesso notifiche negato!'); // Puoi commentarlo se dà fastidio nei test
      return;
    }
    
    try {
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        console.log("MIO EXPO PUSH TOKEN:", token);
    } catch (e) {
        console.error(e);
    }
  } else {
    console.log('Devi usare un telefono fisico per le notifiche push!');
  }

  return token;
}

export async function sendFriendRequestNotification(friendExpoPushToken: string, yourName: string) {
  if (!friendExpoPushToken) return;

  const message = {
    to: friendExpoPushToken,
    sound: 'default',
    title: 'Nuova Richiesta! 👥',
    body: `${yourName} vuole essere tuo amico.`,
    data: { screen: 'FriendRequests' },
  };

  try {
      // URL standard (senza proxy)
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
  } catch (error) {
      // Log silenzioso per non disturbare lo sviluppo
      console.log("Push notification skipped or failed (dev mode)");
  }
}
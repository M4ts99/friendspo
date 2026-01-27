// Questa funzione la chiami quando l'utente preme "Invia Richiesta"
export async function sendFriendRequestNotification(friendExpoPushToken: string, yourName: string) {
  
  if (!friendExpoPushToken) return;

  const message = {
    to: friendExpoPushToken,
    sound: 'default',
    title: 'Nuova Richiesta di Amicizia! 👥',
    body: `${yourName} vuole essere tuo amico. Tocca per accettare!`,
    data: { screen: 'FriendRequests' }, // Dati extra per aprire la schermata giusta
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}
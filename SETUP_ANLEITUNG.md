# Supabase Projekt Einrichtung - Schritt für Schritt

## Schritt 1: Supabase Account erstellen

1. Gehe zu **https://supabase.com**
2. Klicke auf **"Start your project"** oder **"Sign in"**
3. Melde dich an mit:
   - GitHub Account (empfohlen)
   - oder Email/Password

## Schritt 2: Neues Projekt erstellen

1. Nach dem Login klickst du auf **"New Project"**
2. Wähle eine **Organization** aus (oder erstelle eine neue)
3. Fülle die Projekt-Details aus:
   - **Name**: `Friendspo` (oder ein anderer Name)
   - **Database Password**: Wähle ein **sicheres Passwort** (gut aufbewahren!)
   - **Region**: Wähle die nächstgelegene Region (z.B. `Frankfurt` für Deutschland)
   - **Pricing Plan**: `Free` ist ausreichend für den Start
4. Klicke auf **"Create new project"**
5. **Warte 1-2 Minuten** bis das Projekt erstellt ist

## Schritt 3: Datenbank-Tabellen erstellen

### 3.1 SQL Editor öffnen
1. Im Supabase Dashboard, klicke links auf **"SQL Editor"** (Icon: `</>`)
2. Klicke auf **"New query"**

### 3.2 SQL-Befehle ausführen

Kopiere den folgenden SQL-Code **komplett** und füge ihn in den SQL Editor ein:

```sql
-- Tabelle: users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname TEXT UNIQUE NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabelle: sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER,
  is_private BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indizes für bessere Performance
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_started_at ON sessions(started_at);

-- Tabelle: friendships
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Row Level Security (RLS) aktivieren
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- RLS Policies für users
CREATE POLICY "Users can view all profiles"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (true);

-- RLS Policies für sessions
CREATE POLICY "Users can view all sessions"
  ON sessions FOR SELECT
  USING (true);

CREATE POLICY "Users can create sessions"
  ON sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update sessions"
  ON sessions FOR UPDATE
  USING (true);

-- RLS Policies für friendships
CREATE POLICY "Users can view all friendships"
  ON friendships FOR SELECT
  USING (true);

CREATE POLICY "Users can create friendships"
  ON friendships FOR INSERT
  WITH CHECK (true);
```

3. Klicke unten rechts auf **"Run"** (oder `Ctrl+Enter`)
4. Du solltest eine grüne Erfolgsmeldung sehen: **"Success. No rows returned"**

### 3.3 Tabellen überprüfen
1. Klicke links auf **"Table Editor"**
2. Du solltest jetzt 3 Tabellen sehen:
   - `users`
   - `sessions`
   - `friendships`

## Schritt 4: API-Zugangsdaten holen

1. Klicke links unten auf **"Project Settings"** (Zahnrad-Icon)
2. Klicke auf **"API"** im Menü
3. Unter **"Project URL"** findest du deine URL, z.B.:
   ```
   https://abcdefghijklmnop.supabase.co
   ```
4. Unter **"Project API keys"** findest du zwei Keys:
   - ⚠️ **`anon` / `public`** ← **Diesen brauchst du!**
   - 🔒 `service_role` ← Nicht verwenden!

5. **Kopiere beide Werte** (URL und anon key)

## Schritt 5: Zugangsdaten in die App eintragen

1. Öffne die Datei `services/supabase.ts` in deinem Code-Editor
2. Ersetze die Platzhalter:

```typescript
// VORHER:
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// NACHHER (mit deinen echten Werten):
const SUPABASE_URL = 'https://abcdefghijklmnop.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

3. **Speichere die Datei**

## Schritt 6: App testen

1. Im Terminal (sollte noch laufen):
   ```bash
   npm run web
   ```
   Falls nicht mehr aktiv, starte es neu.

2. Öffne im Browser: **http://localhost:8081**

3. **Teste die App:**
   - Gib einen Nickname ein
   - Optional: Email und Passwort
   - Klicke auf "Let's Go! 🚀"

4. **Überprüfen ob es funktioniert:**
   - Gehe zurück zu Supabase → **Table Editor** → **users**
   - Du solltest jetzt einen neuen Eintrag mit deinem Nickname sehen!

## Schritt 7: Erste Session tracken

1. In der App, klicke auf **"Start Shit"**
2. Warte ein paar Sekunden
3. Klicke auf **"Stop Shit 🛑"**
4. Gehe zu Supabase → **Table Editor** → **sessions**
5. Du solltest deine erste Session sehen mit:
   - `started_at` (Startzeit)
   - `ended_at` (Endzeit)
   - `duration` (Dauer in Sekunden)

## 🎉 Fertig!

Deine App ist jetzt vollständig eingerichtet und funktioniert!

---

## Troubleshooting

### ❌ "Failed to create account"
- Überprüfe, ob die Tabelle `users` existiert
- Stelle sicher, dass RLS Policies aktiviert sind
- Prüfe die Browser Console auf Fehler (F12)

### ❌ "Invalid API key"
- Überprüfe, ob du den **anon key** kopiert hast (nicht service_role)
- Stelle sicher, dass keine Leerzeichen am Anfang/Ende sind
- Prüfe, ob die URL mit `https://` beginnt

### ❌ Tabellen werden nicht angezeigt
- Stelle sicher, dass der SQL-Befehl erfolgreich ausgeführt wurde
- Aktualisiere die Seite (F5)
- Überprüfe im SQL Editor ob Fehler aufgetreten sind

### 🔄 Datenbank zurücksetzen
Falls etwas schiefgegangen ist:
```sql
DROP TABLE IF EXISTS friendships CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
```
Dann führe den CREATE TABLE Code erneut aus.

---

## Optional: Real-time Feed Updates aktivieren

1. Gehe zu **Database** → **Replication**
2. Suche die Tabelle **sessions**
3. Aktiviere **"Realtime"**
4. Jetzt aktualisiert sich der Feed automatisch, wenn Freunde aktiv sind!

---

## Nächste Schritte

- Freunde hinzufügen (Feature kommt noch)
- Mobile Apps bauen mit `eas build`
- Produktivdatenbank sichern
- Custom Domain einrichten

Viel Spaß mit Friendspo! 💩🚀

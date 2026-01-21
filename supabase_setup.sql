-- ========================================
-- FRIENDSPO - SUPABASE DATENBANK SETUP
-- ========================================
-- Kopiere diesen kompletten Code und füge ihn in den Supabase SQL Editor ein

-- Schritt 1: Tabellen erstellen
-- ========================================

-- Tabelle: users (Benutzer)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname TEXT UNIQUE NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabelle: sessions (Klo-Sessions)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER,
  is_private BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabelle: friendships (Freundschaften)
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Schritt 2: Indizes für bessere Performance
-- ========================================

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_started_at ON sessions(started_at);
CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);

-- Schritt 3: Row Level Security (RLS) aktivieren
-- ========================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Schritt 4: RLS Policies erstellen
-- ========================================

-- USERS Policies
CREATE POLICY "Jeder kann Profile sehen"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Jeder kann sich registrieren"
  ON users FOR INSERT
  WITH CHECK (true);

-- SESSIONS Policies
CREATE POLICY "Jeder kann Sessions sehen"
  ON sessions FOR SELECT
  USING (true);

CREATE POLICY "Jeder kann Sessions erstellen"
  ON sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Jeder kann Sessions aktualisieren"
  ON sessions FOR UPDATE
  USING (true);

-- FRIENDSHIPS Policies
CREATE POLICY "Jeder kann Freundschaften sehen"
  ON friendships FOR SELECT
  USING (true);

CREATE POLICY "Jeder kann Freundschaftsanfragen senden"
  ON friendships FOR INSERT
  WITH CHECK (true);

-- ========================================
-- FERTIG! 🎉
-- ========================================
-- Nächste Schritte:
-- 1. Gehe zu "Table Editor" und überprüfe ob die 3 Tabellen existieren
-- 2. Kopiere deine API-Zugangsdaten (Project Settings → API)
-- 3. Trage sie in services/supabase.ts ein

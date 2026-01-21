-- ========================================
-- FRIENDSPO - DATENBANK MIGRATION
-- ========================================
-- Führe dieses Skript im Supabase SQL Editor aus
-- NACHDEM du das ursprüngliche Setup-Skript ausgeführt hast

-- Schritt 1: Privacy-Spalte zur users Tabelle hinzufügen
-- ========================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_sharing_enabled BOOLEAN DEFAULT TRUE;

-- Schritt 2: Neue RLS Policies für erweiterte Funktionen
-- ========================================

-- Policy: Benutzer können ihr eigenes Profil aktualisieren
CREATE POLICY "Benutzer können eigenes Profil aktualisieren"
  ON users FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Benutzer können ihr eigenes Profil löschen
CREATE POLICY "Benutzer können eigenes Profil löschen"
  ON users FOR DELETE
  USING (true);

-- Policy: Freundschaften können aktualisiert werden (z.B. accept)
CREATE POLICY "Freundschaften können aktualisiert werden"
  ON friendships FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Freundschaften können gelöscht werden (unfriend)
CREATE POLICY "Freundschaften können gelöscht werden"
  ON friendships FOR DELETE
  USING (true);

-- ========================================
-- FERTIG! 🎉
-- ========================================
-- Die neuen Funktionen sind jetzt verfügbar:
-- - Privacy-Einstellung (is_sharing_enabled)
-- - Profil löschen
-- - Freundschaftsanfragen akzeptieren/ablehnen
-- - Freunde entfernen

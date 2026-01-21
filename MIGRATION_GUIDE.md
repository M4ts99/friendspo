# Supabase Migration - Friend System & Privacy Features

## 🎯 Was diese Migration macht

Diese Migration fügt neue Funktionen hinzu:
- **Privacy Toggle**: Benutzer können wählen, ob sie ihre Aktivität teilen
- **Profil löschen**: Benutzer können ihr Profil vollständig löschen
- **Freundschaftsverwaltung**: Erweiterte Policies für Freundschaftsanfragen

## 📋 Schritte

### 1. Supabase SQL Editor öffnen

1. Gehe zu https://supabase.com/dashboard
2. Wähle dein Projekt aus
3. Klicke auf **SQL Editor** in der linken Seitenleiste

### 2. Migration ausführen

1. Klicke auf **New query**
2. Kopiere den kompletten Inhalt von `supabase_migration.sql` in den Editor
3. Klicke auf **Run** (oder drücke `Ctrl+Enter`)

### 3. Überprüfung

Nach erfolgreicher Ausführung solltest du sehen:
- ✅ `Success. No rows returned`

Überprüfe in **Table Editor**:
- Die `users` Tabelle sollte jetzt eine Spalte `is_sharing_enabled` haben (Boolean, Default: true)

## ⚠️ Wichtig

- **FÜHRE DIESE MIGRATION NUR EINMAL AUS!**
- Wenn du die Migration bereits ausgeführt hast, überspringe diesen Schritt
- Bei Fehlern: Kontaktiere Support oder erstelle die Spalte manuell:

```sql
ALTER TABLE users ADD COLUMN is_sharing_enabled BOOLEAN DEFAULT TRUE;
```

## 🧪 Nach der Migration

1. Starte die App neu:
   ```bash
   # Stoppe den aktuellen Server (Ctrl+C)
   npm run web
   ```

2. Teste die neuen Features:
   - ✅ Neue Benutzer registrieren (Multi-Step Onboarding)
   - ✅ Privacy-Toggle in Settings
   - ✅ Freunde hinzufügen/entfernen
   - ✅ Feed sollte bei deaktiviertem Sharing ausgeblendet sein

## 🆘 Troubleshooting

**Fehler: "column already exists"**
→ Die Migration wurde bereits ausgeführt. Alles gut!

**Fehler: "permission denied"**
→ Stelle sicher, dass du als Owner des Projekts eingeloggt bist

**App startet nicht nach Migration**
→ Lösche den App-Cache:
```bash
npx expo start --clear
```

## 📝 Nächste Schritte

Nach erfolgreicher Migration sind folgende Features verfügbar:
- 👥 Vollständiges Friend System
- 🔒 Privacy-Einstellungen
- 🗑️ Profil-Löschung
- 📊 Regularity Score
- 🏆 Friends Leaderboard

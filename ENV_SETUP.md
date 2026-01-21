# 🔐 Supabase Keys für Cloudflare Pages verstecken

## Problem

Die Supabase URL und der Anon Key sind aktuell direkt im Code (`services/supabase.ts`) hardcoded. Bei öffentlichem Hosting auf Cloudflare Pages können diese Keys von jedem eingesehen werden.

## Lösung: Environment Variables

### 🛠️ Schritt 1: `.env` Datei erstellen

1. Erstelle eine `.env` Datei im Projektroot (`friendspo/`)
2. Füge folgende Zeilen hinzu:

```env
EXPO_PUBLIC_SUPABASE_URL=https://degspdujeimikgbofubz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZ3NwZHVqZWltaWtnYm9mdWJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODEyNDUsImV4cCI6MjA4NDU1NzI0NX0.3gI7H-9WMgTdQA4Fshvqb6tDaHKritZ9za6RfugoTRQ
```

> **Wichtig:** Präfix `EXPO_PUBLIC_` ist erforderlich, damit Expo die Variablen zur Build-Zeit einbindet!

### 🔒 Schritt 2: `.gitignore` aktualisieren

Stelle sicher, dass `.env` **NICHT** ins Git-Repository kommt:

```bash
# Öffne .gitignore und füge hinzu:
.env
.env.local
.env.production
```

### 📝 Schritt 3: `.env.example` erstellen

Erstelle `.env.example` für andere Entwickler (OHNE echte Keys):

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

Diese Datei **KANN** ins Git committed werden.

### 🌐 Schritt 4: Cloudflare Pages konfigurieren

1. Gehe zu **Cloudflare Dashboard** → **Workers & Pages** → Dein Projekt
2. Klicke auf **Settings** → **Environment Variables**
3. Füge hinzu:
   - **Variable name:** `EXPO_PUBLIC_SUPABASE_URL`
   - **Value:** `https://degspdujeimikgbofubz.supabase.co`
   - Klicke **Add variable**
4. Wiederhole für:
   - **Variable name:** `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - **Value:** `eyJhbGc...` (dein Anon Key)

> **Tipp:** Du kannst unterschiedliche Werte für Production vs Preview environments setzen!

### 🔄 Schritt 5: Neues Deployment

Nach dem Speichern der Environment Variables:
1. Triggere ein neues Deployment (push to main branch)
2. Cloudflare baut die App mit den Environment Variables neu

---

## ⚙️ Technische Details

### Wie Expo Environment Variables handhabt

Expo ersetzt zur **Build-Zeit** alle Vorkommen von `process.env.EXPO_PUBLIC_*` mit den tatsächlichen Werten. Das bedeutet:

✅ **Entwicklung**: Werte aus `.env` werden verwendet  
✅ **Production Build**: Werte aus Cloudflare Environment Variables werden verwendet  
❌ **Nicht dynamisch**: Werte können zur Laufzeit nicht geändert werden

### Sicherheit

**Anon Key ist absichtlich öffentlich!** Der Supabase Anon Key ist für öffentliche Nutzung gedacht und durch Row Level Security (RLS) Policies geschützt. 

**Was du NIEMALS exposen solltest:**
- ❌ Service Role Key
- ❌ Database Password
- ❌ Private API Keys

---

## 🧪 Lokales Testen

```bash
# .env Datei sollte automatisch geladen werden
npm run web

# Falls nicht, installiere:
npm install dotenv
```

---

## 📋 Checkliste

- [ ] `.env` erstellt mit `EXPO_PUBLIC_` Präfix
- [ ] `.env` in `.gitignore` hinzugefügt
- [ ] `.env.example` für Entwickler erstellt
- [ ] Environment Variables in Cloudflare Pages gesetzt
- [ ] Code in `services/supabase.ts` aktualisiert (siehe nächster Schritt)
- [ ] Neues Deployment getriggert
- [ ] Lokal getestet
- [ ] Production getestet

---

## 🚨 Troubleshooting

**Problem:** Variables werden nicht geladen
- Lösung: Stelle sicher, dass Präfix `EXPO_PUBLIC_` verwendet wird
- Check: `console.log(process.env.EXPO_PUBLIC_SUPABASE_URL)` sollte Wert zeigen

**Problem:** Cloudflare zeigt alte Keys
- Lösung: Hard Refresh + neues Deployment triggern
- Clear Cloudflare Cache

**Problem:** App funktioniert lokal, aber nicht auf Cloudflare
- Lösung: Überprüfe Environment Variables in Cloudflare Dashboard
- Stelle sicher, dass beide Variables gesetzt sind

---

## 📚 Nächste Schritte

Nach dieser Anleitung muss noch `services/supabase.ts` aktualisiert werden, um die Environment Variables zu verwenden. Das wird im nächsten Schritt gemacht.

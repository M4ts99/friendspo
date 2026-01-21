# Friendspo 💩

A cross-platform toilet tracking app where you can track your bathroom sessions, compare stats with friends, and see who's the champion!

## Features

- ⏱️ **Session Tracking**: Start/stop timer for bathroom sessions
- 🔥 **Streak Tracking**: Keep track of your daily consistency
- 📊 **Comprehensive Stats**: Average duration, frequency, most active time, and more
- 📅 **Calendar View**: Visual calendar showing your activity (green/red days)
- 👥 **Friends Feed**: See when your friends are active
- 🏆 **Leaderboards**: Compare stats with friends (coming soon)

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Platforms**: Web, iOS, Android

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Supabase

1. Create a Supabase project at https://supabase.com
2. Create the following tables in your Supabase database:

**users table:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nickname TEXT UNIQUE NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**sessions table:**
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER,
  is_private BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_started_at ON sessions(started_at);
```

**friendships table:**
```sql
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);
```

3. Update `services/supabase.ts` with your Supabase credentials:
   - Replace `YOUR_SUPABASE_URL` with your project URL
   - Replace `YOUR_SUPABASE_ANON_KEY` with your anon key

### 3. Run the App

**For Web:**
```bash
npm run web
```

**For iOS (requires Mac + Xcode):**
```bash
npm run ios
```

**For Android (requires Android Studio):**
```bash
npm run android
```

## Project Structure

```
friendspo/
├── screens/           # Main app screens
│   ├── WelcomeScreen.tsx      # Onboarding with nickname
│   ├── HomeScreen.tsx         # Start/Stop timer
│   ├── StatsScreen.tsx        # Statistics dashboard
│   ├── FeedScreen.tsx         # Friends activity feed
│   └── SettingsScreen.tsx     # Settings & profile
├── components/        # Reusable components
│   └── CalendarView.tsx       # Calendar with green/red days
├── services/          # Business logic & API
│   ├── supabase.ts           # Supabase client
│   ├── authService.ts        # Authentication
│   ├── sessionService.ts     # Session CRUD
│   └── statsService.ts       # Statistics calculations
├── styles/            # Design system
│   └── theme.ts              # Colors, spacing, typography
└── App.tsx            # Main app entry & navigation
```

## How It Works

1. **Sign Up**: Enter a unique nickname (optional email/password for account security)
2. **Track Sessions**: Tap "Start Shit" when you go, "Stop Shit" when done
3. **View Stats**: Check your personal stats, streaks, and calendar
4. **Add Friends**: Compete and compare with friends (coming soon)
5. **Feed**: See your friends' activity in real-time

## Building for Production

**Web:**
```bash
npm run build
```

**iOS/Android:**
```bash
eas build --platform ios
eas build --platform android
```

(Requires Expo Application Services (EAS) account)

## Future Features

- [ ] Friend requests and management
- [ ] Achievements and badges
- [ ] Push notifications
- [ ] Privacy controls for sessions
- [ ] Location tags (Home/Work/Out)
- [ ] Advanced leaderboards

## License

MIT

---

Made with 💩 and ❤️

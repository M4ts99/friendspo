# Supabase Setup Instructions

## 1. Create a Supabase Project

1. Go to https://supabase.com and sign up/login
2. Click "New Project"
3. Name your project "Friendspo" (or whatever you prefer)
4. Set a secure database password
5. Choose your region
6. Wait for the project to be created

## 2. Get Your Credentials

1. Go to Project Settings → API
2. Copy the following:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys")

## 3. Create Database Tables

1. Go to the SQL Editor in your Supabase dashboard
2. Run the following SQL commands:

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nickname TEXT UNIQUE NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow users to read all profiles
CREATE POLICY "Users can view all profiles"
  ON users FOR SELECT
  USING (true);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (true);
```

### Sessions Table
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

-- Create indexes for better performance
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_started_at ON sessions(started_at);

-- Enable Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view their own sessions"
  ON sessions FOR SELECT
  USING (true);

-- Users can insert their own sessions
CREATE POLICY "Users can create sessions"
  ON sessions FOR INSERT
  WITH CHECK (true);

-- Users can update their own sessions
CREATE POLICY "Users can update their own sessions"
  ON sessions FOR UPDATE
  USING (true);
```

### Friendships Table
```sql
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Enable Row Level Security
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Users can view their friendships
CREATE POLICY "Users can view their friendships"
  ON friendships FOR SELECT
  USING (true);

-- Users can create friendships
CREATE POLICY "Users can create friendships"
  ON friendships FOR INSERT
  WITH CHECK (true);
```

## 4. Update Your App Configuration

1. Open `services/supabase.ts`
2. Replace the placeholders:
   ```typescript
   const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Replace with your Project URL
   const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your anon key
   ```

## 5. Test the Connection

Run the app and try creating a user. If everything is set up correctly, you should be able to:
- Create a new user with a nickname
- Start and stop sessions
- View stats

## Troubleshooting

### "relation does not exist" error
- Make sure you've run all the SQL commands in the SQL Editor
- Check that the tables are created in the "Table Editor"

### Authentication errors
- Verify your SUPABASE_URL and SUPABASE_ANON_KEY are correct
- Make sure Row Level Security policies are set up correctly

### Can't insert data
- Check the Row Level Security policies
- Make sure the policies allow INSERT operations

## Optional: Enable Realtime

For real-time feed updates:

1. Go to Database → Replication
2. Enable replication for the `sessions` table
3. This will allow the feed to update in real-time when friends post new sessions

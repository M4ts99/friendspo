-- ========================================
-- MIGRATION V6: Account System Updates
-- ========================================

-- Add column for tracking nickname change cooldown
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_nickname_change TIMESTAMP WITH TIME ZONE;

-- Add UPDATE policy for users table (allows changing nickname and email)
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (true);

-- ========================================
-- FRIENDSPO - MIGRATION V3
-- ========================================
-- Purpose: Add function to migrate data from a Guest ID to a Supabase Auth ID
-- Run this in the Supabase SQL Editor

CREATE OR REPLACE FUNCTION migrate_user_data(old_user_id UUID, new_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Run as database owner to bypass RLS during migration
AS $$
BEGIN
  -- 1. Transfer Sessions
  UPDATE sessions 
  SET user_id = new_user_id 
  WHERE user_id = old_user_id;

  -- 2. Transfer Friendships (as Sender)
  UPDATE friendships 
  SET user_id = new_user_id 
  WHERE user_id = old_user_id;

  -- 3. Transfer Friendships (as Receiver)
  UPDATE friendships 
  SET friend_id = new_user_id 
  WHERE friend_id = old_user_id;

  -- 4. Transfer User Profile Data (Nickname, etc)
  -- We assume the new user row already exists (created by trigger or signUp)
  -- So we update it with the old user's settings if needed
  UPDATE users
  SET 
    is_sharing_enabled = (SELECT is_sharing_enabled FROM users WHERE id = old_user_id),
    nickname = (SELECT nickname FROM users WHERE id = old_user_id)
  WHERE id = new_user_id;

  -- 5. Delete the old guest user
  DELETE FROM users WHERE id = old_user_id;
END;
$$;

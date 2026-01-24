-- ========================================
-- FRIENDSPO - MIGRATION V3 (UPDATED)
-- ========================================
-- Purpose: Add function to migrate data from a Guest ID to a Supabase Auth ID
-- Run this in the Supabase SQL Editor

CREATE OR REPLACE FUNCTION migrate_user_data(old_user_id UUID, new_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Run as database owner to bypass RLS during migration
AS $$
DECLARE
  old_nickname TEXT;
  old_sharing_enabled BOOLEAN;
BEGIN
  -- 0. Store old user's data in variables BEFORE deleting
  SELECT nickname, is_sharing_enabled 
  INTO old_nickname, old_sharing_enabled
  FROM users 
  WHERE id = old_user_id;

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

  -- 4. Delete the old guest user FIRST (to free up the nickname)
  DELETE FROM users WHERE id = old_user_id;

  -- 5. Create new user profile with old user's data
  INSERT INTO users (id, nickname, is_sharing_enabled, email)
  VALUES (new_user_id, old_nickname, old_sharing_enabled, NULL);
END;
$$;


-- ========================================
-- MIGRATION V5: Fix DELETE Policy for Guests
-- ========================================

-- First, drop the strict policy if it exists
DROP POLICY IF EXISTS "Users can delete their own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can delete their own friendships" ON friendships;

-- Re-create policies with open access (matching existing SELECT/UPDATE policies)
-- meaningful security will require a full migration to RLS with auth.uid() for all operations,
-- but for now this restores functionality for guest users.

CREATE POLICY "Enable delete for users"
  ON sessions FOR DELETE
  USING (true);

CREATE POLICY "Enable delete for friendships"
  ON friendships FOR DELETE
  USING (true);

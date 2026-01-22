-- ========================================
-- MIGRATION V4: Add DELETE Policies
-- ========================================

-- Enable users to delete their own sessions
CREATE POLICY "Users can delete their own sessions"
  ON sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Enable users to delete their own friendships
CREATE POLICY "Users can delete their own friendships"
  ON friendships FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- FRIENDSPO - MIGRATION V7
-- ========================================
-- Purpose: Fix INSERT policy for users table to allow fresh sign ups
-- Run this in the Supabase SQL Editor

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

-- Create new INSERT policy that allows authenticated users to insert their own profile
CREATE POLICY "Users can insert their own profile" 
ON users 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

-- Also ensure SELECT policy exists for users to read their own data
DROP POLICY IF EXISTS "Users can view their own profile" ON users;

CREATE POLICY "Users can view their own profile"
ON users
FOR SELECT
TO authenticated, anon
USING (auth.uid() = id OR auth.uid() IS NULL);

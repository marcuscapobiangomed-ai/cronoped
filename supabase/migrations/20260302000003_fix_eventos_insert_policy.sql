-- Fix: ensure eventos table has proper INSERT policy for users
-- logEvent() was failing with 401 "new row violates row-level security policy"

ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;

-- Drop and recreate to ensure correct definition
DROP POLICY IF EXISTS "Users insert own events" ON eventos;
CREATE POLICY "Users insert own events" ON eventos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

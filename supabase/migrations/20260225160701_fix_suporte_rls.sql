-- Fix suporte table RLS policies
DROP POLICY IF EXISTS "Users insert own" ON suporte;
DROP POLICY IF EXISTS "Admin select all" ON suporte;

ALTER TABLE suporte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own" ON suporte
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin select all" ON suporte
  FOR SELECT USING (
    auth.jwt()->>'email' = 'marcuscapobiangomed@gmail.com'
  );

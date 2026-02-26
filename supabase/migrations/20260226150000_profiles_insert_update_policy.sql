-- Profiles: permitir INSERT e UPDATE do proprio usuario
DROP POLICY IF EXISTS "Users insert own profile" ON profiles;
CREATE POLICY "Users insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Bloquear DELETE de profiles por usuarios comuns
DROP POLICY IF EXISTS "Block user delete profiles" ON profiles;
CREATE POLICY "Block user delete profiles" ON profiles
  FOR DELETE USING (false);

-- Progresso: bloquear DELETE por usuarios comuns
DROP POLICY IF EXISTS "Block user delete progresso" ON progresso;
CREATE POLICY "Block user delete progresso" ON progresso
  FOR DELETE USING (false);

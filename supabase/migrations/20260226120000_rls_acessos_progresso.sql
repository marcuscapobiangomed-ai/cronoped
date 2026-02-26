-- Habilitar RLS nas tabelas acessos e progresso (seguro re-executar)

-- ======== ACESSOS ========
ALTER TABLE acessos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own acessos" ON acessos;
CREATE POLICY "Users select own acessos"
  ON acessos FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own acessos" ON acessos;
CREATE POLICY "Users insert own acessos"
  ON acessos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update restrito: usuario so pode mudar grupo do proprio acesso (usado pelo grupo selector)
DROP POLICY IF EXISTS "Users update own grupo" ON acessos;
CREATE POLICY "Users update own grupo"
  ON acessos FOR UPDATE
  USING (auth.uid() = user_id);

-- Delete nao permitido para usuarios comuns (admin faz via RPC SECURITY DEFINER)
DROP POLICY IF EXISTS "Block user delete acessos" ON acessos;
CREATE POLICY "Block user delete acessos"
  ON acessos FOR DELETE
  USING (false);

-- ======== PROGRESSO ========
ALTER TABLE progresso ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own progresso" ON progresso;
CREATE POLICY "Users select own progresso"
  ON progresso FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own progresso" ON progresso;
CREATE POLICY "Users insert own progresso"
  ON progresso FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own progresso" ON progresso;
CREATE POLICY "Users update own progresso"
  ON progresso FOR UPDATE
  USING (auth.uid() = user_id);

-- ======== PROFILES ========
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own profile" ON profiles;
CREATE POLICY "Users select own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

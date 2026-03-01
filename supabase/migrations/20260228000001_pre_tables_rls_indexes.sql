-- ============================================================
-- Cronograma 2026.1 (cronopre): PARTE 1 - Tabelas, RLS, Indexes
-- ============================================================

-- 1. TABELAS

CREATE TABLE pre_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  nome TEXT,
  cpf TEXT,
  is_vip BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  trial_used_at TIMESTAMPTZ DEFAULT NULL,
  customizations JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE pre_profiles ADD CONSTRAINT pre_profiles_cpf_unique UNIQUE (cpf);

CREATE TABLE pre_acessos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  materia TEXT NOT NULL,
  grupo INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'trial',
  trial_expires_at TIMESTAMPTZ,
  mp_payment_id TEXT,
  valor_pago NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, materia)
);

CREATE TABLE pre_progresso (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  materia TEXT NOT NULL,
  completed JSONB DEFAULT '{}'::jsonb,
  notes JSONB DEFAULT '{}'::jsonb,
  customizations JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, materia)
);

CREATE TABLE pre_eventos (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  meta JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE pre_sessoes_ativas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  device_info TEXT,
  last_seen TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE pre_suporte (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nome TEXT,
  email TEXT,
  assunto TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberto',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pre_affiliate_commissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_user_id UUID NOT NULL REFERENCES pre_profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES pre_profiles(id) ON DELETE CASCADE,
  materia TEXT NOT NULL,
  valor_venda NUMERIC(10,2) NOT NULL,
  comissao_pct NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  comissao_valor NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE pre_affiliate_commissions
  ADD CONSTRAINT pre_uq_commission_per_user_materia UNIQUE (referred_user_id, materia);

-- 2. RLS

ALTER TABLE pre_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users select own profile" ON pre_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON pre_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON pre_profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE pre_acessos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users select own acessos" ON pre_acessos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own acessos" ON pre_acessos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own acessos" ON pre_acessos FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE pre_progresso ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users select own progresso" ON pre_progresso FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own progresso" ON pre_progresso FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own progresso" ON pre_progresso FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE pre_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own events" ON pre_eventos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin reads all events" ON pre_eventos FOR SELECT USING (
  EXISTS (SELECT 1 FROM pre_profiles WHERE id = auth.uid() AND is_admin = true)
);

ALTER TABLE pre_sessoes_ativas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sessions" ON pre_sessoes_ativas FOR ALL USING (auth.uid() = user_id);

ALTER TABLE pre_suporte ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own tickets" ON pre_suporte FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users select own tickets" ON pre_suporte FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin select all tickets" ON pre_suporte FOR SELECT USING (
  EXISTS (SELECT 1 FROM pre_profiles WHERE id = auth.uid() AND is_admin = true)
);

ALTER TABLE pre_affiliate_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own commissions" ON pre_affiliate_commissions FOR SELECT USING (affiliate_user_id = auth.uid());

-- 3. INDEXES

CREATE INDEX IF NOT EXISTS idx_pre_profiles_referral_code ON pre_profiles(referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pre_profiles_referred_by ON pre_profiles(referred_by) WHERE referred_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pre_acessos_user ON pre_acessos(user_id);
CREATE INDEX IF NOT EXISTS idx_pre_eventos_created ON pre_eventos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pre_eventos_type ON pre_eventos(type);
CREATE INDEX IF NOT EXISTS idx_pre_eventos_user ON pre_eventos(user_id);
CREATE INDEX IF NOT EXISTS idx_pre_sessoes_user ON pre_sessoes_ativas(user_id);
CREATE INDEX IF NOT EXISTS idx_pre_sessoes_token ON pre_sessoes_ativas(token);

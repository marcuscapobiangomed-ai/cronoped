-- ============================================================
-- Sistema de Afiliados: link personalizado + comissao
-- ============================================================

-- 1. Novas colunas em profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by TEXT;

-- Index para busca rapida de referral_code
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by) WHERE referred_by IS NOT NULL;

-- 2. Tabela de comissoes
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  materia TEXT NOT NULL,
  valor_venda NUMERIC(10,2) NOT NULL,
  comissao_pct NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  comissao_valor NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente, pago
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para affiliate_commissions
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own commissions" ON affiliate_commissions
  FOR SELECT USING (affiliate_user_id = auth.uid());

-- 3. RPC: usuario define seu codigo de afiliado
CREATE OR REPLACE FUNCTION set_referral_code(p_code TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  clean_code TEXT;
BEGIN
  clean_code := lower(trim(p_code));

  -- Validar formato: 3-20 chars, alfanumerico + hifen
  IF clean_code !~ '^[a-z0-9][a-z0-9\-]{1,18}[a-z0-9]$' THEN
    RAISE EXCEPTION 'Código inválido. Use 3-20 caracteres (letras, números e hífen).';
  END IF;

  -- Verificar se já existe
  IF EXISTS (SELECT 1 FROM profiles WHERE referral_code = clean_code AND id != auth.uid()) THEN
    RAISE EXCEPTION 'Este código já está em uso. Escolha outro.';
  END IF;

  UPDATE profiles SET referral_code = clean_code WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION set_referral_code(TEXT) TO authenticated;

-- 4. RPC: aplicar referral no signup
CREATE OR REPLACE FUNCTION apply_referral(p_code TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  clean_code TEXT;
  referrer_id UUID;
BEGIN
  clean_code := lower(trim(p_code));

  -- Buscar afiliado
  SELECT id INTO referrer_id FROM profiles WHERE referral_code = clean_code;

  -- Se codigo nao existe, ignorar silenciosamente
  IF referrer_id IS NULL THEN RETURN; END IF;

  -- Nao permitir auto-referral
  IF referrer_id = auth.uid() THEN RETURN; END IF;

  -- Nao sobrescrever se ja tem referred_by
  UPDATE profiles SET referred_by = clean_code
    WHERE id = auth.uid() AND referred_by IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION apply_referral(TEXT) TO authenticated;

-- 5. RPC: usuario ve suas stats de afiliado
CREATE OR REPLACE FUNCTION get_referral_stats()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  my_code TEXT;
  result JSONB;
BEGIN
  SELECT referral_code INTO my_code FROM profiles WHERE id = auth.uid();

  IF my_code IS NULL THEN
    RETURN jsonb_build_object('code', null, 'total_indicados', 0, 'total_pagantes', 0, 'comissao_total', 0, 'comissao_pendente', 0);
  END IF;

  SELECT jsonb_build_object(
    'code', my_code,
    'total_indicados', (SELECT count(*) FROM profiles WHERE referred_by = my_code),
    'total_pagantes', (SELECT count(DISTINCT referred_user_id) FROM affiliate_commissions WHERE affiliate_user_id = auth.uid()),
    'comissao_total', (SELECT coalesce(sum(comissao_valor), 0) FROM affiliate_commissions WHERE affiliate_user_id = auth.uid()),
    'comissao_pendente', (SELECT coalesce(sum(comissao_valor), 0) FROM affiliate_commissions WHERE affiliate_user_id = auth.uid() AND status = 'pendente')
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_referral_stats() TO authenticated;

-- 6. RPC admin: marcar comissao como paga
CREATE OR REPLACE FUNCTION admin_mark_commission_paid(p_commission_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE affiliate_commissions SET status = 'pago' WHERE id = p_commission_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_mark_commission_paid(UUID) TO authenticated;

-- 7. Atualizar admin_dashboard_data com dados de afiliados
CREATE OR REPLACE FUNCTION admin_dashboard_data()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE result JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'total_users',       (SELECT count(*) FROM profiles),
    'total_paid',        (SELECT count(DISTINCT a.user_id) FROM acessos a JOIN profiles p ON p.id = a.user_id WHERE a.status = 'aprovado' AND p.is_vip = false),
    'total_revenue',     (SELECT coalesce(sum(a.valor_pago), 0) FROM acessos a JOIN profiles p ON p.id = a.user_id WHERE a.status = 'aprovado' AND p.is_vip = false),
    'active_sessions',   (SELECT row_to_json(t) FROM (SELECT * FROM admin_active_sessions) t),
    'online_users',      (SELECT coalesce(jsonb_agg(jsonb_build_object(
                            'nome', p.nome, 'email', p.email, 'last_seen', s.last_seen, 'device_info', s.device_info
                          ) ORDER BY s.last_seen DESC), '[]')
                          FROM sessoes_ativas s JOIN profiles p ON p.id = s.user_id
                          WHERE s.last_seen > now() - interval '5 minutes'),
    'user_growth',       (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM admin_user_growth) t),
    'conversion_funnel', (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM admin_conversion_funnel) t),
    'revenue',           (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM admin_revenue) t),
    'expiring_trials',   (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM admin_expiring_trials) t),
    'devices',           (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM admin_devices) t),
    'recent_events',     (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM admin_recent_events) t),
    'engagement',        (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM admin_engagement) t),
    'support_tickets',   (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (
      SELECT id, created_at, nome, email, assunto, mensagem, status FROM suporte ORDER BY created_at DESC LIMIT 50
    ) t),
    'affiliates',        (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'user_id', p.id, 'nome', p.nome, 'email', p.email, 'code', p.referral_code,
      'total_referred', (SELECT count(*) FROM profiles WHERE referred_by = p.referral_code),
      'total_paid', (SELECT count(DISTINCT referred_user_id) FROM affiliate_commissions WHERE affiliate_user_id = p.id),
      'comissao_total', (SELECT coalesce(sum(comissao_valor), 0) FROM affiliate_commissions WHERE affiliate_user_id = p.id),
      'comissao_pendente', (SELECT coalesce(sum(comissao_valor), 0) FROM affiliate_commissions WHERE affiliate_user_id = p.id AND status = 'pendente')
    ) ORDER BY (SELECT count(*) FROM profiles WHERE referred_by = p.referral_code) DESC), '[]')
    FROM profiles p WHERE p.referral_code IS NOT NULL)
  ) INTO result;

  RETURN result;
END;
$$;

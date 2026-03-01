-- ============================================================
-- Assinatura mensal recorrente (R$9,90/mês — todas as matérias)
-- Usa Mercado Pago Preapproval API
-- ============================================================

-- 1. Tabela de assinaturas
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mp_preapproval_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, authorized, paused, cancelled
  amount NUMERIC(10,2) NOT NULL DEFAULT 9.90,
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Usuário lê apenas a própria assinatura
CREATE POLICY "Users read own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Atualizar admin_dashboard_data para incluir assinantes
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
    'total_paid',        (SELECT count(DISTINCT a.user_id) FROM acessos a JOIN profiles p ON p.id = a.user_id WHERE a.status = 'aprovado' AND p.is_vip = false AND a.mp_payment_id IS NOT NULL),
    'total_revenue',     (SELECT coalesce(sum(a.valor_pago), 0) FROM acessos a JOIN profiles p ON p.id = a.user_id WHERE a.status = 'aprovado' AND p.is_vip = false AND a.mp_payment_id IS NOT NULL),
    'total_subscribers', (SELECT count(*) FROM subscriptions WHERE status = 'authorized'),
    'subscription_mrr',  (SELECT coalesce(count(*) * 9.90, 0) FROM subscriptions WHERE status = 'authorized'),
    'active_sessions',   (SELECT row_to_json(t) FROM (SELECT * FROM admin_active_sessions) t),
    'online_users',      (SELECT coalesce(jsonb_agg(jsonb_build_object(
                            'user_id', s.user_id,
                            'nome', p.nome, 'email', p.email,
                            'last_seen', s.last_seen, 'device_info', s.device_info
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

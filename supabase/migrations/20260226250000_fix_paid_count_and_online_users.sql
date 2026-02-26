-- ============================================================
-- Fix: contagem de pagantes deve excluir acessos dados pelo admin
-- Critério: só conta como "pago" quem tem mp_payment_id (pagou pelo MP)
-- ============================================================

-- 1. Fix admin_conversion_funnel: paid = quem tem mp_payment_id
CREATE OR REPLACE VIEW admin_conversion_funnel AS
SELECT a.materia,
  count(*) FILTER (WHERE a.status = 'trial')    AS trials,
  count(*) FILTER (WHERE a.status = 'pending')  AS pending,
  count(*) FILTER (WHERE a.status = 'aprovado' AND p.is_vip = false AND a.mp_payment_id IS NOT NULL) AS paid
FROM acessos a
JOIN profiles p ON p.id = a.user_id
GROUP BY a.materia;

-- 2. Fix admin_revenue: só receita real (com mp_payment_id)
CREATE OR REPLACE VIEW admin_revenue AS
SELECT a.materia, count(*) AS total_sales, coalesce(sum(a.valor_pago), 0) AS revenue_brl
FROM acessos a
JOIN profiles p ON p.id = a.user_id
WHERE a.status = 'aprovado' AND p.is_vip = false AND a.mp_payment_id IS NOT NULL
GROUP BY a.materia;

-- 3. Fix admin_dashboard_data: total_paid e total_revenue só com mp_payment_id
--    + online_users agora inclui user_id para navegação
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

-- ============================================================
-- Fase 3: Otimização do admin_dashboard_data com CTEs
-- Substitui subqueries correlacionadas por aggregate + FILTER
-- ============================================================

-- Otimizar pre_admin_dashboard_data
-- Problema: affiliates tinha 4 subqueries correlacionadas por afiliado (N+1)
-- Solução: Single scan com JOINs e GROUP BY

CREATE OR REPLACE FUNCTION pre_admin_dashboard_data()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE result JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pre_profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  WITH
    -- Aggregate stats de acessos em uma única passagem
    access_stats AS (
      SELECT
        count(DISTINCT a.user_id) AS total_paid,
        coalesce(sum(a.valor_pago), 0) AS total_revenue
      FROM pre_acessos a
      JOIN pre_profiles p ON p.id = a.user_id
      WHERE a.status = 'aprovado' AND p.is_vip = false AND a.mp_payment_id IS NOT NULL
    ),
    -- Aggregate de afiliados em uma única passagem (substitui 4 subqueries por afiliado)
    aff_referred AS (
      SELECT referred_by, count(*) AS total_referred
      FROM pre_profiles
      WHERE referred_by IS NOT NULL
      GROUP BY referred_by
    ),
    aff_commissions AS (
      SELECT
        affiliate_user_id,
        count(DISTINCT referred_user_id) AS total_paid,
        coalesce(sum(comissao_valor), 0) AS comissao_total,
        coalesce(sum(comissao_valor) FILTER (WHERE status = 'pendente'), 0) AS comissao_pendente
      FROM pre_affiliate_commissions
      GROUP BY affiliate_user_id
    ),
    affiliate_data AS (
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', p.id, 'nome', p.nome, 'email', p.email, 'code', p.referral_code,
        'total_referred', coalesce(ar.total_referred, 0),
        'total_paid', coalesce(ac.total_paid, 0),
        'comissao_total', coalesce(ac.comissao_total, 0),
        'comissao_pendente', coalesce(ac.comissao_pendente, 0)
      ) ORDER BY coalesce(ar.total_referred, 0) DESC) AS affiliates
      FROM pre_profiles p
      LEFT JOIN aff_referred ar ON ar.referred_by = p.referral_code
      LEFT JOIN aff_commissions ac ON ac.affiliate_user_id = p.id
      WHERE p.referral_code IS NOT NULL
    )
  SELECT jsonb_build_object(
    'total_users',       (SELECT count(*) FROM pre_profiles),
    'total_paid',        (SELECT total_paid FROM access_stats),
    'total_revenue',     (SELECT total_revenue FROM access_stats),
    'active_sessions',   (SELECT row_to_json(t) FROM (SELECT * FROM pre_admin_active_sessions) t),
    'online_users',      (SELECT coalesce(jsonb_agg(jsonb_build_object(
                            'user_id', s.user_id,
                            'nome', p.nome, 'email', p.email,
                            'last_seen', s.last_seen, 'device_info', s.device_info
                          ) ORDER BY s.last_seen DESC), '[]')
                          FROM pre_sessoes_ativas s JOIN pre_profiles p ON p.id = s.user_id
                          WHERE s.last_seen > now() - interval '5 minutes'),
    'user_growth',       (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM pre_admin_user_growth) t),
    'conversion_funnel', (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM pre_admin_conversion_funnel) t),
    'revenue',           (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM pre_admin_revenue) t),
    'expiring_trials',   (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM pre_admin_expiring_trials) t),
    'devices',           (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM pre_admin_devices) t),
    'recent_events',     (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM pre_admin_recent_events) t),
    'engagement',        (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM pre_admin_engagement) t),
    'support_tickets',   (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (
      SELECT id, created_at, nome, email, assunto, mensagem, status FROM pre_suporte ORDER BY created_at DESC LIMIT 50
    ) t),
    'affiliates',        (SELECT coalesce(affiliates, '[]') FROM affiliate_data)
  ) INTO result;

  RETURN result;
END;
$$;

-- Otimizar admin_dashboard_data (versão original — mais simples, sem affiliates)
CREATE OR REPLACE FUNCTION admin_dashboard_data()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE result JSONB;
BEGIN
  IF auth.jwt() ->> 'email' IS DISTINCT FROM 'marcuscapobiangomed@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  WITH access_stats AS (
    SELECT
      count(DISTINCT user_id) AS total_paid,
      coalesce(round(count(*) * 9.90, 2), 0) AS total_revenue
    FROM acessos
    WHERE status = 'aprovado'
  )
  SELECT jsonb_build_object(
    'total_users',       (SELECT count(*) FROM profiles),
    'total_paid',        (SELECT total_paid FROM access_stats),
    'total_revenue',     (SELECT total_revenue FROM access_stats),
    'active_sessions',   (SELECT row_to_json(t) FROM (SELECT * FROM admin_active_sessions) t),
    'user_growth',       (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM admin_user_growth) t),
    'conversion_funnel', (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM admin_conversion_funnel) t),
    'revenue',           (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM admin_revenue) t),
    'expiring_trials',   (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM admin_expiring_trials) t),
    'devices',           (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM admin_devices) t),
    'recent_events',     (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM admin_recent_events) t),
    'engagement',        (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM admin_engagement) t)
  ) INTO result;

  RETURN result;
END;
$$;

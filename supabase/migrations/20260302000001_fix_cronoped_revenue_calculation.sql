-- Fix: admin_dashboard_data() usava count(*) * 9.90 para receita
-- Agora usa sum(valor_pago) filtrado por mp_payment_id NOT NULL (pagamentos reais)
-- Também adiciona online_users, support_tickets e affiliates que estavam faltando

CREATE OR REPLACE FUNCTION admin_dashboard_data()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE result JSONB;
BEGIN
  IF auth.jwt() ->> 'email' IS DISTINCT FROM 'marcuscapobiangomed@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  WITH
    access_stats AS (
      SELECT
        count(DISTINCT a.user_id) AS total_paid,
        coalesce(sum(a.valor_pago), 0) AS total_revenue
      FROM acessos a
      JOIN profiles p ON p.id = a.user_id
      WHERE a.status = 'aprovado' AND p.is_vip = false AND a.mp_payment_id IS NOT NULL
    ),
    aff_referred AS (
      SELECT referred_by, count(*) AS total_referred
      FROM profiles
      WHERE referred_by IS NOT NULL
      GROUP BY referred_by
    ),
    aff_commissions AS (
      SELECT
        affiliate_user_id,
        count(DISTINCT referred_user_id) AS total_paid,
        coalesce(sum(comissao_valor), 0) AS comissao_total,
        coalesce(sum(comissao_valor) FILTER (WHERE status = 'pendente'), 0) AS comissao_pendente
      FROM affiliate_commissions
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
      FROM profiles p
      LEFT JOIN aff_referred ar ON ar.referred_by = p.referral_code
      LEFT JOIN aff_commissions ac ON ac.affiliate_user_id = p.id
      WHERE p.referral_code IS NOT NULL
    )
  SELECT jsonb_build_object(
    'total_users',       (SELECT count(*) FROM profiles),
    'total_paid',        (SELECT total_paid FROM access_stats),
    'total_revenue',     (SELECT total_revenue FROM access_stats),
    'total_subscribers', 0,
    'subscription_mrr',  0,
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
      SELECT id, created_at,
        (SELECT nome FROM profiles WHERE id = su.user_id) AS nome,
        (SELECT email FROM profiles WHERE id = su.user_id) AS email,
        assunto, mensagem, status
      FROM suporte su ORDER BY created_at DESC LIMIT 50
    ) t),
    'affiliates',        (SELECT coalesce(affiliates, '[]') FROM affiliate_data)
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION pre_admin_dashboard_data()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE result JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pre_profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'total_users',       (SELECT count(*) FROM pre_profiles),
    'total_paid',        (SELECT count(DISTINCT a.user_id) FROM pre_acessos a JOIN pre_profiles p ON p.id = a.user_id WHERE a.status = 'aprovado' AND p.is_vip = false AND a.mp_payment_id IS NOT NULL),
    'total_revenue',     (SELECT coalesce(sum(a.valor_pago), 0) FROM pre_acessos a JOIN pre_profiles p ON p.id = a.user_id WHERE a.status = 'aprovado' AND p.is_vip = false AND a.mp_payment_id IS NOT NULL),
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
    'affiliates',        (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'user_id', p.id, 'nome', p.nome, 'email', p.email, 'code', p.referral_code,
      'total_referred', (SELECT count(*) FROM pre_profiles WHERE referred_by = p.referral_code),
      'total_paid', (SELECT count(DISTINCT referred_user_id) FROM pre_affiliate_commissions WHERE affiliate_user_id = p.id),
      'comissao_total', (SELECT coalesce(sum(comissao_valor), 0) FROM pre_affiliate_commissions WHERE affiliate_user_id = p.id),
      'comissao_pendente', (SELECT coalesce(sum(comissao_valor), 0) FROM pre_affiliate_commissions WHERE affiliate_user_id = p.id AND status = 'pendente')
    ) ORDER BY (SELECT count(*) FROM pre_profiles WHERE referred_by = p.referral_code) DESC), '[]')
    FROM pre_profiles p WHERE p.referral_code IS NOT NULL)
  ) INTO result;

  RETURN result;
END;
$$;

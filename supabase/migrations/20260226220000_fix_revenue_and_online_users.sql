-- ============================================================
-- 1. Adicionar coluna valor_pago para rastrear receita real
-- ============================================================
ALTER TABLE acessos ADD COLUMN IF NOT EXISTS valor_pago NUMERIC(10,2) DEFAULT NULL;

-- ============================================================
-- 2. Garantir que admin (Marcus) tem is_vip = true
-- ============================================================
UPDATE profiles SET is_vip = true WHERE email = 'marcuscapobiangomed@gmail.com';

-- ============================================================
-- 3. Corrigir admin_dashboard_data: receita via SUM(valor_pago)
--    + adicionar lista de online_users
-- ============================================================
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
                            'nome', p.nome,
                            'email', p.email,
                            'last_seen', s.last_seen,
                            'device_info', s.device_info
                          ) ORDER BY s.last_seen DESC), '[]')
                          FROM sessoes_ativas s
                          JOIN profiles p ON p.id = s.user_id
                          WHERE s.last_seen > now() - interval '5 minutes'),
    'user_growth',       (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM admin_user_growth) t),
    'conversion_funnel', (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM admin_conversion_funnel) t),
    'revenue',           (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM admin_revenue) t),
    'expiring_trials',   (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM admin_expiring_trials) t),
    'devices',           (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM admin_devices) t),
    'recent_events',     (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM admin_recent_events) t),
    'engagement',        (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM admin_engagement) t),
    'support_tickets',   (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (
      SELECT id, created_at, nome, email, assunto, mensagem, status
      FROM suporte ORDER BY created_at DESC LIMIT 50
    ) t)
  ) INTO result;

  RETURN result;
END;
$$;

-- ============================================================
-- 4. Corrigir views de receita
-- ============================================================
CREATE OR REPLACE VIEW admin_revenue AS
SELECT a.materia, count(*) AS total_sales, coalesce(sum(a.valor_pago), 0) AS revenue_brl
FROM acessos a
JOIN profiles p ON p.id = a.user_id
WHERE a.status = 'aprovado' AND p.is_vip = false
GROUP BY a.materia;

CREATE OR REPLACE VIEW admin_conversion_funnel AS
SELECT a.materia,
  count(*) FILTER (WHERE a.status = 'trial')    AS trials,
  count(*) FILTER (WHERE a.status = 'pending')  AS pending,
  count(*) FILTER (WHERE a.status = 'aprovado' AND p.is_vip = false) AS paid
FROM acessos a
JOIN profiles p ON p.id = a.user_id
GROUP BY a.materia;

-- ============================================================
-- 1. Fix receita: excluir VIP users da contagem de pagantes
-- ============================================================

-- Fix conversion funnel view (exclude VIP from "paid" count)
CREATE OR REPLACE VIEW admin_conversion_funnel AS
SELECT a.materia,
  count(*) FILTER (WHERE a.status = 'trial')    AS trials,
  count(*) FILTER (WHERE a.status = 'pending')  AS pending,
  count(*) FILTER (WHERE a.status = 'aprovado' AND p.is_vip = false) AS paid
FROM acessos a
JOIN profiles p ON p.id = a.user_id
GROUP BY a.materia;

-- Fix revenue view (exclude VIP, correct price to 20.90)
CREATE OR REPLACE VIEW admin_revenue AS
SELECT a.materia, count(*) AS total_sales, round(count(*) * 20.90, 2) AS revenue_brl
FROM acessos a
JOIN profiles p ON p.id = a.user_id
WHERE a.status = 'aprovado' AND p.is_vip = false
GROUP BY a.materia;

-- Fix main RPC (exclude VIP from total_paid and total_revenue)
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
    'total_revenue',     (SELECT coalesce(round(count(*) * 20.90, 2), 0) FROM acessos a JOIN profiles p ON p.id = a.user_id WHERE a.status = 'aprovado' AND p.is_vip = false),
    'active_sessions',   (SELECT row_to_json(t) FROM (SELECT * FROM admin_active_sessions) t),
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
-- 2. RPCs para gerenciar tickets de suporte
-- ============================================================

-- Resolver / reabrir ticket
CREATE OR REPLACE FUNCTION admin_update_ticket_status(p_ticket_id BIGINT, p_status TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE suporte SET status = p_status WHERE id = p_ticket_id;
END;
$$;

-- Excluir ticket
CREATE OR REPLACE FUNCTION admin_delete_ticket(p_ticket_id BIGINT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM suporte WHERE id = p_ticket_id;
END;
$$;

-- ============================================================
-- 3. RPC para excluir usuario (dados locais, auth via edge fn)
-- ============================================================

CREATE OR REPLACE FUNCTION admin_delete_user_data(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Prevent deleting self
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Nao pode excluir a si mesmo';
  END IF;

  -- Delete all related data
  DELETE FROM sessoes_ativas WHERE user_id = p_user_id;
  DELETE FROM progresso WHERE user_id = p_user_id;
  DELETE FROM acessos WHERE user_id = p_user_id;
  DELETE FROM suporte WHERE user_id = p_user_id;
  DELETE FROM eventos WHERE user_id = p_user_id;
  DELETE FROM profiles WHERE id = p_user_id;
END;
$$;

-- ========================================================================
-- Admin Dashboard: Events table + Metrics views + RPC
-- Execute in Supabase Dashboard -> SQL Editor
-- ========================================================================

-- 1. Events table
CREATE TABLE IF NOT EXISTS eventos (
  id         BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type       TEXT NOT NULL,
  meta       JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_eventos_created ON eventos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eventos_type    ON eventos(type);
CREATE INDEX IF NOT EXISTS idx_eventos_user    ON eventos(user_id);

ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own events"
  ON eventos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin reads all events"
  ON eventos FOR SELECT
  USING (auth.jwt() ->> 'email' = 'marcuscapobiangomed@gmail.com');

-- 2. Helper function
CREATE OR REPLACE FUNCTION jsonb_object_keys_count(j JSONB)
RETURNS INTEGER LANGUAGE sql IMMUTABLE
AS $$ SELECT count(*)::integer FROM jsonb_object_keys(j) $$;

-- 3. Views
CREATE OR REPLACE VIEW admin_user_growth AS
SELECT date_trunc('day', created_at)::date AS day, count(*) AS signups
FROM profiles WHERE created_at >= now() - interval '30 days'
GROUP BY 1 ORDER BY 1;

CREATE OR REPLACE VIEW admin_conversion_funnel AS
SELECT materia,
  count(*) FILTER (WHERE status = 'trial')    AS trials,
  count(*) FILTER (WHERE status = 'pending')  AS pending,
  count(*) FILTER (WHERE status = 'aprovado') AS paid
FROM acessos GROUP BY materia;

CREATE OR REPLACE VIEW admin_active_sessions AS
SELECT
  count(*) AS total_sessions,
  count(*) FILTER (WHERE last_seen > now() - interval '5 minutes') AS active_now,
  count(*) FILTER (WHERE last_seen > now() - interval '1 hour')    AS active_1h
FROM sessoes_ativas;

CREATE OR REPLACE VIEW admin_expiring_trials AS
SELECT a.user_id, p.nome, p.email, a.materia, a.trial_expires_at,
  round(EXTRACT(EPOCH FROM (a.trial_expires_at - now())) / 3600) AS hours_remaining
FROM acessos a JOIN profiles p ON p.id = a.user_id
WHERE a.status = 'trial' AND a.trial_expires_at BETWEEN now() AND now() + interval '3 days'
ORDER BY a.trial_expires_at;

CREATE OR REPLACE VIEW admin_revenue AS
SELECT materia, count(*) AS total_sales, round(count(*) * 9.90, 2) AS revenue_brl
FROM acessos WHERE status = 'aprovado' GROUP BY materia;

CREATE OR REPLACE VIEW admin_engagement AS
SELECT pr.materia, count(DISTINCT pr.user_id) AS users_with_progress,
  round(avg(jsonb_object_keys_count(pr.completed)), 1) AS avg_completed
FROM progresso pr GROUP BY pr.materia;

CREATE OR REPLACE VIEW admin_devices AS
SELECT
  CASE
    WHEN device_info ILIKE '%iphone%' OR device_info ILIKE '%ipad%' THEN 'iOS'
    WHEN device_info ILIKE '%android%' THEN 'Android'
    WHEN device_info ILIKE '%macintosh%' THEN 'Mac'
    WHEN device_info ILIKE '%windows%' THEN 'Windows'
    ELSE 'Other'
  END AS device,
  count(*) AS sessions
FROM sessoes_ativas GROUP BY 1 ORDER BY 2 DESC;

CREATE OR REPLACE VIEW admin_recent_events AS
SELECT e.id, e.created_at, e.type, e.meta,
  p.nome AS user_name, p.email AS user_email
FROM eventos e LEFT JOIN profiles p ON p.id = e.user_id
ORDER BY e.created_at DESC LIMIT 50;

-- 4. RPC function (single call, all data)
CREATE OR REPLACE FUNCTION admin_dashboard_data()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE result JSONB;
BEGIN
  IF auth.jwt() ->> 'email' IS DISTINCT FROM 'marcuscapobiangomed@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'total_users',       (SELECT count(*) FROM profiles),
    'total_paid',        (SELECT count(DISTINCT user_id) FROM acessos WHERE status = 'aprovado'),
    'total_revenue',     (SELECT coalesce(round(count(*) * 9.90, 2), 0) FROM acessos WHERE status = 'aprovado'),
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

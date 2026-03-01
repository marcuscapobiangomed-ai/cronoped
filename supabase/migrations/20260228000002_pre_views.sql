-- ============================================================
-- Cronograma 2026.1 (cronopre): PARTE 2 - Views (Admin Dashboard)
-- ============================================================

CREATE OR REPLACE VIEW pre_admin_user_growth AS
SELECT date_trunc('day', created_at)::date AS day, count(*) AS signups
FROM pre_profiles WHERE created_at >= now() - interval '30 days'
GROUP BY 1 ORDER BY 1;

CREATE OR REPLACE VIEW pre_admin_conversion_funnel AS
SELECT a.materia,
  count(*) FILTER (WHERE a.status = 'trial')    AS trials,
  count(*) FILTER (WHERE a.status = 'pending')  AS pending,
  count(*) FILTER (WHERE a.status = 'aprovado' AND p.is_vip = false AND a.mp_payment_id IS NOT NULL) AS paid
FROM pre_acessos a
JOIN pre_profiles p ON p.id = a.user_id
GROUP BY a.materia;

CREATE OR REPLACE VIEW pre_admin_active_sessions AS
SELECT
  count(*) AS total_sessions,
  count(*) FILTER (WHERE last_seen > now() - interval '5 minutes') AS active_now,
  count(*) FILTER (WHERE last_seen > now() - interval '1 hour')    AS active_1h
FROM pre_sessoes_ativas;

CREATE OR REPLACE VIEW pre_admin_expiring_trials AS
SELECT
  a.user_id,
  p.nome,
  p.email,
  a.materia,
  a.grupo,
  a.trial_expires_at,
  round(EXTRACT(EPOCH FROM (a.trial_expires_at - now())) / 3600) AS hours_remaining,
  CASE
    WHEN a.trial_expires_at > now() THEN 'ativo'
    ELSE 'expirado'
  END AS trial_status
FROM pre_acessos a
JOIN pre_profiles p ON p.id = a.user_id
WHERE a.status = 'trial'
  AND a.trial_expires_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM pre_acessos a2
    WHERE a2.user_id = a.user_id
      AND a2.materia = a.materia
      AND a2.status = 'aprovado'
  )
ORDER BY
  CASE WHEN a.trial_expires_at > now() THEN 0 ELSE 1 END,
  a.trial_expires_at DESC;

CREATE OR REPLACE VIEW pre_admin_revenue AS
SELECT a.materia, count(*) AS total_sales, coalesce(sum(a.valor_pago), 0) AS revenue_brl
FROM pre_acessos a
JOIN pre_profiles p ON p.id = a.user_id
WHERE a.status = 'aprovado' AND p.is_vip = false AND a.mp_payment_id IS NOT NULL
GROUP BY a.materia;

CREATE OR REPLACE VIEW pre_admin_engagement AS
SELECT pr.materia, count(DISTINCT pr.user_id) AS users_with_progress,
  round(avg(jsonb_object_keys_count(pr.completed)), 1) AS avg_completed
FROM pre_progresso pr GROUP BY pr.materia;

CREATE OR REPLACE VIEW pre_admin_devices AS
SELECT
  CASE
    WHEN device_info ILIKE '%iphone%' OR device_info ILIKE '%ipad%' THEN 'iOS'
    WHEN device_info ILIKE '%android%' THEN 'Android'
    WHEN device_info ILIKE '%macintosh%' THEN 'Mac'
    WHEN device_info ILIKE '%windows%' THEN 'Windows'
    ELSE 'Other'
  END AS device,
  count(*) AS sessions
FROM pre_sessoes_ativas GROUP BY 1 ORDER BY 2 DESC;

CREATE OR REPLACE VIEW pre_admin_recent_events AS
SELECT e.id, e.created_at, e.type, e.meta,
  p.nome AS user_name, p.email AS user_email
FROM pre_eventos e LEFT JOIN pre_profiles p ON p.id = e.user_id
ORDER BY e.created_at DESC LIMIT 50;

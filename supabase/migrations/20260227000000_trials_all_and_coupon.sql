-- ============================================================
-- Trials: mostrar TODOS (ativos + expirados) no admin panel
-- + coluna grupo e trial_status para cupom de desconto
-- ============================================================

DROP VIEW IF EXISTS admin_expiring_trials;
CREATE VIEW admin_expiring_trials AS
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
FROM acessos a
JOIN profiles p ON p.id = a.user_id
WHERE a.status = 'trial'
  AND a.trial_expires_at IS NOT NULL
  -- Excluir quem já pagou pela MESMA matéria
  AND NOT EXISTS (
    SELECT 1 FROM acessos a2
    WHERE a2.user_id = a.user_id
      AND a2.materia = a.materia
      AND a2.status = 'aprovado'
  )
ORDER BY
  -- Ativos primeiro, depois expirados (mais recentes primeiro)
  CASE WHEN a.trial_expires_at > now() THEN 0 ELSE 1 END,
  a.trial_expires_at DESC;

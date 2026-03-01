-- ============================================================
-- Flag trial_used_at em profiles para rastrear uso de trial
-- Mesmo que o registro de acessos seja deletado, a flag persiste
-- ============================================================

-- 1. Adicionar coluna
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_used_at timestamptz DEFAULT NULL;

-- 2. Backfill: marcar quem já usou trial (via eventos ou acessos existentes)
UPDATE profiles SET trial_used_at = sub.used_at
FROM (
  -- Quem tem registro trial em acessos (ativo ou expirado)
  SELECT user_id, min(created_at) AS used_at
  FROM acessos WHERE status = 'trial'
  GROUP BY user_id
  UNION
  -- Quem tem evento trial_activated (mais confiável, sobrevive a DELETEs)
  SELECT user_id, min(created_at) AS used_at
  FROM eventos WHERE type = 'trial_activated' AND user_id IS NOT NULL
  GROUP BY user_id
) sub
WHERE profiles.id = sub.user_id
  AND profiles.trial_used_at IS NULL;

-- 3. Recriar activate_trial com validação pela flag
CREATE OR REPLACE FUNCTION activate_trial(p_materia text, p_grupo integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validar: nunca usou trial antes (flag permanente)
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND trial_used_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Seu trial gratuito já foi utilizado. Adquira o acesso para continuar.';
  END IF;

  -- Validar: não pode ter acesso pago nessa matéria
  IF EXISTS (
    SELECT 1 FROM acessos
    WHERE user_id = auth.uid()
      AND materia = p_materia
      AND status = 'aprovado'
  ) THEN
    RAISE EXCEPTION 'Você já tem acesso pago a esta matéria.';
  END IF;

  -- Marcar flag de trial usado
  UPDATE profiles SET trial_used_at = now() WHERE id = auth.uid();

  -- Criar trial (3 dias)
  INSERT INTO acessos (user_id, materia, grupo, status, trial_expires_at)
    VALUES (auth.uid(), p_materia, p_grupo, 'trial', now() + interval '3 days')
    ON CONFLICT (user_id, materia)
    DO UPDATE SET
      grupo = EXCLUDED.grupo,
      status = 'trial',
      trial_expires_at = now() + interval '3 days'
    WHERE acessos.status != 'aprovado';
END;
$$;

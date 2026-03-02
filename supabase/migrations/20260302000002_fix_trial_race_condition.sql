-- Fix race condition: concurrent trial activations bypass IF EXISTS checks
-- Solution: SELECT FOR UPDATE on profiles row to serialize concurrent requests
-- This ensures only ONE trial can be activated per user, ever.

-- ============ CRONOPED (activate_trial) ============
CREATE OR REPLACE FUNCTION activate_trial(p_materia text, p_grupo integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Lock user row to prevent concurrent trial activations
  PERFORM 1 FROM profiles WHERE id = auth.uid() FOR UPDATE;

  -- Check: no trial ever used (active or expired)
  IF EXISTS (
    SELECT 1 FROM acessos
    WHERE user_id = auth.uid()
      AND status = 'trial'
  ) THEN
    RAISE EXCEPTION 'Seu trial gratuito já foi utilizado. Adquira o acesso para continuar.';
  END IF;

  -- Check: no paid access for this subject
  IF EXISTS (
    SELECT 1 FROM acessos
    WHERE user_id = auth.uid()
      AND materia = p_materia
      AND status = 'aprovado'
  ) THEN
    RAISE EXCEPTION 'Você já tem acesso pago a esta matéria.';
  END IF;

  -- Create trial (3 days)
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

-- ============ CRONOPRE (pre_activate_trial) ============
CREATE OR REPLACE FUNCTION pre_activate_trial(p_materia text, p_grupo integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Lock user row to prevent concurrent trial activations
  PERFORM 1 FROM pre_profiles WHERE id = auth.uid() FOR UPDATE;

  -- Check: trial_used_at flag
  IF EXISTS (
    SELECT 1 FROM pre_profiles
    WHERE id = auth.uid()
      AND trial_used_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Seu trial gratuito já foi utilizado. Adquira o acesso para continuar.';
  END IF;

  -- Check: no paid access for this subject
  IF EXISTS (
    SELECT 1 FROM pre_acessos
    WHERE user_id = auth.uid()
      AND materia = p_materia
      AND status = 'aprovado'
  ) THEN
    RAISE EXCEPTION 'Você já tem acesso pago a esta matéria.';
  END IF;

  -- Set flag FIRST (within lock, no race possible)
  UPDATE pre_profiles SET trial_used_at = now() WHERE id = auth.uid();

  -- Create trial
  INSERT INTO pre_acessos (user_id, materia, grupo, status, trial_expires_at)
    VALUES (auth.uid(), p_materia, p_grupo, 'trial', now() + interval '3 days')
    ON CONFLICT (user_id, materia)
    DO UPDATE SET
      grupo = EXCLUDED.grupo,
      status = 'trial',
      trial_expires_at = now() + interval '3 days'
    WHERE pre_acessos.status != 'aprovado';
END;
$$;

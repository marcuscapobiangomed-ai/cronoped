CREATE OR REPLACE FUNCTION pre_activate_trial(p_materia text, p_grupo integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pre_profiles
    WHERE id = auth.uid()
      AND trial_used_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Seu trial gratuito já foi utilizado. Adquira o acesso para continuar.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pre_acessos
    WHERE user_id = auth.uid()
      AND materia = p_materia
      AND status = 'aprovado'
  ) THEN
    RAISE EXCEPTION 'Você já tem acesso pago a esta matéria.';
  END IF;

  UPDATE pre_profiles SET trial_used_at = now() WHERE id = auth.uid();

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

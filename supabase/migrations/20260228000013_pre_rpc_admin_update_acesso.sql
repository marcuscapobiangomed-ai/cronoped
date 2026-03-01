CREATE OR REPLACE FUNCTION pre_admin_update_acesso(
  p_user_id UUID,
  p_materia TEXT,
  p_status TEXT,
  p_grupo INTEGER DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pre_profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_status = 'remover' THEN
    DELETE FROM pre_acessos WHERE user_id = p_user_id AND materia = p_materia;
  ELSE
    INSERT INTO pre_acessos (user_id, materia, grupo, status, trial_expires_at)
    VALUES (
      p_user_id, p_materia, p_grupo, p_status,
      CASE WHEN p_status = 'trial' THEN NOW() + interval '7 days' ELSE NULL END
    )
    ON CONFLICT (user_id, materia) DO UPDATE SET
      status = EXCLUDED.status,
      grupo = EXCLUDED.grupo,
      trial_expires_at = EXCLUDED.trial_expires_at;
  END IF;
END;
$$;

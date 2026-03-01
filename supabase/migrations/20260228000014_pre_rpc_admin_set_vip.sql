CREATE OR REPLACE FUNCTION pre_admin_set_vip(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  m TEXT;
  materias TEXT[] := ARRAY['pre2','pre3','pre4','pre5','pre6','pre7','pre8'];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pre_profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE pre_profiles SET is_vip = true WHERE id = p_user_id;

  FOREACH m IN ARRAY materias LOOP
    INSERT INTO pre_acessos (user_id, materia, grupo, status)
    VALUES (p_user_id, m, 1, 'aprovado')
    ON CONFLICT (user_id, materia)
    DO UPDATE SET status = 'aprovado', trial_expires_at = NULL;
  END LOOP;
END;
$$;

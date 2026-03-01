CREATE OR REPLACE FUNCTION pre_admin_update_profile(
  p_user_id UUID,
  p_nome    TEXT DEFAULT NULL,
  p_email   TEXT DEFAULT NULL,
  p_cpf     TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pre_profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  UPDATE pre_profiles SET
    nome  = COALESCE(p_nome, nome),
    email = COALESCE(p_email, email),
    cpf   = COALESCE(p_cpf, cpf)
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION pre_set_referral_code(p_code TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  clean_code TEXT;
BEGIN
  clean_code := lower(trim(p_code));

  IF clean_code !~ '^[a-z0-9][a-z0-9\-]{1,18}[a-z0-9]$' THEN
    RAISE EXCEPTION 'Código inválido. Use 3-20 caracteres (letras, números e hífen).';
  END IF;

  IF EXISTS (SELECT 1 FROM pre_profiles WHERE referral_code = clean_code AND id != auth.uid()) THEN
    RAISE EXCEPTION 'Este código já está em uso. Escolha outro.';
  END IF;

  UPDATE pre_profiles SET referral_code = clean_code WHERE id = auth.uid();
END;
$$;

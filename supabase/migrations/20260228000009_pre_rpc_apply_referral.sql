CREATE OR REPLACE FUNCTION pre_apply_referral(p_code TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  clean_code TEXT;
  referrer_id UUID;
BEGIN
  clean_code := lower(trim(p_code));

  SELECT id INTO referrer_id FROM pre_profiles WHERE referral_code = clean_code;
  IF referrer_id IS NULL THEN RETURN; END IF;
  IF referrer_id = auth.uid() THEN RETURN; END IF;

  UPDATE pre_profiles SET referred_by = clean_code
    WHERE id = auth.uid() AND referred_by IS NULL;
END;
$$;

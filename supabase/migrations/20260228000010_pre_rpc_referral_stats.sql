CREATE OR REPLACE FUNCTION pre_get_referral_stats()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  my_code TEXT;
  result JSONB;
BEGIN
  SELECT referral_code INTO my_code FROM pre_profiles WHERE id = auth.uid();

  IF my_code IS NULL THEN
    RETURN jsonb_build_object('code', null, 'total_indicados', 0, 'total_pagantes', 0, 'comissao_total', 0, 'comissao_pendente', 0);
  END IF;

  SELECT jsonb_build_object(
    'code', my_code,
    'total_indicados', (SELECT count(*) FROM pre_profiles WHERE referred_by = my_code),
    'total_pagantes', (SELECT count(DISTINCT referred_user_id) FROM pre_affiliate_commissions WHERE affiliate_user_id = auth.uid()),
    'comissao_total', (SELECT coalesce(sum(comissao_valor), 0) FROM pre_affiliate_commissions WHERE affiliate_user_id = auth.uid()),
    'comissao_pendente', (SELECT coalesce(sum(comissao_valor), 0) FROM pre_affiliate_commissions WHERE affiliate_user_id = auth.uid() AND status = 'pendente')
  ) INTO result;

  RETURN result;
END;
$$;

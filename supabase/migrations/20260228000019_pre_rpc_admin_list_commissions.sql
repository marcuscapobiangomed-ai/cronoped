CREATE OR REPLACE FUNCTION pre_admin_list_commissions(p_affiliate_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pre_profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id,
      'referred_nome', p.nome,
      'referred_email', p.email,
      'materia', c.materia,
      'valor_venda', c.valor_venda,
      'comissao_pct', c.comissao_pct,
      'comissao_valor', c.comissao_valor,
      'status', c.status,
      'created_at', c.created_at
    ) ORDER BY c.created_at DESC), '[]')
    FROM pre_affiliate_commissions c
    JOIN pre_profiles p ON p.id = c.referred_user_id
    WHERE c.affiliate_user_id = p_affiliate_id
  );
END;
$$;

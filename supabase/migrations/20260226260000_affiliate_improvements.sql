-- ============================================================
-- Melhorias no sistema de afiliados:
-- 1. UNIQUE constraint para prevenir comissão duplicada
-- 2. RPC admin_list_commissions para ver detalhes de comissões
-- 3. admin_list_users atualizado com referred_by e is_vip
-- ============================================================

-- 1. UNIQUE constraint: mesma pessoa não ganha 2 comissões pela mesma matéria do mesmo indicado
--    (previne duplicidade no webhook)
ALTER TABLE affiliate_commissions
  ADD CONSTRAINT uq_commission_per_user_materia UNIQUE (referred_user_id, materia);

-- 2. RPC: admin lista comissões individuais de um afiliado
CREATE OR REPLACE FUNCTION admin_list_commissions(p_affiliate_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
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
    FROM affiliate_commissions c
    JOIN profiles p ON p.id = c.referred_user_id
    WHERE c.affiliate_user_id = p_affiliate_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_list_commissions(UUID) TO authenticated;

-- 3. admin_list_users agora inclui referred_by e is_vip
CREATE OR REPLACE FUNCTION admin_list_users()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN (
    SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]')
    FROM (
      SELECT
        p.id,
        p.nome,
        p.email,
        p.cpf,
        p.is_vip,
        p.referred_by,
        p.created_at,
        (
          SELECT coalesce(jsonb_agg(jsonb_build_object(
            'materia', a.materia,
            'grupo', a.grupo,
            'status', a.status,
            'trial_expires_at', a.trial_expires_at
          )), '[]')
          FROM acessos a WHERE a.user_id = p.id
        ) AS acessos
      FROM profiles p
      ORDER BY p.created_at DESC
    ) t
  );
END;
$$;

-- ============================================================
-- Cronograma 2026.1 (cronopre): PARTE 3 - RPCs
-- ============================================================

-- 5.1 check_cpf_disponivel (LANGUAGE sql - single statement)
CREATE OR REPLACE FUNCTION pre_check_cpf_disponivel(p_cpf text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM pre_profiles WHERE cpf = p_cpf);
$$;

GRANT EXECUTE ON FUNCTION pre_check_cpf_disponivel(text) TO authenticated;

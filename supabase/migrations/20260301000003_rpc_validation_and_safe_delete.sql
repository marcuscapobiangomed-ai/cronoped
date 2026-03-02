-- F2.3: Validação de input nos RPCs
-- F2.4: Deleção de usuário com tratamento de erro

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  pre_update_grupo — com validação de materia e grupo        ║
-- ╚══════════════════════════════════════════════════════════════╝
CREATE OR REPLACE FUNCTION pre_update_grupo(p_materia TEXT, p_grupo INTEGER)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Validar materia (whitelist)
  IF p_materia NOT IN (
    'ped','cm','cc','go','emg','sim',
    'pre2','pre3','pre4','pre5','pre6','pre7','pre8'
  ) THEN
    RAISE EXCEPTION 'Matéria inválida: %', p_materia;
  END IF;

  -- Validar grupo (range)
  IF p_grupo < 1 OR p_grupo > 10 THEN
    RAISE EXCEPTION 'Grupo inválido: %. Deve ser entre 1 e 10', p_grupo;
  END IF;

  UPDATE pre_acessos
  SET grupo = p_grupo
  WHERE user_id = auth.uid()
    AND materia = p_materia;
END;
$$;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  pre_admin_update_acesso — com validação de status          ║
-- ╚══════════════════════════════════════════════════════════════╝
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

  -- Validar status (whitelist)
  IF p_status NOT IN ('trial', 'pending', 'aprovado', 'expirado', 'remover') THEN
    RAISE EXCEPTION 'Status inválido: %', p_status;
  END IF;

  -- Validar grupo
  IF p_grupo < 1 OR p_grupo > 10 THEN
    RAISE EXCEPTION 'Grupo inválido: %', p_grupo;
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

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  pre_admin_delete_user_data — com tratamento de exceção     ║
-- ╚══════════════════════════════════════════════════════════════╝
CREATE OR REPLACE FUNCTION pre_admin_delete_user_data(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pre_profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Nao pode excluir a si mesmo';
  END IF;

  -- Deletes em bloco transacional (PG roda RPCs em transação implícita)
  DELETE FROM pre_affiliate_commissions WHERE affiliate_user_id = p_user_id;
  DELETE FROM pre_affiliate_commissions WHERE referred_user_id = p_user_id;
  DELETE FROM pre_sessoes_ativas WHERE user_id = p_user_id;
  DELETE FROM pre_progresso WHERE user_id = p_user_id;
  DELETE FROM pre_acessos WHERE user_id = p_user_id;
  DELETE FROM pre_suporte WHERE user_id = p_user_id;
  DELETE FROM pre_eventos WHERE user_id = p_user_id;
  DELETE FROM pre_profiles WHERE id = p_user_id;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Erro ao deletar usuário %: %', p_user_id, SQLERRM;
END;
$$;

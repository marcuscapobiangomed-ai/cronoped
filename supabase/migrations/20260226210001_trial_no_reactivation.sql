-- Corrigir brecha: impedir re-ativação de trial após expirar
-- Antes: só verificava trials ATIVOS (trial_expires_at > now())
-- Agora: verifica se já usou trial alguma vez (qualquer matéria)

CREATE OR REPLACE FUNCTION activate_trial(p_materia text, p_grupo integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validar: não pode ter trial ativo em NENHUMA matéria
  IF EXISTS (
    SELECT 1 FROM acessos
    WHERE user_id = auth.uid()
      AND status = 'trial'
      AND trial_expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Você já tem um trial ativo. Só é possível testar 1 matéria por vez.';
  END IF;

  -- Validar: não pode já ter USADO um trial (expirado ou ativo)
  IF EXISTS (
    SELECT 1 FROM acessos
    WHERE user_id = auth.uid()
      AND status = 'trial'
      AND trial_expires_at IS NOT NULL
      AND trial_expires_at <= now()
  ) THEN
    RAISE EXCEPTION 'Seu trial gratuito já foi utilizado. Adquira o acesso para continuar.';
  END IF;

  -- Validar: não pode ter acesso pago nessa matéria
  IF EXISTS (
    SELECT 1 FROM acessos
    WHERE user_id = auth.uid()
      AND materia = p_materia
      AND status = 'aprovado'
  ) THEN
    RAISE EXCEPTION 'Você já tem acesso pago a esta matéria.';
  END IF;

  -- Criar trial (3 dias)
  INSERT INTO acessos (user_id, materia, grupo, status, trial_expires_at)
    VALUES (auth.uid(), p_materia, p_grupo, 'trial', now() + interval '3 days')
    ON CONFLICT (user_id, materia)
    DO UPDATE SET
      grupo = EXCLUDED.grupo,
      status = 'trial',
      trial_expires_at = now() + interval '3 days'
    WHERE acessos.status != 'aprovado';
END;
$$;

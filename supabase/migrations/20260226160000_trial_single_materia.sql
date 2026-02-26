-- Trial: 3 dias, apenas 1 matéria + 1 grupo por usuário
-- Altera trigger para NÃO criar trials automáticos (exceto VIP)
-- Cria RPC activate_trial para o frontend chamar

-- 1. Alterar trigger: VIP mantém auto-approve, regular não cria nada
CREATE OR REPLACE FUNCTION handle_new_user_with_vip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  materias text[] := ARRAY['ped','cm','go','cc','emg','sim'];
  vip_emails text[] := ARRAY[
    'marcuscapobiangomed@gmail.com',
    'lucasgrmed@gmail.com',
    'tifer134@gmail.com',
    'jgmed107@gmail.com',
    'luizgabrielcamposlobog@gmail.com',
    'emanoelfernandes.f.s.f@gmail.com',
    'lauraoppelt23@gmail.com',
    'anaisabella9x2limamartins@gmail.com',
    'isabelamoraisg@hotmail.com'
  ];
  m text;
BEGIN
  -- Apenas VIP recebe acesso automático
  IF NEW.email = ANY(vip_emails) THEN
    FOREACH m IN ARRAY materias LOOP
      INSERT INTO acessos (user_id, materia, grupo, status, trial_expires_at)
        VALUES (NEW.id, m, 1, 'aprovado', NULL)
        ON CONFLICT (user_id, materia) DO NOTHING;
    END LOOP;
  END IF;
  -- Usuários regulares: nenhum acessos criado (escolhem no dashboard)
  RETURN NEW;
END;
$$;

-- 2. RPC para ativar trial (chamado pelo frontend)
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

  -- Validar: não pode ter acesso pago nessa matéria
  IF EXISTS (
    SELECT 1 FROM acessos
    WHERE user_id = auth.uid()
      AND materia = p_materia
      AND status = 'aprovado'
  ) THEN
    RAISE EXCEPTION 'Você já tem acesso pago a esta matéria.';
  END IF;

  -- Criar ou atualizar trial (3 dias)
  INSERT INTO acessos (user_id, materia, grupo, status, trial_expires_at)
    VALUES (auth.uid(), p_materia, p_grupo, 'trial', now() + interval '3 days')
    ON CONFLICT (user_id, materia)
    DO UPDATE SET
      grupo = EXCLUDED.grupo,
      status = 'trial',
      trial_expires_at = now() + interval '3 days'
    WHERE acessos.status != 'aprovado'; -- nunca sobrescrever pago
END;
$$;

GRANT EXECUTE ON FUNCTION activate_trial(text, integer) TO authenticated;

-- 3. Limpar trials expirados de usuários existentes (liberar para novo trial)
DELETE FROM acessos
WHERE status = 'trial'
  AND trial_expires_at < now();

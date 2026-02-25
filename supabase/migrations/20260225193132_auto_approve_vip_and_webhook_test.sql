-- Auto-aprova acessos para emails VIP recém-cadastrados
-- Chamada automaticamente pelo trigger on_new_user (se existir) ou manualmente

CREATE OR REPLACE FUNCTION auto_approve_vip(p_user_id uuid, p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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
  materias text[] := ARRAY['ped','cm','go','cc','emg','sim'];
  m text;
BEGIN
  IF p_email = ANY(vip_emails) THEN
    FOREACH m IN ARRAY materias LOOP
      INSERT INTO acessos (user_id, materia, grupo, status)
        VALUES (p_user_id, m, 1, 'aprovado')
        ON CONFLICT (user_id, materia)
        DO UPDATE SET status = 'aprovado';
    END LOOP;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION auto_approve_vip(uuid, text) TO service_role;

-- Função auxiliar: verifica se trigger on_new_user existe e adiciona chamada VIP
-- (só atualiza se o trigger já existe)
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
  acesso_status text;
  trial_end timestamptz;
BEGIN
  trial_end := now() + interval '7 days';

  FOREACH m IN ARRAY materias LOOP
    IF NEW.email = ANY(vip_emails) THEN
      acesso_status := 'aprovado';
    ELSE
      acesso_status := 'trial';
    END IF;

    INSERT INTO acessos (user_id, materia, grupo, status, trial_expires_at)
      VALUES (NEW.id, m, 1, acesso_status, CASE WHEN acesso_status = 'trial' THEN trial_end ELSE NULL END)
      ON CONFLICT (user_id, materia) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Recriar o trigger para usar a nova função com suporte VIP
DROP TRIGGER IF EXISTS on_new_user ON auth.users;
CREATE TRIGGER on_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_with_vip();

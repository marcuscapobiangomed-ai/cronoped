-- Backfill: criar acessos trial para usuários existentes que não têm registros
-- VIPs recebem status 'aprovado', demais recebem 'trial' (expirado = precisam pagar)

DO $$
DECLARE
  u record;
  m text;
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
  acesso_status text;
  trial_end timestamptz;
BEGIN
  FOR u IN SELECT id, email FROM auth.users LOOP
    -- Dar 7 dias de trial a partir de agora para usuários existentes
    trial_end := NOW() + interval '7 days';

    FOREACH m IN ARRAY materias LOOP
      IF u.email = ANY(vip_emails) THEN
        acesso_status := 'aprovado';
      ELSE
        acesso_status := 'trial';
      END IF;

      INSERT INTO acessos (user_id, materia, grupo, status, trial_expires_at)
        VALUES (
          u.id,
          m,
          1,
          acesso_status,
          CASE WHEN acesso_status = 'trial' THEN trial_end ELSE NULL END
        )
        ON CONFLICT (user_id, materia) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;

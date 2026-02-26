-- ============================================================
-- 1. Fix trigger: VIP signup deve setar profiles.is_vip = true
-- ============================================================
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
  -- VIP: acesso automático + flag no profile
  IF NEW.email = ANY(vip_emails) THEN
    -- Setar is_vip no profile (pode não existir ainda, então aguarda trigger do profile)
    UPDATE profiles SET is_vip = true WHERE id = NEW.id;

    FOREACH m IN ARRAY materias LOOP
      INSERT INTO acessos (user_id, materia, grupo, status, trial_expires_at)
        VALUES (NEW.id, m, 1, 'aprovado', NULL)
        ON CONFLICT (user_id, materia) DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. Backfill: garantir que TODOS os VIP emails têm is_vip = true
--    (pega quem se cadastrou depois do backfill anterior)
-- ============================================================
UPDATE profiles SET is_vip = true WHERE email IN (
  'marcuscapobiangomed@gmail.com',
  'lucasgrmed@gmail.com',
  'tifer134@gmail.com',
  'jgmed107@gmail.com',
  'luizgabrielcamposlobog@gmail.com',
  'emanoelfernandes.f.s.f@gmail.com',
  'lauraoppelt23@gmail.com',
  'anaisabella9x2limamartins@gmail.com',
  'isabelamoraisg@hotmail.com'
);

-- ============================================================
-- 3. Fix admin_update_acesso: trial deve ser 3 dias (não 7)
-- ============================================================
CREATE OR REPLACE FUNCTION admin_update_acesso(
  p_user_id UUID,
  p_materia TEXT,
  p_status TEXT,
  p_grupo INTEGER DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_status = 'remover' THEN
    DELETE FROM acessos WHERE user_id = p_user_id AND materia = p_materia;
  ELSE
    INSERT INTO acessos (user_id, materia, grupo, status, trial_expires_at)
    VALUES (
      p_user_id, p_materia, p_grupo, p_status,
      CASE WHEN p_status = 'trial' THEN NOW() + interval '3 days' ELSE NULL END
    )
    ON CONFLICT (user_id, materia) DO UPDATE SET
      status = EXCLUDED.status,
      grupo = EXCLUDED.grupo,
      trial_expires_at = EXCLUDED.trial_expires_at;
  END IF;
END;
$$;

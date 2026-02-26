-- ============================================================
-- 1. Adicionar colunas is_vip e is_admin na tabela profiles
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_vip   BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin  BOOLEAN DEFAULT false;

-- Backfill VIP a partir da lista hardcoded FREE_EMAILS
UPDATE profiles SET is_vip = true WHERE email IN (
  'lucasgrmed@gmail.com',
  'tifer134@gmail.com',
  'jgmed107@gmail.com',
  'luizgabrielcamposlobog@gmail.com',
  'emanoelfernandes.f.s.f@gmail.com',
  'lauraoppelt23@gmail.com',
  'anaisabella9x2limamartins@gmail.com',
  'isabelamoraisg@hotmail.com'
);

-- Backfill admin
UPDATE profiles SET is_admin = true WHERE email = 'marcuscapobiangomed@gmail.com';

-- ============================================================
-- 2. Atualizar RPCs admin para checar profiles.is_admin
-- ============================================================

-- 2a. admin_dashboard_data
CREATE OR REPLACE FUNCTION admin_dashboard_data()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE result JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'total_users',       (SELECT count(*) FROM profiles),
    'total_paid',        (SELECT count(DISTINCT user_id) FROM acessos WHERE status = 'aprovado'),
    'total_revenue',     (SELECT coalesce(round(count(*) * 20.90, 2), 0) FROM acessos WHERE status = 'aprovado'),
    'active_sessions',   (SELECT row_to_json(t) FROM (SELECT * FROM admin_active_sessions) t),
    'user_growth',       (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM admin_user_growth) t),
    'conversion_funnel', (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM admin_conversion_funnel) t),
    'revenue',           (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM admin_revenue) t),
    'expiring_trials',   (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM admin_expiring_trials) t),
    'devices',           (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM admin_devices) t),
    'recent_events',     (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM admin_recent_events) t),
    'engagement',        (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (SELECT * FROM admin_engagement) t),
    'support_tickets',   (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') FROM (
      SELECT id, created_at, nome, email, assunto, mensagem, status
      FROM suporte ORDER BY created_at DESC LIMIT 50
    ) t)
  ) INTO result;

  RETURN result;
END;
$$;

-- 2b. admin_list_users
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
        p.is_admin,
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

-- 2c. admin_update_acesso
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
      CASE WHEN p_status = 'trial' THEN NOW() + interval '7 days' ELSE NULL END
    )
    ON CONFLICT (user_id, materia) DO UPDATE SET
      status = EXCLUDED.status,
      grupo = EXCLUDED.grupo,
      trial_expires_at = EXCLUDED.trial_expires_at;
  END IF;
END;
$$;

-- 2d. admin_set_vip
CREATE OR REPLACE FUNCTION admin_set_vip(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  m TEXT;
  materias TEXT[] := ARRAY['ped','cm','go','cc','emg','sim'];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Marcar como VIP no profile
  UPDATE profiles SET is_vip = true WHERE id = p_user_id;

  -- Dar acesso aprovado em todas as materias
  FOREACH m IN ARRAY materias LOOP
    INSERT INTO acessos (user_id, materia, grupo, status)
    VALUES (p_user_id, m, 1, 'aprovado')
    ON CONFLICT (user_id, materia)
    DO UPDATE SET status = 'aprovado', trial_expires_at = NULL;
  END LOOP;
END;
$$;

-- ============================================================
-- 3. Atualizar RLS policies que usavam email hardcoded
-- ============================================================

-- 3a. eventos: admin reads
DROP POLICY IF EXISTS "Admin reads all events" ON eventos;
CREATE POLICY "Admin reads all events" ON eventos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 3b. suporte: admin reads
DROP POLICY IF EXISTS "Admin select all" ON suporte;
CREATE POLICY "Admin select all" ON suporte
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Permitir que usuarios vejam seus proprios tickets
DROP POLICY IF EXISTS "Users select own tickets" ON suporte;
CREATE POLICY "Users select own tickets" ON suporte
  FOR SELECT USING (auth.uid() = user_id);


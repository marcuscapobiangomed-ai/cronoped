-- RPC: listar todos os usuários com seus acessos
CREATE OR REPLACE FUNCTION admin_list_users()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.jwt() ->> 'email' IS DISTINCT FROM 'marcuscapobiangomed@gmail.com' THEN
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

GRANT EXECUTE ON FUNCTION admin_list_users() TO authenticated;

-- RPC: atualizar acesso de um usuário para uma matéria específica
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
  IF auth.jwt() ->> 'email' IS DISTINCT FROM 'marcuscapobiangomed@gmail.com' THEN
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

GRANT EXECUTE ON FUNCTION admin_update_acesso(UUID, TEXT, TEXT, INTEGER) TO authenticated;

-- RPC: dar VIP (aprovado em todas as matérias) para um usuário
CREATE OR REPLACE FUNCTION admin_set_vip(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  m TEXT;
  materias TEXT[] := ARRAY['ped','cm','go','cc','emg','sim'];
BEGIN
  IF auth.jwt() ->> 'email' IS DISTINCT FROM 'marcuscapobiangomed@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  FOREACH m IN ARRAY materias LOOP
    INSERT INTO acessos (user_id, materia, grupo, status)
    VALUES (p_user_id, m, 1, 'aprovado')
    ON CONFLICT (user_id, materia)
    DO UPDATE SET status = 'aprovado', trial_expires_at = NULL;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_set_vip(UUID) TO authenticated;

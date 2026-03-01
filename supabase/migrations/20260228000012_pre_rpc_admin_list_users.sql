CREATE OR REPLACE FUNCTION pre_admin_list_users()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pre_profiles WHERE id = auth.uid() AND is_admin = true) THEN
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
          FROM pre_acessos a WHERE a.user_id = p.id
        ) AS acessos
      FROM pre_profiles p
      ORDER BY p.created_at DESC
    ) t
  );
END;
$$;

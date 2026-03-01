-- RPC temporária para auditar trials (acessível sem auth para consulta única)
CREATE OR REPLACE FUNCTION temp_audit_trials()
RETURNS TABLE(
  nome text,
  email text,
  materia text,
  trial_status text,
  trial_expires_at timestamptz,
  has_progresso boolean,
  progresso_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.nome,
    p.email,
    a.materia,
    CASE WHEN a.trial_expires_at > now() THEN 'ativo' ELSE 'expirado' END AS trial_status,
    a.trial_expires_at,
    EXISTS(SELECT 1 FROM progresso pr WHERE pr.user_id = a.user_id AND pr.materia = a.materia) AS has_progresso,
    COALESCE((SELECT count(*) FROM progresso pr WHERE pr.user_id = a.user_id AND pr.materia = a.materia), 0) AS progresso_count
  FROM acessos a
  JOIN profiles p ON p.id = a.user_id
  WHERE a.status = 'trial'
  ORDER BY p.email, a.materia;
END;
$$;

-- Permitir acesso anon temporariamente
GRANT EXECUTE ON FUNCTION temp_audit_trials() TO anon;

-- RPC atomico para session guard (corrige race condition)
CREATE OR REPLACE FUNCTION register_session_atomic(
  p_token TEXT,
  p_device_info TEXT,
  p_max_sessions INTEGER DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  DELETE FROM sessoes_ativas
  WHERE user_id = v_user_id
    AND last_seen < now() - interval '10 minutes';

  INSERT INTO sessoes_ativas (user_id, token, device_info)
  VALUES (v_user_id, p_token, p_device_info);

  DELETE FROM sessoes_ativas
  WHERE id IN (
    SELECT id FROM sessoes_ativas
    WHERE user_id = v_user_id
    ORDER BY created_at DESC
    OFFSET p_max_sessions
  );
END;
$$;

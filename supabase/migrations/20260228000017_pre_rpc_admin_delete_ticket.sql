CREATE OR REPLACE FUNCTION pre_admin_delete_ticket(p_ticket_id BIGINT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pre_profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM pre_suporte WHERE id = p_ticket_id;
END;
$$;

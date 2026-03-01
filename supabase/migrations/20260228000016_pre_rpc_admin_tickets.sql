CREATE OR REPLACE FUNCTION pre_admin_update_ticket_status(p_ticket_id BIGINT, p_status TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pre_profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE pre_suporte SET status = p_status WHERE id = p_ticket_id;
END;
$$;

CREATE OR REPLACE FUNCTION pre_admin_mark_commission_paid(p_commission_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pre_profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE pre_affiliate_commissions SET status = 'pago' WHERE id = p_commission_id;
END;
$$;

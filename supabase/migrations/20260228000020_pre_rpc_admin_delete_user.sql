CREATE OR REPLACE FUNCTION pre_admin_delete_user_data(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pre_profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Nao pode excluir a si mesmo';
  END IF;

  DELETE FROM pre_affiliate_commissions WHERE affiliate_user_id = p_user_id;
  DELETE FROM pre_affiliate_commissions WHERE referred_user_id = p_user_id;
  DELETE FROM pre_sessoes_ativas WHERE user_id = p_user_id;
  DELETE FROM pre_progresso WHERE user_id = p_user_id;
  DELETE FROM pre_acessos WHERE user_id = p_user_id;
  DELETE FROM pre_suporte WHERE user_id = p_user_id;
  DELETE FROM pre_eventos WHERE user_id = p_user_id;
  DELETE FROM pre_profiles WHERE id = p_user_id;
END;
$$;

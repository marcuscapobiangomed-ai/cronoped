-- RPC para envio de ticket de suporte (SECURITY DEFINER bypassa RLS)
CREATE OR REPLACE FUNCTION submit_support_ticket(
  p_assunto  text,
  p_mensagem text,
  p_nome     text DEFAULT '',
  p_email    text DEFAULT ''
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO suporte (user_id, nome, email, assunto, mensagem, status)
  VALUES (auth.uid(), p_nome, p_email, p_assunto, p_mensagem, 'aberto');
END;
$$;

GRANT EXECUTE ON FUNCTION submit_support_ticket TO authenticated;

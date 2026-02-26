-- Expiração do Módulo 1: 08/05/2026
-- Todos os acessos pagos e trials (exceto VIP) devem ser revogados nesta data.
-- Esta RPC pode ser chamada manualmente ou via cron job no dia 08/05/2026.

CREATE OR REPLACE FUNCTION expire_module_1()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vip_emails text[] := ARRAY[
    'marcuscapobiangomed@gmail.com',
    'lucasgrmed@gmail.com',
    'tifer134@gmail.com',
    'jgmed107@gmail.com',
    'luizgabrielcamposlobog@gmail.com',
    'emanoelfernandes.f.s.f@gmail.com',
    'lauraoppelt23@gmail.com',
    'anaisabella9x2limamartins@gmail.com',
    'isabelamoraisg@hotmail.com'
  ];
  affected integer;
BEGIN
  -- Revogar todos os acessos de usuários não-VIP
  UPDATE acessos
  SET status = 'expirado',
      trial_expires_at = NULL
  WHERE user_id NOT IN (
    SELECT id FROM auth.users WHERE email = ANY(vip_emails)
  )
  AND status IN ('aprovado', 'trial', 'pending');

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

GRANT EXECUTE ON FUNCTION expire_module_1() TO service_role;

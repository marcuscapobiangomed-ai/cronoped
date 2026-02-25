-- Resetar status pending para VIPs (conta de teste que acionou a API manualmente)
-- VIPs com pending voltam para 'aprovado'
UPDATE acessos
SET status = 'aprovado', trial_expires_at = NULL
WHERE status = 'pending'
  AND user_id IN (
    SELECT id FROM auth.users
    WHERE email = ANY(ARRAY[
      'marcuscapobiangomed@gmail.com',
      'lucasgrmed@gmail.com',
      'tifer134@gmail.com',
      'jgmed107@gmail.com',
      'luizgabrielcamposlobog@gmail.com',
      'emanoelfernandes.f.s.f@gmail.com',
      'lauraoppelt23@gmail.com',
      'anaisabella9x2limamartins@gmail.com',
      'isabelamoraisg@hotmail.com'
    ])
  );

-- Não-VIPs com pending: verificar se trial ainda válido
-- Se sim → restaurar trial, senão → deletar (precisam pagar de novo)
-- Restore valid trials
UPDATE acessos
SET status = 'trial'
WHERE status = 'pending'
  AND trial_expires_at IS NOT NULL
  AND trial_expires_at > NOW()
  AND user_id NOT IN (
    SELECT id FROM auth.users
    WHERE email = ANY(ARRAY[
      'marcuscapobiangomed@gmail.com',
      'lucasgrmed@gmail.com',
      'tifer134@gmail.com',
      'jgmed107@gmail.com',
      'luizgabrielcamposlobog@gmail.com',
      'emanoelfernandes.f.s.f@gmail.com',
      'lauraoppelt23@gmail.com',
      'anaisabella9x2limamartins@gmail.com',
      'isabelamoraisg@hotmail.com'
    ])
  );

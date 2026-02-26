-- Resetar acessos pending da conta de teste para trial (criados por testes de API)
UPDATE acessos
SET status = 'trial'
WHERE user_id = '76b9d99e-b188-4359-beba-c79e6b06245f'
  AND status = 'pending'
  AND trial_expires_at IS NOT NULL
  AND trial_expires_at > NOW();

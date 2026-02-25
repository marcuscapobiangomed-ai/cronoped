-- Expirar trial de uma matéria para conta admin poder testar pagamento
-- Acessar com ?test_payment=true para desativar o bypass VIP
UPDATE acessos
SET status = 'trial', trial_expires_at = NOW() - interval '1 day'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'marcuscapobiangomed@gmail.com')
AND materia = 'ped';

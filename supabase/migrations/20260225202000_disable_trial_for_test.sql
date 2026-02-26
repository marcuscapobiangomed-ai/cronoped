-- TEMPORÁRIO: deletar todos os acessos da conta admin para testar pagamento
DELETE FROM acessos
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'marcuscapobiangomed@gmail.com');

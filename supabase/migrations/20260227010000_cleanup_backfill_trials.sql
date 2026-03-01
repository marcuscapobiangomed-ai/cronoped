-- ============================================================
-- Limpeza: remover trials expirados criados pelo backfill antigo
-- O backfill (20260225193251) criou 6 trials por usuário.
-- O sistema agora só permite 1 trial por vez via activate_trial().
-- Trials expirados que nunca viraram pagamento são lixo de dados.
-- ============================================================

-- 1. Deletar trials expirados (trial_expires_at no passado)
--    Mantém trials que ainda estão ativos (trial_expires_at > now())
--    Mantém registros aprovados/pending (nunca toca neles)
DELETE FROM acessos
WHERE status = 'trial'
  AND trial_expires_at IS NOT NULL
  AND trial_expires_at < now();

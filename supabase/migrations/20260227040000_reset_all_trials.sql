-- ============================================================
-- Reset: remover TODOS os trials do backfill bugado
-- e resetar flag trial_used_at para que possam ativar de novo
-- ============================================================

-- 1. Deletar todos os registros com status='trial'
DELETE FROM acessos WHERE status = 'trial';

-- 2. Resetar flag trial_used_at para todos os usuários
--    (permite que ativem 1 trial novo corretamente)
UPDATE profiles SET trial_used_at = NULL;

-- 3. Limpar função temporária de auditoria
DROP FUNCTION IF EXISTS temp_audit_trials();

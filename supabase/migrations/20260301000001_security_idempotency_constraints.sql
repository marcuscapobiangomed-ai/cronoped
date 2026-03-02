-- F1.4: Idempotência em pagamentos — UNIQUE constraints para prevenir processamento duplo
-- F2.1: CHECK constraints em tabelas de status/grupo

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  UNIQUE constraints para idempotência de pagamentos         ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Previne que o mesmo pagamento MP seja processado duas vezes
CREATE UNIQUE INDEX IF NOT EXISTS uq_acessos_mp_payment_id
  ON acessos(mp_payment_id) WHERE mp_payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pre_acessos_mp_payment_id
  ON pre_acessos(mp_payment_id) WHERE mp_payment_id IS NOT NULL;

-- Previne comissão duplicada para mesmo referido+materia
-- (já pode existir via UNIQUE constraint, uso IF NOT EXISTS por segurança)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_affiliate_referred_materia'
  ) THEN
    ALTER TABLE affiliate_commissions
      ADD CONSTRAINT uq_affiliate_referred_materia UNIQUE (referred_user_id, materia);
  END IF;
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_pre_affiliate_referred_materia'
  ) THEN
    ALTER TABLE pre_affiliate_commissions
      ADD CONSTRAINT uq_pre_affiliate_referred_materia UNIQUE (referred_user_id, materia);
  END IF;
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  CHECK constraints em status e grupo                        ║
-- ╚══════════════════════════════════════════════════════════════╝

-- acessos
DO $$ BEGIN
  ALTER TABLE acessos ADD CONSTRAINT chk_acessos_status
    CHECK (status IN ('trial', 'pending', 'aprovado', 'expirado'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE acessos ADD CONSTRAINT chk_acessos_grupo
    CHECK (grupo BETWEEN 1 AND 10);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- pre_acessos
DO $$ BEGIN
  ALTER TABLE pre_acessos ADD CONSTRAINT chk_pre_acessos_status
    CHECK (status IN ('trial', 'pending', 'aprovado', 'expirado'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE pre_acessos ADD CONSTRAINT chk_pre_acessos_grupo
    CHECK (grupo BETWEEN 1 AND 10);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- subscriptions
DO $$ BEGIN
  ALTER TABLE subscriptions ADD CONSTRAINT chk_subscriptions_status
    CHECK (status IN ('pending', 'authorized', 'paused', 'cancelled'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE subscriptions ADD CONSTRAINT chk_subscriptions_amount
    CHECK (amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- pre_suporte
DO $$ BEGIN
  ALTER TABLE pre_suporte ADD CONSTRAINT chk_pre_suporte_status
    CHECK (status IN ('aberto', 'respondido', 'fechado'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

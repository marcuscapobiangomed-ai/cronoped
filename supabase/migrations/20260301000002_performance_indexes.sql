-- F2.2: Indexes compostos para performance de queries frequentes

-- Composite index para validateAcesso e dashboard queries
CREATE INDEX IF NOT EXISTS idx_acessos_user_materia_status
  ON acessos(user_id, materia, status);

CREATE INDEX IF NOT EXISTS idx_pre_acessos_user_materia_status
  ON pre_acessos(user_id, materia, status);

-- Partial index para trial expiration queries (admin dashboard)
CREATE INDEX IF NOT EXISTS idx_pre_acessos_trial_expires
  ON pre_acessos(trial_expires_at)
  WHERE status = 'trial' AND trial_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_acessos_trial_expires
  ON acessos(trial_expires_at)
  WHERE status = 'trial' AND trial_expires_at IS NOT NULL;

-- Index para eventos timeline (admin event feed)
CREATE INDEX IF NOT EXISTS idx_eventos_user_type_created
  ON eventos(user_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pre_eventos_user_type_created
  ON pre_eventos(user_id, type, created_at DESC);

-- Index para affiliate lookups por referred_user_id
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_referred
  ON affiliate_commissions(referred_user_id);

CREATE INDEX IF NOT EXISTS idx_pre_affiliate_referred
  ON pre_affiliate_commissions(referred_user_id);

-- Index para subscriptions ativas
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status
  ON subscriptions(user_id, status);

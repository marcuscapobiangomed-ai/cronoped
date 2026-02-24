-- ============================================================
-- CronoPed: CPF Único + Sistema Anti-compartilhamento
-- Execute este SQL no Supabase Dashboard → SQL Editor
-- ============================================================

-- -----------------------------------------------
-- PARTE 1: CPF Único
-- -----------------------------------------------

-- 1.1 Constraint de unicidade no CPF (impede duplicatas no banco)
ALTER TABLE profiles ADD CONSTRAINT profiles_cpf_unique UNIQUE (cpf);

-- 1.2 Função RPC para verificar disponibilidade do CPF
-- (SECURITY DEFINER permite chamada sem autenticação)
CREATE OR REPLACE FUNCTION check_cpf_disponivel(p_cpf text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM profiles WHERE cpf = p_cpf);
$$;

-- -----------------------------------------------
-- PARTE 2: Tabela de Sessões Ativas
-- -----------------------------------------------

-- 2.1 Criar tabela
CREATE TABLE sessoes_ativas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  device_info TEXT,
  last_seen TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2.2 Habilitar RLS
ALTER TABLE sessoes_ativas ENABLE ROW LEVEL SECURITY;

-- 2.3 Policy: cada usuário gerencia apenas suas próprias sessões
CREATE POLICY "Users manage own sessions"
  ON sessoes_ativas
  FOR ALL
  USING (auth.uid() = user_id);

-- 2.4 Índices para performance
CREATE INDEX idx_sessoes_user ON sessoes_ativas(user_id);
CREATE INDEX idx_sessoes_token ON sessoes_ativas(token);

-- ============================================================
-- PRONTO! Agora o app vai:
-- - Bloquear cadastro com CPF duplicado
-- - Permitir apenas 1 sessão ativa por usuário
-- - Deslogar automaticamente o dispositivo anterior
-- ============================================================

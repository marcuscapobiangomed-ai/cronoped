-- Adiciona coluna customizations para armazenar edições/exclusões/adições de atividades do usuário
ALTER TABLE progresso
ADD COLUMN IF NOT EXISTS customizations JSONB DEFAULT '{}'::jsonb;

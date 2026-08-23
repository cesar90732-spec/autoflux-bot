-- 012_terms_acceptance.sql
-- Registra quando cada usuário aceitou os Termos de Uso / Política de
-- Privacidade. Guardado por usuário (não por empresa) porque quem
-- aceita é sempre uma pessoa física, e cada novo funcionário adicionado
-- depois também precisa aceitar antes de usar o painel. NULL = nunca
-- aceitou (bloqueia login em contas antigas até aceitar).
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20);

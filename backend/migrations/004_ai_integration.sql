-- 004_ai_integration.sql
-- Etapa 4: integração com provedores de IA (OpenAI, Gemini, Claude).
--
-- ai_settings (JSONB em companies) guarda a configuração de IA de cada
-- empresa, no formato:
-- {
--   "enabled": false,
--   "mode": "suggest",              -- "suggest" (sugere ao atendente) ou "auto" (responde sozinho)
--   "provider": "openai",           -- "openai" | "gemini" | "claude"
--   "model": "gpt-4o-mini",
--   "api_key": null,                -- opcional: sobrescreve a chave global do .env para esta empresa
--   "persona": "",                  -- texto livre: tom de voz, regras, informações do negócio
--   "temperature": 0.5,
--   "max_history_messages": 10
-- }
--
-- Guardamos também um cache do último resumo gerado por conversa, para
-- não precisar chamar a IA de novo toda vez que o atendente abre o chat.

ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS ai_settings JSONB NOT NULL DEFAULT
        '{"enabled": false, "mode": "suggest", "provider": "openai", "model": "gpt-4o-mini", "api_key": null, "persona": "", "temperature": 0.5, "max_history_messages": 10}';

ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS ai_summary TEXT,
    ADD COLUMN IF NOT EXISTS ai_summary_updated_at TIMESTAMPTZ;

-- Marca se uma mensagem enviada pelo bot foi gerada por IA (em vez de
-- palavra-chave/fluxo) — útil para relatórios futuros (Etapa 5) e para
-- deixar claro no histórico o que foi automação simples vs IA.
ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS generated_by_ai BOOLEAN NOT NULL DEFAULT false;

-- 005_reports.sql
-- Etapa 5: nenhuma tabela nova é necessária para relatórios (tudo é
-- calculado on-the-fly a partir de messages/conversations/contacts) —
-- só um índice para acelerar os filtros por período usados pelas
-- consultas de agregação em report.model.js.

CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);

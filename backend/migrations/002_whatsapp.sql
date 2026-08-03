-- 002_whatsapp.sql
-- Estrutura de atendimento via WhatsApp: sessão de conexão (uma por
-- empresa), contatos, conversas, mensagens, palavras-chave de resposta
-- automática e fluxos de conversa (menus).

-- Sessão de conexão do WhatsApp (Baileys). Cada empresa tem no máximo
-- uma sessão ativa nesta etapa (multi-número fica para uma etapa futura).
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'disconnected'
        CHECK (status IN ('disconnected', 'connecting', 'qr_pending', 'connected')),
    phone_number VARCHAR(20),
    connected_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contatos (clientes que mandam mensagem para a empresa)
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    name VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (company_id, phone_number)
);

-- Relação N:N entre contatos e etiquetas (tags), definidas na migration 001
CREATE TABLE IF NOT EXISTS contact_tags (
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (contact_id, tag_id)
);

-- Fluxos de conversa (menus configuráveis). Estrutura da árvore de
-- opções fica em JSONB por simplicidade e flexibilidade:
-- steps: { "start": { "message": "...", "options": { "1": "corte", "2": "horario" } }, ... }
CREATE TABLE IF NOT EXISTS flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    trigger_keyword VARCHAR(100) NOT NULL,
    steps JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (company_id, trigger_keyword)
);

-- Palavras-chave simples de resposta automática (sem menu, resposta direta)
CREATE TABLE IF NOT EXISTS keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    trigger_text VARCHAR(150) NOT NULL,   -- texto que dispara a resposta (case-insensitive, "contém")
    reply_text TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_keywords_company ON keywords(company_id);

-- Conversas: uma por contato, com estado do atendimento (bot ativo ou
-- transferido para humano) e posição atual dentro de um fluxo, se houver.
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_bot_active BOOLEAN NOT NULL DEFAULT true, -- false = transferida para humano
    active_flow_id UUID REFERENCES flows(id) ON DELETE SET NULL,
    active_flow_step VARCHAR(50), -- chave do step atual dentro do JSONB "steps"
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (company_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_company ON conversations(company_id);

-- Histórico completo de mensagens (entrada e saída)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('contact', 'bot', 'user')),
    sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content_type VARCHAR(20) NOT NULL DEFAULT 'text'
        CHECK (content_type IN ('text', 'image', 'pdf', 'video', 'audio')),
    content TEXT,       -- texto da mensagem, ou legenda de mídia
    media_url TEXT,     -- caminho/URL do arquivo de mídia, se houver
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON messages USING gin (to_tsvector('portuguese', coalesce(content, '')));

DROP TRIGGER IF EXISTS trg_whatsapp_sessions_updated_at ON whatsapp_sessions;
CREATE TRIGGER trg_whatsapp_sessions_updated_at
    BEFORE UPDATE ON whatsapp_sessions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

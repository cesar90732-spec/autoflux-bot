-- 003_catalog_campaigns.sql
-- Catálogo de produtos, listas de transmissão e agendamento de mensagens.

-- Catálogo de produtos exibido/enviado pela empresa aos clientes
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL DEFAULT 0, -- preço em centavos, evita erro de ponto flutuante
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);

-- Listas de transmissão: grupos de contatos que recebem a mesma mensagem
CREATE TABLE IF NOT EXISTS broadcast_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS broadcast_list_contacts (
    broadcast_list_id UUID NOT NULL REFERENCES broadcast_lists(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    PRIMARY KEY (broadcast_list_id, contact_id)
);

-- Mensagens agendadas: podem ter como destino um único contato OU uma
-- lista de transmissão inteira (exatamente um dos dois deve ser preenchido).
CREATE TABLE IF NOT EXISTS scheduled_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    broadcast_list_id UUID REFERENCES broadcast_lists(id) ON DELETE CASCADE,
    content_type VARCHAR(20) NOT NULL DEFAULT 'text'
        CHECK (content_type IN ('text', 'image', 'pdf', 'video', 'audio')),
    content TEXT,        -- texto da mensagem, ou legenda quando content_type != 'text'
    media_url TEXT,       -- caminho do arquivo em /uploads, quando aplicável
    scheduled_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    error_message TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_scheduled_target CHECK (
        (contact_id IS NOT NULL AND broadcast_list_id IS NULL) OR
        (contact_id IS NULL AND broadcast_list_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_company ON scheduled_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_status ON scheduled_messages(status);

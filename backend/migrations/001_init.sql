-- 001_init.sql
-- Estrutura inicial do banco: multi-tenant por "empresa" (company),
-- usuários com papéis (admin/funcionário) e etiquetas de clientes.
-- Cada empresa é um cliente do SaaS; cada empresa tem seus próprios
-- usuários, conexões de WhatsApp, contatos e conversas.

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- necessário para gen_random_uuid()

-- Empresas (tenants do SaaS)
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    document VARCHAR(20),              -- CNPJ/CPF, opcional
    business_hours JSONB DEFAULT '{}', -- horário de funcionamento configurável
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Usuários do sistema (quem faz login no painel)
-- role: 'admin' (dono/gestor) ou 'employee' (atendente)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
    is_online BOOLEAN NOT NULL DEFAULT false,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Etiquetas para classificar clientes (ex: "Cliente VIP", "Aguardando pagamento")
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(60) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#2563eb', -- cor em hex para exibição no painel
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (company_id, name)
);

-- Função utilitária: atualiza "updated_at" automaticamente em qualquer UPDATE
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_companies_updated_at ON companies;
CREATE TRIGGER trg_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

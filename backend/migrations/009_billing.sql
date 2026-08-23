-- 009_billing.sql
-- Cobrança via PicPay: telefone de contato do responsável pela empresa
-- (pra onde vai o lembrete de pagamento) e valor do plano em centavos.
-- billing_charges guarda cada cobrança gerada, pra nunca perder o
-- histórico e pra podermos consultar o status de uma cobrança pendente.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS billing_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS billing_email VARCHAR(150),
  ADD COLUMN IF NOT EXISTS billing_name VARCHAR(150), -- nome do responsável, exigido pelo PicPay
  ADD COLUMN IF NOT EXISTS plan_price_cents INTEGER NOT NULL DEFAULT 4900;

CREATE TABLE IF NOT EXISTS billing_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    reference_id VARCHAR(100) NOT NULL UNIQUE, -- referenceId enviado ao PicPay
    amount_cents INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'refunded')),
    payment_url TEXT,
    qr_code_base64 TEXT,
    expires_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_charges_company_id ON billing_charges(company_id);
CREATE INDEX IF NOT EXISTS idx_billing_charges_status ON billing_charges(status);

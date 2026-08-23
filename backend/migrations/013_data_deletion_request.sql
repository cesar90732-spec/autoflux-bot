-- 013_data_deletion_request.sql
-- Direito de exclusão (LGPD): a empresa pode solicitar a exclusão dos
-- seus dados a qualquer momento. Fica marcado aqui em vez de apagar na
-- hora — o admin da plataforma revisa e executa a exclusão de fato
-- (evita perda de dados por clique acidental, e dá chance de resolver
-- pendência de cobrança antes).
ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;

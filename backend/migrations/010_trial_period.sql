-- 010_trial_period.sql
-- Onboarding automático: toda empresa nova nasce em período de teste
-- grátis (payment_status = 'trial') em vez de 'em_dia' direto. Isso
-- fecha o buraco que travava a venda self-service: antes, uma empresa
-- só entrava na régua de cobrança automática (billingReminder.job)
-- depois que um admin da plataforma preenchia billing_phone na mão.
-- Agora isso é coletado no próprio cadastro (POST /api/auth/register)
-- e o trial_ends_at já deixa a empresa pronta para cair no job assim
-- que o prazo acabar — sem toque manual nenhum.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS trial_ends_at DATE;

-- Empresas que já existiam antes desta migration continuam 'em_dia'
-- (não faz sentido colocá-las em trial retroativamente).

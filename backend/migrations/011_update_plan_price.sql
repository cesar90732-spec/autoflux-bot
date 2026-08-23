-- 011_update_plan_price.sql
-- Ajusta o preço padrão do plano de R$ 49,00 para R$ 97,00. O valor
-- antigo (4900) estava abaixo do custo real de operar (IA por empresa
-- + infra), sem contar a margem. Atualiza também as empresas que já
-- nasceram com o valor antigo e ainda não pagaram nada (trial) — quem
-- já é cliente pagante ('em_dia') mantém o preço combinado até então.

ALTER TABLE companies
  ALTER COLUMN plan_price_cents SET DEFAULT 9700;

UPDATE companies
SET plan_price_cents = 9700
WHERE plan_price_cents = 4900
  AND payment_status = 'trial';

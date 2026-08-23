// src/models/billing.model.js
const { query } = require('../config/db');

async function createCharge({ companyId, referenceId, amountCents, paymentUrl, qrCodeBase64, expiresAt }) {
  const result = await query(
    `INSERT INTO billing_charges (company_id, reference_id, amount_cents, payment_url, qr_code_base64, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [companyId, referenceId, amountCents, paymentUrl, qrCodeBase64, expiresAt || null]
  );
  return result.rows[0];
}

async function findByReferenceId(referenceId) {
  const result = await query('SELECT * FROM billing_charges WHERE reference_id = $1', [referenceId]);
  return result.rows[0] || null;
}

async function findById(id) {
  const result = await query('SELECT * FROM billing_charges WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function markAsPaid(referenceId) {
  const result = await query(
    `UPDATE billing_charges SET status = 'paid', paid_at = now()
     WHERE reference_id = $1 AND status != 'paid'
     RETURNING *`,
    [referenceId]
  );
  return result.rows[0] || null;
}

// Empresas com plano (ou teste grátis) vencendo nos próximos `daysAhead`
// dias, usado pelo job diário de lembrete de cobrança. Trata dois casos:
//   - 'trial': cobra quando o trial_ends_at está próximo/vencido — é
//     assim que uma empresa recém-cadastrada (self-service) vira
//     cliente pagante sozinha, sem um admin da plataforma precisar
//     "ativar" a cobrança dela na mão.
//   - 'em_dia': cobra quando plan_renews_at está próximo/vencido
//     (fluxo de renovação de quem já pagou pelo menos uma vez).
// Empresas 'em_dia' sem plan_renews_at definido (nunca cobradas ainda,
// ex: cadastradas antes desta migration) não entram aqui — precisam de
// billing_phone + uma primeira cobrança manual do admin da plataforma.
async function findCompaniesDueForBilling(daysAhead = 3) {
  const result = await query(
    `SELECT id, name, billing_phone, plan_price_cents, plan_renews_at, trial_ends_at, payment_status
     FROM companies
     WHERE billing_phone IS NOT NULL
       AND (
         (payment_status = 'trial' AND trial_ends_at <= (CURRENT_DATE + $1 * INTERVAL '1 day'))
         OR (payment_status = 'em_dia' AND plan_renews_at IS NOT NULL AND plan_renews_at <= (CURRENT_DATE + $1 * INTERVAL '1 day'))
       )`,
    [daysAhead]
  );
  return result.rows;
}

async function setPaymentStatus(companyId, status, planRenewsAt) {
  const result = await query(
    `UPDATE companies SET payment_status = $1, plan_renews_at = COALESCE($2, plan_renews_at)
     WHERE id = $3 RETURNING id, name, payment_status, plan_renews_at`,
    [status, planRenewsAt || null, companyId]
  );
  return result.rows[0];
}

module.exports = {
  createCharge,
  findByReferenceId,
  findById,
  markAsPaid,
  findCompaniesDueForBilling,
  setPaymentStatus,
};

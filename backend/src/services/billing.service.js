// src/services/billing.service.js
// Lógica de geração de cobrança compartilhada entre o endpoint manual
// (billing.controller) e o job automático (jobs/billingReminder.job.js).
// Usa pix.service (Copia e Cola gerado localmente, sem API externa).

const pixService = require('./pix.service');
const billingModel = require('../models/billing.model');

async function generateChargeForCompany(company) {
  const amountCents = company.plan_price_cents || 4900;
  const value = amountCents / 100;

  // txid curto e único o bastante pra não colidir, dentro do limite de 25
  // caracteres alfanuméricos que o padrão Pix exige.
  const txid = `AF${Date.now().toString(36).toUpperCase()}`;

  const charge = await pixService.generateCharge({
    amount: value,
    txid,
    description: `Mensalidade AutoFlux — ${company.name}`,
  });

  return billingModel.createCharge({
    companyId: company.id,
    referenceId: txid,
    amountCents,
    paymentUrl: charge.copyPasteCode, // guardamos o "Copia e Cola" nesse campo
    qrCodeBase64: charge.qrCodeBase64,
    expiresAt: null, // Pix estático não expira
  });
}

module.exports = { generateChargeForCompany };

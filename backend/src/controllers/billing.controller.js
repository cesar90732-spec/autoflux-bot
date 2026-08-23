// src/controllers/billing.controller.js
const billingModel = require('../models/billing.model');
const companyModel = require('../models/company.model');
const { generateChargeForCompany } = require('../services/billing.service');

// POST /api/billing/companies/:companyId/charge
// Gera uma cobrança Pix (Copia e Cola + QR Code) pro valor do plano da
// empresa. Chamado pelo admin da plataforma ou pelo job automático.
async function createChargeForCompany(req, res, next) {
  try {
    const { companyId } = req.params;
    const company = await companyModel.findById(companyId);
    if (!company) return res.status(404).json({ error: 'Empresa não encontrada.' });

    const saved = await generateChargeForCompany(company);
    return res.status(201).json(saved);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
}

// POST /api/billing/charges/:chargeId/confirm
// Sem API de gateway não existe webhook automático — o admin da
// plataforma confirma manualmente depois de ver o Pix cair na conta.
// Ao confirmar, libera o acesso da empresa (payment_status = em_dia)
// e empurra o próximo vencimento 30 dias pra frente.
async function confirmPayment(req, res, next) {
  try {
    const { chargeId } = req.params;
    const charge = await billingModel.findById(chargeId);
    if (!charge) return res.status(404).json({ error: 'Cobrança não encontrada.' });
    if (charge.status === 'paid') {
      return res.status(200).json({ message: 'Cobrança já estava confirmada.', charge });
    }

    const updatedCharge = await billingModel.markAsPaid(charge.reference_id);
    const nextRenewal = new Date();
    nextRenewal.setDate(nextRenewal.getDate() + 30);
    const company = await billingModel.setPaymentStatus(
      charge.company_id,
      'em_dia',
      nextRenewal.toISOString().slice(0, 10)
    );

    return res.json({ charge: updatedCharge, company });
  } catch (err) {
    next(err);
  }
}

module.exports = { createChargeForCompany, confirmPayment };

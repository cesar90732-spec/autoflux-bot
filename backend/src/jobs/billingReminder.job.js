// src/jobs/billingReminder.job.js
// Roda uma vez por dia: acha empresas com plano vencendo em até 3 dias
// (ou já vencidas), gera uma cobrança Pix nova e manda o Copia-e-Cola
// pro WhatsApp da própria empresa (reaproveita a conexão Baileys que
// ela já usa pro atendimento). A confirmação de pagamento é manual —
// veja billing.controller.confirmPayment.

const billingModel = require('../models/billing.model');
const { generateChargeForCompany } = require('../services/billing.service');
const whatsappService = require('../services/whatsapp.service');
const logger = require('../utils/logger');

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function toJid(phone) {
  // Espera telefone só com dígitos, com DDI (ex: 5599999999999).
  const digits = String(phone).replace(/\D/g, '');
  return `${digits}@s.whatsapp.net`;
}

async function runOnce() {
  const dueCompanies = await billingModel.findCompaniesDueForBilling(3);

  for (const company of dueCompanies) {
    try {
      const charge = await generateChargeForCompany(company);
      const valueReais = (company.plan_price_cents / 100).toFixed(2).replace('.', ',');

      const text =
        `Olá! Sua mensalidade do AutoFlux (R$ ${valueReais}) está vencendo.\n\n` +
        `Pague com Pix — copia e cola o código abaixo no seu banco ou no PicPay:\n\n` +
        `${charge.payment_url}\n\n` +
        `Assim que o pagamento cair, seu acesso é renovado.`;

      await whatsappService.sendTextMessage(company.id, toJid(company.billing_phone), text);
      logger.info(`Lembrete de cobrança enviado: empresa ${company.id} (${company.name})`);
    } catch (err) {
      // Uma empresa falhar (ex: WhatsApp desconectado) não pode travar as outras.
      logger.error(`Falha ao cobrar empresa ${company.id} (${company.name}): ${err.message}`);
    }
  }
}

// Chamado uma vez no start do servidor; roda a cada 24h a partir daí.
// Simples de propósito — não precisa de node-cron pra rodar 1x por dia.
function schedule() {
  runOnce().catch((err) => logger.error(`Erro no job de cobrança: ${err.message}`));
  setInterval(() => {
    runOnce().catch((err) => logger.error(`Erro no job de cobrança: ${err.message}`));
  }, ONE_DAY_MS);
}

module.exports = { schedule, runOnce };

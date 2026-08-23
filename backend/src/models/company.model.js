// src/models/company.model.js
// Camada de acesso a dados para "companies" (cada empresa cliente do SaaS).

const { query } = require('../config/db');

const TRIAL_DAYS = 7;

// Onboarding automático: toda empresa nova nasce em teste grátis de
// TRIAL_DAYS dias (payment_status = 'trial') e já com o telefone de
// cobrança salvo (se informado no cadastro). Isso é o que permite o
// billingReminder.job assumir a cobrança sozinho quando o trial acaba,
// sem um admin da plataforma precisar configurar nada na mão.
async function create({ name, document, billingPhone, billingName }) {
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  const result = await query(
    `INSERT INTO companies (name, document, billing_phone, billing_name, payment_status, trial_ends_at)
     VALUES ($1, $2, $3, $4, 'trial', $5)
     RETURNING id, name, document, business_hours, payment_status, trial_ends_at, created_at`,
    [name, document || null, billingPhone || null, billingName || null, trialEndsAt.toISOString().slice(0, 10)]
  );
  return result.rows[0];
}

async function findById(id) {
  const result = await query('SELECT * FROM companies WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function updateBusinessHours(id, businessHours) {
  const result = await query(
    `UPDATE companies SET business_hours = $1 WHERE id = $2
     RETURNING id, name, business_hours`,
    [JSON.stringify(businessHours), id]
  );
  return result.rows[0];
}

// Etapa 4: configuração de IA da empresa (provedor, modelo, persona,
// modo automático/sugestão). Guardada como JSONB para não precisar de
// migration nova a cada novo campo de configuração.
async function updateAiSettings(id, aiSettings) {
  const result = await query(
    `UPDATE companies SET ai_settings = $1 WHERE id = $2
     RETURNING id, name, ai_settings`,
    [JSON.stringify(aiSettings), id]
  );
  return result.rows[0];
}

module.exports = { create, findById, updateBusinessHours, updateAiSettings };

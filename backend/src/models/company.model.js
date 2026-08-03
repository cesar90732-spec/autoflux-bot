// src/models/company.model.js
// Camada de acesso a dados para "companies" (cada empresa cliente do SaaS).

const { query } = require('../config/db');

async function create({ name, document }) {
  const result = await query(
    `INSERT INTO companies (name, document) VALUES ($1, $2)
     RETURNING id, name, document, business_hours, created_at`,
    [name, document || null]
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

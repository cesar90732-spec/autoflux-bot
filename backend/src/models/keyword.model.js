// src/models/keyword.model.js
// CRUD de palavras-chave: pares (gatilho -> resposta) usados pelo
// motor de automação para responder diretamente sem precisar de um
// fluxo/menu completo.

const { query } = require('../config/db');

async function listActiveByCompany(companyId) {
  const result = await query(
    'SELECT * FROM keywords WHERE company_id = $1 AND is_active = true',
    [companyId]
  );
  return result.rows;
}

async function listByCompany(companyId) {
  const result = await query(
    'SELECT * FROM keywords WHERE company_id = $1 ORDER BY created_at DESC',
    [companyId]
  );
  return result.rows;
}

async function create(companyId, { triggerText, replyText }) {
  const result = await query(
    `INSERT INTO keywords (company_id, trigger_text, reply_text)
     VALUES ($1, $2, $3) RETURNING *`,
    [companyId, triggerText, replyText]
  );
  return result.rows[0];
}

async function update(id, companyId, { triggerText, replyText, isActive }) {
  const result = await query(
    `UPDATE keywords SET trigger_text = $3, reply_text = $4, is_active = $5
     WHERE id = $1 AND company_id = $2 RETURNING *`,
    [id, companyId, triggerText, replyText, isActive]
  );
  return result.rows[0];
}

async function remove(id, companyId) {
  await query('DELETE FROM keywords WHERE id = $1 AND company_id = $2', [id, companyId]);
}

module.exports = { listActiveByCompany, listByCompany, create, update, remove };

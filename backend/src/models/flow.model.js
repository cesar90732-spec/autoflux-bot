// src/models/flow.model.js
// Fluxos são menus de conversa: uma palavra-chave dispara o fluxo, e
// cada "step" tem uma mensagem e opções numeradas que levam a outros
// steps. Estrutura do JSONB "steps", por exemplo:
//
// {
//   "start": {
//     "message": "Como posso ajudar?\n1 - Ver horários\n2 - Falar com atendente",
//     "options": { "1": "horarios", "2": "__transfer__" }
//   },
//   "horarios": {
//     "message": "Funcionamos de seg a sáb, das 8h às 20h.",
//     "options": {}
//   }
// }
//
// A opção especial "__transfer__" indica transferência para atendimento
// humano em vez de ir para outro step.

const { query } = require('../config/db');

async function listActiveByCompany(companyId) {
  const result = await query(
    'SELECT * FROM flows WHERE company_id = $1 AND is_active = true',
    [companyId]
  );
  return result.rows;
}

async function listByCompany(companyId) {
  const result = await query('SELECT * FROM flows WHERE company_id = $1 ORDER BY created_at DESC', [
    companyId,
  ]);
  return result.rows;
}

async function findById(id, companyId) {
  const result = await query('SELECT * FROM flows WHERE id = $1 AND company_id = $2', [
    id,
    companyId,
  ]);
  return result.rows[0] || null;
}

async function create(companyId, { name, triggerKeyword, steps }) {
  const result = await query(
    `INSERT INTO flows (company_id, name, trigger_keyword, steps)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [companyId, name, triggerKeyword, JSON.stringify(steps)]
  );
  return result.rows[0];
}

async function update(id, companyId, { name, triggerKeyword, steps, isActive }) {
  const result = await query(
    `UPDATE flows SET name = $3, trigger_keyword = $4, steps = $5, is_active = $6
     WHERE id = $1 AND company_id = $2 RETURNING *`,
    [id, companyId, name, triggerKeyword, JSON.stringify(steps), isActive]
  );
  return result.rows[0];
}

async function remove(id, companyId) {
  await query('DELETE FROM flows WHERE id = $1 AND company_id = $2', [id, companyId]);
}

module.exports = { listActiveByCompany, listByCompany, findById, create, update, remove };

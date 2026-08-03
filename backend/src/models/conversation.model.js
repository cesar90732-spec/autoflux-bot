// src/models/conversation.model.js
// Uma conversa agrupa todas as mensagens trocadas com um contato.
// Guarda o estado do atendimento: bot ativo ou transferido para humano,
// e em qual passo de um fluxo (menu) o contato está, se houver.

const { query } = require('../config/db');

async function findOrCreate(companyId, contactId) {
  const existing = await query(
    'SELECT * FROM conversations WHERE company_id = $1 AND contact_id = $2',
    [companyId, contactId]
  );
  if (existing.rows[0]) return existing.rows[0];

  const created = await query(
    `INSERT INTO conversations (company_id, contact_id) VALUES ($1, $2) RETURNING *`,
    [companyId, contactId]
  );
  return created.rows[0];
}

async function touch(conversationId) {
  await query('UPDATE conversations SET last_message_at = now() WHERE id = $1', [conversationId]);
}

// Marca a conversa como transferida para atendimento humano — o motor
// de automação para de responder automaticamente a partir daqui.
async function transferToHuman(conversationId, assignedUserId = null) {
  const result = await query(
    `UPDATE conversations
     SET is_bot_active = false, assigned_user_id = $2, active_flow_id = NULL, active_flow_step = NULL
     WHERE id = $1 RETURNING *`,
    [conversationId, assignedUserId]
  );
  return result.rows[0];
}

// Devolve a conversa para o bot (ex: atendente encerrou o atendimento manual)
async function returnToBot(conversationId) {
  const result = await query(
    `UPDATE conversations SET is_bot_active = true, assigned_user_id = NULL WHERE id = $1 RETURNING *`,
    [conversationId]
  );
  return result.rows[0];
}

async function setFlowPosition(conversationId, flowId, step) {
  const result = await query(
    `UPDATE conversations SET active_flow_id = $2, active_flow_step = $3 WHERE id = $1 RETURNING *`,
    [conversationId, flowId, step]
  );
  return result.rows[0];
}

// Etapa 4: cache do último resumo gerado por IA para esta conversa,
// para não chamar a IA de novo toda vez que o atendente abre o chat.
async function saveSummary(conversationId, summary) {
  const result = await query(
    `UPDATE conversations SET ai_summary = $2, ai_summary_updated_at = now()
     WHERE id = $1 RETURNING id, ai_summary, ai_summary_updated_at`,
    [conversationId, summary]
  );
  return result.rows[0];
}

async function findById(conversationId, companyId) {
  const result = await query(
    'SELECT * FROM conversations WHERE id = $1 AND company_id = $2',
    [conversationId, companyId]
  );
  return result.rows[0] || null;
}

async function listByCompany(companyId, { status } = {}) {
  const params = [companyId];
  let filter = '';
  if (status) {
    params.push(status);
    filter = 'AND c.status = $2';
  }
  const result = await query(
    `SELECT c.*, ct.name AS contact_name, ct.phone_number
     FROM conversations c
     JOIN contacts ct ON ct.id = c.contact_id
     WHERE c.company_id = $1 ${filter}
     ORDER BY c.last_message_at DESC`,
    params
  );
  return result.rows;
}

module.exports = {
  findOrCreate,
  findById,
  touch,
  transferToHuman,
  returnToBot,
  setFlowPosition,
  listByCompany,
  saveSummary,
};

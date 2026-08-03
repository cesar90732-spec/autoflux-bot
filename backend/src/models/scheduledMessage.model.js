// src/models/scheduledMessage.model.js
// Uma mensagem agendada tem como alvo OU um contato único OU uma lista
// de transmissão (nunca os dois — ver constraint no banco). O envio de
// fato acontece via fila (queue.service.js), este model só persiste o
// registro e seu status (pending/sent/failed/cancelled).

const { query } = require('../config/db');

async function create(companyId, {
  contactId,
  broadcastListId,
  contentType,
  content,
  mediaUrl,
  scheduledAt,
  createdBy,
}) {
  const result = await query(
    `INSERT INTO scheduled_messages
      (company_id, contact_id, broadcast_list_id, content_type, content, media_url, scheduled_at, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [companyId, contactId || null, broadcastListId || null, contentType, content || null, mediaUrl || null, scheduledAt, createdBy]
  );
  return result.rows[0];
}

async function findById(id) {
  const result = await query('SELECT * FROM scheduled_messages WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function listByCompany(companyId) {
  const result = await query(
    `SELECT sm.*, c.name AS contact_name, bl.name AS broadcast_list_name
     FROM scheduled_messages sm
     LEFT JOIN contacts c ON c.id = sm.contact_id
     LEFT JOIN broadcast_lists bl ON bl.id = sm.broadcast_list_id
     WHERE sm.company_id = $1
     ORDER BY sm.scheduled_at DESC`,
    [companyId]
  );
  return result.rows;
}

async function updateStatus(id, status, errorMessage = null) {
  await query('UPDATE scheduled_messages SET status = $2, error_message = $3 WHERE id = $1', [
    id,
    status,
    errorMessage,
  ]);
}

async function cancel(id, companyId) {
  const result = await query(
    `UPDATE scheduled_messages SET status = 'cancelled'
     WHERE id = $1 AND company_id = $2 AND status = 'pending' RETURNING *`,
    [id, companyId]
  );
  return result.rows[0];
}

module.exports = { create, findById, listByCompany, updateStatus, cancel };

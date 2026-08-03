// src/models/message.model.js
// Grava e consulta o histórico de mensagens de cada conversa. Também
// implementa a busca de mensagens usada pelo painel de conversas
// (busca full-text em português via índice GIN, ver migration 002).

const { query } = require('../config/db');

async function create({
  conversationId,
  direction,
  senderType,
  senderUserId = null,
  contentType = 'text',
  content = null,
  mediaUrl = null,
  generatedByAi = false,
}) {
  const result = await query(
    `INSERT INTO messages
      (conversation_id, direction, sender_type, sender_user_id, content_type, content, media_url, generated_by_ai)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [conversationId, direction, senderType, senderUserId, contentType, content, mediaUrl, generatedByAi]
  );
  return result.rows[0];
}

async function listByConversation(conversationId, { limit = 100 } = {}) {
  const result = await query(
    `SELECT * FROM messages WHERE conversation_id = $1
     ORDER BY created_at ASC LIMIT $2`,
    [conversationId, limit]
  );
  return result.rows;
}

// Busca mensagens de uma empresa por texto, retornando também o
// contato e a conversa de origem (usado no painel "Pesquisa de mensagens").
async function searchByCompany(companyId, searchTerm) {
  const result = await query(
    `SELECT m.*, c.id AS conversation_id, ct.name AS contact_name, ct.phone_number
     FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     JOIN contacts ct ON ct.id = c.contact_id
     WHERE c.company_id = $1
       AND to_tsvector('portuguese', coalesce(m.content, '')) @@ plainto_tsquery('portuguese', $2)
     ORDER BY m.created_at DESC
     LIMIT 50`,
    [companyId, searchTerm]
  );
  return result.rows;
}

module.exports = { create, listByConversation, searchByCompany };

// src/models/contact.model.js
// Contatos são os clientes que escrevem para o WhatsApp da empresa.
// "findOrCreate" é o ponto de entrada usado pelo motor de automação
// toda vez que chega uma mensagem de um número ainda não conhecido.

const { query } = require('../config/db');

async function findById(companyId, contactId) {
  const result = await query('SELECT * FROM contacts WHERE id = $1 AND company_id = $2', [
    contactId,
    companyId,
  ]);
  return result.rows[0] || null;
}

async function findOrCreate(companyId, phoneNumber, name) {
  const existing = await query(
    'SELECT * FROM contacts WHERE company_id = $1 AND phone_number = $2',
    [companyId, phoneNumber]
  );
  if (existing.rows[0]) return existing.rows[0];

  const created = await query(
    `INSERT INTO contacts (company_id, phone_number, name)
     VALUES ($1, $2, $3) RETURNING *`,
    [companyId, phoneNumber, name || phoneNumber]
  );
  return created.rows[0];
}

async function listByCompany(companyId, { search } = {}) {
  if (search) {
    const result = await query(
      `SELECT * FROM contacts WHERE company_id = $1
       AND (name ILIKE $2 OR phone_number ILIKE $2)
       ORDER BY name ASC`,
      [companyId, `%${search}%`]
    );
    return result.rows;
  }
  const result = await query(
    'SELECT * FROM contacts WHERE company_id = $1 ORDER BY name ASC',
    [companyId]
  );
  return result.rows;
}

// companyId é obrigatório aqui: o INSERT/DELETE só acontece se tanto o
// contato quanto a tag pertencerem à empresa do usuário logado (os
// subselects filtram por company_id). Sem isso, um usuário de qualquer
// empresa poderia marcar/desmarcar tags em contatos de outra empresa
// só sabendo o UUID — o controller trata "0 linhas afetadas" como 404.
async function addTag(companyId, contactId, tagId) {
  const result = await query(
    `INSERT INTO contact_tags (contact_id, tag_id)
     SELECT $2, $3
     WHERE EXISTS (SELECT 1 FROM contacts WHERE id = $2 AND company_id = $1)
       AND EXISTS (SELECT 1 FROM tags WHERE id = $3 AND company_id = $1)
     ON CONFLICT DO NOTHING
     RETURNING contact_id`,
    [companyId, contactId, tagId]
  );
  return result.rowCount > 0;
}

async function removeTag(companyId, contactId, tagId) {
  const result = await query(
    `DELETE FROM contact_tags
     WHERE contact_id = $2 AND tag_id = $3
       AND EXISTS (SELECT 1 FROM contacts WHERE id = $2 AND company_id = $1)`,
    [companyId, contactId, tagId]
  );
  return result.rowCount > 0;
}

module.exports = { findOrCreate, findById, listByCompany, addTag, removeTag };

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

async function addTag(contactId, tagId) {
  await query(
    `INSERT INTO contact_tags (contact_id, tag_id) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [contactId, tagId]
  );
}

async function removeTag(contactId, tagId) {
  await query('DELETE FROM contact_tags WHERE contact_id = $1 AND tag_id = $2', [
    contactId,
    tagId,
  ]);
}

module.exports = { findOrCreate, findById, listByCompany, addTag, removeTag };

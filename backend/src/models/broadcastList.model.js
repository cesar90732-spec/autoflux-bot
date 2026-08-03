// src/models/broadcastList.model.js
const { query } = require('../config/db');

async function listByCompany(companyId) {
  const result = await query(
    `SELECT bl.*, COUNT(blc.contact_id)::int AS contact_count
     FROM broadcast_lists bl
     LEFT JOIN broadcast_list_contacts blc ON blc.broadcast_list_id = bl.id
     WHERE bl.company_id = $1
     GROUP BY bl.id
     ORDER BY bl.created_at DESC`,
    [companyId]
  );
  return result.rows;
}

async function findById(id, companyId) {
  const result = await query(
    'SELECT * FROM broadcast_lists WHERE id = $1 AND company_id = $2',
    [id, companyId]
  );
  return result.rows[0] || null;
}

async function create(companyId, name) {
  const result = await query(
    'INSERT INTO broadcast_lists (company_id, name) VALUES ($1, $2) RETURNING *',
    [companyId, name]
  );
  return result.rows[0];
}

async function remove(id, companyId) {
  await query('DELETE FROM broadcast_lists WHERE id = $1 AND company_id = $2', [id, companyId]);
}

async function addContact(broadcastListId, contactId) {
  await query(
    `INSERT INTO broadcast_list_contacts (broadcast_list_id, contact_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [broadcastListId, contactId]
  );
}

async function removeContact(broadcastListId, contactId) {
  await query(
    'DELETE FROM broadcast_list_contacts WHERE broadcast_list_id = $1 AND contact_id = $2',
    [broadcastListId, contactId]
  );
}

async function listContacts(broadcastListId) {
  const result = await query(
    `SELECT c.* FROM contacts c
     JOIN broadcast_list_contacts blc ON blc.contact_id = c.id
     WHERE blc.broadcast_list_id = $1`,
    [broadcastListId]
  );
  return result.rows;
}

module.exports = {
  listByCompany,
  findById,
  create,
  remove,
  addContact,
  removeContact,
  listContacts,
};

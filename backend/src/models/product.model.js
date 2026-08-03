// src/models/product.model.js
const { query } = require('../config/db');

async function listByCompany(companyId) {
  const result = await query(
    'SELECT * FROM products WHERE company_id = $1 ORDER BY created_at DESC',
    [companyId]
  );
  return result.rows;
}

async function create(companyId, { name, description, priceCents, imageUrl }) {
  const result = await query(
    `INSERT INTO products (company_id, name, description, price_cents, image_url)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [companyId, name, description || null, priceCents || 0, imageUrl || null]
  );
  return result.rows[0];
}

async function update(id, companyId, { name, description, priceCents, imageUrl, isActive }) {
  const result = await query(
    `UPDATE products SET name = $3, description = $4, price_cents = $5, image_url = $6, is_active = $7
     WHERE id = $1 AND company_id = $2 RETURNING *`,
    [id, companyId, name, description, priceCents, imageUrl, isActive]
  );
  return result.rows[0];
}

async function remove(id, companyId) {
  await query('DELETE FROM products WHERE id = $1 AND company_id = $2', [id, companyId]);
}

module.exports = { listByCompany, create, update, remove };

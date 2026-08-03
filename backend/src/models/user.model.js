// src/models/user.model.js
// Camada de acesso a dados para "users". Mantém todas as queries SQL
// relacionadas a usuários em um único lugar, para que controllers nunca
// escrevam SQL diretamente (facilita manutenção e testes).

const { query } = require('../config/db');

async function findByEmail(email) {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
}

async function findById(id) {
  const result = await query(
    'SELECT id, company_id, name, email, role, is_online, is_platform_admin, last_seen_at, created_at FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

async function create({ companyId, name, email, passwordHash, role }) {
  const result = await query(
    `INSERT INTO users (company_id, name, email, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, company_id, name, email, role, created_at`,
    [companyId, name, email, passwordHash, role || 'employee']
  );
  return result.rows[0];
}

async function listByCompany(companyId) {
  const result = await query(
    `SELECT id, name, email, role, is_online, last_seen_at
     FROM users WHERE company_id = $1 ORDER BY name ASC`,
    [companyId]
  );
  return result.rows;
}

async function setOnlineStatus(userId, isOnline) {
  await query(
    'UPDATE users SET is_online = $1, last_seen_at = now() WHERE id = $2',
    [isOnline, userId]
  );
}

// Usado exclusivamente pelo script scripts/grant-platform-admin.js —
// nunca exposto via rota HTTP, para que essa permissão não possa ser
// autoconcedida por ninguém através do painel.
async function setPlatformAdmin(email, isPlatformAdmin) {
  const result = await query(
    'UPDATE users SET is_platform_admin = $1 WHERE email = $2 RETURNING id, name, email, is_platform_admin',
    [isPlatformAdmin, email]
  );
  return result.rows[0] || null;
}

module.exports = {
  findByEmail,
  findById,
  create,
  listByCompany,
  setOnlineStatus,
  setPlatformAdmin,
};

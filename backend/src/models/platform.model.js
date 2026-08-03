// src/models/platform.model.js
const { query } = require('../config/db');

async function listCompanies() {
  const result = await query(
    `SELECT id, name, plan, payment_status, plan_renews_at, created_at
     FROM companies
     ORDER BY created_at DESC`
  );
  return result.rows;
}

module.exports = { listCompanies };

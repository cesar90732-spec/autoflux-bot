// src/models/platform.model.js
const { query } = require('../config/db');

async function listCompanies() {
  const result = await query(`
    SELECT
      c.id,
      c.name,
      c.plan,
      c.payment_status,
      c.plan_renews_at,
      c.trial_ends_at,
      c.deletion_requested_at,
      (c.ai_settings->>'enabled')::boolean AS ai_enabled,
      c.ai_settings->>'provider' AS ai_provider,
      c.ai_settings->>'mode' AS ai_mode,
      (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id AND u.role = 'employee') AS attendants_count,
      (SELECT status FROM whatsapp_sessions ws WHERE ws.company_id = c.id) AS whatsapp_status
    FROM companies c
    ORDER BY c.created_at DESC
  `);
  return result.rows;
}

module.exports = { listCompanies };

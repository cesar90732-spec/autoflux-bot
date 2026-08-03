// src/models/whatsappSession.model.js
// Persiste o status da conexão WhatsApp de cada empresa no banco,
// para que o painel saiba se precisa mostrar QR Code, "conectando" ou
// "conectado" mesmo depois de um restart do backend (o estado real da
// sessão do Baileys em si fica em disco, ver whatsapp.service.js).

const { query } = require('../config/db');

async function upsertStatus(companyId, { status, phoneNumber = null }) {
  const result = await query(
    `INSERT INTO whatsapp_sessions (company_id, status, phone_number, connected_at)
     VALUES ($1, $2, $3, CASE WHEN $2 = 'connected' THEN now() ELSE NULL END)
     ON CONFLICT (company_id) DO UPDATE
       SET status = EXCLUDED.status,
           phone_number = COALESCE(EXCLUDED.phone_number, whatsapp_sessions.phone_number),
           connected_at = CASE WHEN EXCLUDED.status = 'connected' THEN now() ELSE whatsapp_sessions.connected_at END
     RETURNING *`,
    [companyId, status, phoneNumber]
  );
  return result.rows[0];
}

async function findByCompany(companyId) {
  const result = await query('SELECT * FROM whatsapp_sessions WHERE company_id = $1', [companyId]);
  return result.rows[0] || null;
}

module.exports = { upsertStatus, findByCompany };

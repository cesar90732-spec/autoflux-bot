// src/models/report.model.js
// Consultas de agregação para o painel de relatórios (GET /api/reports/overview).
// Tudo é calculado on-the-fly a partir de messages/conversations/contacts —
// não existe tabela de estatísticas pré-computada nesta etapa.

const { query } = require('../config/db');

// Total de mensagens enviadas (outbound) pela empresa desde "since".
async function countMessagesSent(companyId, since) {
  const result = await query(
    `SELECT COUNT(*) FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     WHERE c.company_id = $1 AND m.direction = 'outbound' AND m.created_at >= $2`,
    [companyId, since]
  );
  return Number(result.rows[0].count);
}

// Quantos contatos distintos mandaram pelo menos uma mensagem desde "since".
async function countCustomersServed(companyId, since) {
  const result = await query(
    `SELECT COUNT(DISTINCT c.contact_id) FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     WHERE c.company_id = $1 AND m.direction = 'inbound' AND m.created_at >= $2`,
    [companyId, since]
  );
  return Number(result.rows[0].count);
}

// Tempo médio, em segundos, entre uma mensagem recebida (inbound) e a
// primeira resposta enviada (outbound) na mesma conversa, considerando
// só pares onde a resposta veio depois e em até 24h (evita distorcer a
// média com conversas retomadas dias depois).
async function averageResponseTimeSeconds(companyId, since) {
  const result = await query(
    `WITH ordered AS (
       SELECT
         m.conversation_id,
         m.direction,
         m.created_at,
         LAG(m.created_at) OVER (PARTITION BY m.conversation_id ORDER BY m.created_at) AS prev_created_at,
         LAG(m.direction) OVER (PARTITION BY m.conversation_id ORDER BY m.created_at) AS prev_direction
       FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       WHERE c.company_id = $1 AND m.created_at >= $2
     )
     SELECT AVG(EXTRACT(EPOCH FROM (created_at - prev_created_at))) AS avg_seconds
     FROM ordered
     WHERE direction = 'outbound'
       AND prev_direction = 'inbound'
       AND created_at - prev_created_at <= interval '24 hours'`,
    [companyId, since]
  );
  const avg = result.rows[0].avg_seconds;
  return avg !== null ? Number(avg) : null;
}

// Mensagens por dia nos últimos "days" dias (para o gráfico de linha).
async function messagesByDay(companyId, days) {
  const result = await query(
    `SELECT date_trunc('day', m.created_at) AS day, COUNT(*) AS count
     FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     WHERE c.company_id = $1 AND m.created_at >= now() - ($2 || ' days')::interval
     GROUP BY day
     ORDER BY day ASC`,
    [companyId, days]
  );
  return result.rows.map((r) => ({ day: r.day, count: Number(r.count) }));
}

async function countConversationsByStatus(companyId) {
  const result = await query(
    `SELECT status, COUNT(*) FROM conversations WHERE company_id = $1 GROUP BY status`,
    [companyId]
  );
  const counts = { open: 0, closed: 0 };
  for (const row of result.rows) {
    counts[row.status] = Number(row.count);
  }
  return counts;
}

async function countEmployeesOnline(companyId) {
  const result = await query(
    `SELECT COUNT(*) FROM users WHERE company_id = $1 AND role = 'employee' AND is_online = true`,
    [companyId]
  );
  return Number(result.rows[0].count);
}

// Percentual das respostas do bot que vieram de IA (Etapa 4) vs
// palavra-chave/fluxo simples, no período — dá visibilidade de quanto a
// IA está realmente sendo usada no atendimento.
async function aiUsage(companyId, since) {
  const result = await query(
    `SELECT
       COUNT(*) FILTER (WHERE sender_type = 'bot') AS bot_total,
       COUNT(*) FILTER (WHERE sender_type = 'bot' AND generated_by_ai = true) AS bot_ai
     FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     WHERE c.company_id = $1 AND m.created_at >= $2`,
    [companyId, since]
  );
  const { bot_total, bot_ai } = result.rows[0];
  const total = Number(bot_total);
  const ai = Number(bot_ai);
  return { botMessages: total, aiMessages: ai, aiPercentage: total > 0 ? Math.round((ai / total) * 100) : 0 };
}

module.exports = {
  countMessagesSent,
  countCustomersServed,
  averageResponseTimeSeconds,
  messagesByDay,
  countConversationsByStatus,
  countEmployeesOnline,
  aiUsage,
};

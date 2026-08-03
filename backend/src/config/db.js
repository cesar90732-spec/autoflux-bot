// src/config/db.js
// Responsável por criar e exportar o pool de conexões com o PostgreSQL.
// Um "pool" reutiliza conexões abertas em vez de criar uma nova a cada
// query, o que é essencial para performance em produção.

const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Máximo de conexões simultâneas no pool. Ajuste conforme o tamanho
  // do seu servidor Postgres.
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Loga erros inesperados em clientes ociosos do pool (ex: conexão caiu).
pool.on('error', (err) => {
  logger.error(`Erro inesperado no pool do Postgres: ${err.message}`);
});

// Helper central de query. Todas as camadas (models) devem passar por
// aqui em vez de instanciar clientes manualmente — isso centraliza log
// e tratamento de erro de banco em um único lugar.
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 200) {
      // Loga queries lentas (> 200ms) para ajudar a identificar gargalos.
      logger.warn(`Query lenta (${duration}ms): ${text}`);
    }
    return result;
  } catch (err) {
    logger.error(`Erro na query: ${text} | ${err.message}`);
    throw err;
  }
}

// Testa a conexão ao subir a aplicação. Se falhar, encerra o processo
// com uma mensagem clara em vez de deixar o servidor subir "quebrado".
async function testConnection() {
  try {
    await pool.query('SELECT 1');
    logger.info('Conexão com PostgreSQL estabelecida com sucesso.');
  } catch (err) {
    logger.error(`Falha ao conectar no PostgreSQL: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { pool, query, testConnection };

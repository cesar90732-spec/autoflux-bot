// src/config/migrate.js
// Runner simples de migrations: lê todos os arquivos .sql da pasta
// "migrations/" em ordem alfabética (por isso o prefixo numérico:
// 001_, 002_, ...) e aplica os que ainda não foram executados.
// Mantém o histórico na tabela "schema_migrations".

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');
const logger = require('../utils/logger');

const MIGRATIONS_DIR = path.join(__dirname, '../../migrations');

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function getAppliedMigrations() {
  const result = await pool.query('SELECT filename FROM schema_migrations');
  return new Set(result.rows.map((r) => r.filename));
}

async function runMigrations() {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      logger.info(`Migration já aplicada, pulando: ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      logger.info(`Migration aplicada com sucesso: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error(`Falha ao aplicar migration ${file}: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }

  logger.info('Todas as migrations foram processadas.');
}

module.exports = { runMigrations };

// Só fecha a conexão e chama process.exit quando este arquivo é
// executado diretamente (`npm run migrate`). Quando é importado por
// server.js para rodar as migrations automaticamente no boot, o pool
// de conexões precisa continuar aberto para o resto da aplicação.
if (require.main === module) {
  runMigrations()
    .then(() => pool.end())
    .catch((err) => {
      logger.error(`Migração abortada: ${err.message}`);
      process.exit(1);
    });
}

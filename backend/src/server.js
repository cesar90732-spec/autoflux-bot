// src/server.js

require('dotenv').config();

const http = require('http');

const app = require('./app');
const { testConnection } = require('./config/db');
const { runMigrations } = require('./config/migrate');
const { connectRedis } = require('./config/redis');
const billingReminderJob = require('./jobs/billingReminder.job');
const logger = require('./utils/logger');

const PORT = Number(process.env.PORT || 3333);

async function initialize() {
  // PostgreSQL é obrigatório
  await testConnection();
  logger.info('PostgreSQL conectado.');

  // Aplica migrations pendentes automaticamente no boot. Evita o
  // problema de "esquecer" de rodar `npm run migrate` manualmente
  // depois de um deploy — cada arquivo só roda uma vez (controlado
  // pela tabela schema_migrations), então é seguro rodar toda vez.
  await runMigrations();
  logger.info('Migrations verificadas/aplicadas.');

  // Redis é opcional
  try {
    await connectRedis();
    logger.info('Redis conectado.');
  } catch (err) {
    logger.warn(`Redis indisponível: ${err.message}`);
    logger.warn('Aplicação iniciada sem Redis.');
  }
}

async function start() {
  try {
    await initialize();

    const server = http.createServer(app);

    server.listen(PORT, '0.0.0.0', () => {
      logger.info('====================================');
      logger.info(`AutoFlux iniciado`);
      logger.info(`Ambiente: ${process.env.NODE_ENV}`);
      logger.info(`Porta: ${PORT}`);
      logger.info('====================================');
    });

    // Verifica cobranças vencendo 1x por dia (também roda 1x no start).
    if (process.env.PIX_KEY) {
      billingReminderJob.schedule();
    } else {
      logger.warn('PIX_KEY não configurada — job de cobrança automática desativado.');
    }

    server.on('error', (err) => {
      logger.error(`Erro HTTP: ${err.stack || err.message}`);
    });

    const shutdown = (signal) => {
      logger.info(`${signal} recebido. Encerrando servidor...`);

      server.close(() => {
        logger.info('Servidor encerrado.');
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Forçando encerramento.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (err) {
    logger.error(`Falha ao iniciar: ${err.stack || err.message}`);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection:\n${reason?.stack || reason}`);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception:\n${err.stack || err.message}`);
});

start();

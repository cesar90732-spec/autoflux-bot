// src/server.js
// Ponto de entrada do backend. Responsável por:
//  1. Carregar variáveis de ambiente
//  2. Validar conexão com Postgres e Redis antes de aceitar requisições
//  3. Subir o servidor HTTP Express

require('dotenv').config();

const app = require('./app');
const { testConnection } = require('./config/db');
const { connectRedis } = require('./config/redis');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3333;

async function start() {
  try {
    await testConnection(); // falha rápido se o Postgres estiver fora do ar
    await connectRedis();

    app.listen(PORT, () => {
      logger.info(`AutoFlux backend rodando na porta ${PORT} (${process.env.NODE_ENV})`);
    });
  } catch (err) {
    logger.error(`Falha ao iniciar o servidor: ${err.message}`);
    process.exit(1);
  }
}

// Captura erros não tratados para que fiquem no log em vez de derrubar
// o processo silenciosamente.
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason}`);
});
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

start();

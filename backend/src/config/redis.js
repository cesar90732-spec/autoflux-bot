// src/config/redis.js
// Cliente Redis usado para:
//  - Fila de mensagens agendadas / disparos em massa (Etapa 2)
//  - Cache de sessões do WhatsApp
//  - Rate limiting distribuído (se escalar para múltiplas instâncias)

const { createClient } = require('redis');
const logger = require('../utils/logger');

const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on('error', (err) => {
  logger.error(`Erro na conexão com Redis: ${err.message}`);
});

redisClient.on('connect', () => {
  logger.info('Conexão com Redis estabelecida com sucesso.');
});

// A lib "redis" v4+ exige conexão explícita (não conecta sozinha).
async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}

module.exports = { redisClient, connectRedis };

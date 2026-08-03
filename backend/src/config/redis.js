// src/config/redis.js
// Cliente Redis usado para:
//  - Fila de mensagens agendadas / disparos em massa (Etapa 2)
//  - Cache de sessões do WhatsApp
//  - Rate limiting distribuído (se escalar para múltiplas instâncias)

const { createClient } = require('redis');
const logger = require('../utils/logger');

const useTls = !/^redis:\/\/(localhost|127\.0\.0\.1)/.test(process.env.REDIS_URL || '');

const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    ...(useTls ? { tls: true, rejectUnauthorized: false } : {}),
    reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
  },
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
    await Promise.race([
      redisClient.connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout ao conectar no Redis (5s)')), 5000)
      ),
    ]);
  }
}

module.exports = { redisClient, connectRedis };

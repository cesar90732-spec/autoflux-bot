// src/app.js
// Monta a instância do Express com todos os middlewares globais.
// Fica separado de server.js para permitir testes de integração
// (importar "app" sem precisar subir um listener de porta real).

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

// --- Segurança ---
// Helmet define diversos headers HTTP de segurança (XSS, sniffing, etc.)
app.use(helmet());

// CORS restrito à URL do frontend configurada no .env, evitando que
// qualquer domínio arbitrário chame a API diretamente do navegador.
app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  })
);

// Rate limiting global: mitiga ataques de força bruta e DoS básico.
// Limites mais específicos (ex: login) podem ser aplicados por rota.
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em instantes.' },
});
app.use(limiter);

// --- Parsing e performance ---
app.use(express.json({ limit: '10mb' })); // limite evita payloads abusivos
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// --- Logs de acesso HTTP ---
app.use(
  morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

// --- Rotas da API ---
app.use('/api', routes);

// --- Arquivos de mídia enviados (imagens de produto, mídia de mensagens) ---
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- Tratamento de erros (sempre por último) ---
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

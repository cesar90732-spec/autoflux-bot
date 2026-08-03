// src/middleware/errorHandler.js
// Middleware de erro do Express (deve ser o ÚLTIMO "app.use" registrado).
// Centraliza o tratamento de exceções: loga o erro completo no servidor,
// mas devolve ao cliente apenas uma mensagem segura (nunca stack trace
// ou detalhes internos, para não vazar informação sensível).

const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error(`${req.method} ${req.originalUrl} -> ${err.message}\n${err.stack}`);

  // Erros de validação do PostgreSQL (ex: violação de UNIQUE) têm código 23505
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Registro duplicado.' });
  }

  const statusCode = err.statusCode || 500;
  const message =
    statusCode === 500
      ? 'Erro interno do servidor. Nossa equipe já foi notificada.'
      : err.message;

  return res.status(statusCode).json({ error: message });
}

// Middleware para rotas não encontradas (404)
function notFoundHandler(req, res) {
  return res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFoundHandler };

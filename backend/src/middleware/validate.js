// src/middleware/validate.js
// Middleware genérico que executa as regras do express-validator
// declaradas na rota e, se houver erro, retorna 400 com a lista de
// problemas — antes de qualquer lógica de negócio ser executada.
// Isso é uma camada de defesa contra dados malformados e contra
// ataques de injeção (nunca confiar em input do cliente).

const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array().map((e) => e.msg) });
  }
  next();
}

module.exports = validate;

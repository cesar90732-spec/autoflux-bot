// src/middleware/auth.middleware.js
// Protege rotas exigindo um JWT válido no header Authorization.
// Também expõe "requireRole" para restringir rotas por papel
// (ex: apenas administradores podem editar configurações da empresa).

const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Anexa os dados decodificados (userId, companyId, role) à request,
    // disponíveis para todos os controllers seguintes na cadeia.
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

// Uso: router.delete('/users/:id', authenticate, requireRole('admin'), ...)
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Você não tem permissão para esta ação.' });
    }
    next();
  };
}

// Restringe a operações de nível de plataforma (ex: backup do banco
// compartilhado entre todas as empresas do SaaS) — deliberadamente
// separado de "admin", que é um papel por empresa. Só fica true para
// usuários marcados via scripts/grant-platform-admin.js.
function requirePlatformAdmin(req, res, next) {
  if (!req.user || !req.user.isPlatformAdmin) {
    return res.status(403).json({ error: 'Esta ação é restrita a administradores da plataforma.' });
  }
  next();
}

module.exports = { authenticate, requireRole, requirePlatformAdmin };

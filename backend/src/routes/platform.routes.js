// src/routes/platform.routes.js
//
// Restrito a requirePlatformAdmin, mesmo padrão de backup.routes.js:
// lista todas as empresas do SaaS com plano e status de pagamento.
const { Router } = require('express');
const platformController = require('../controllers/platform.controller');
const { authenticate, requirePlatformAdmin } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate, requirePlatformAdmin);

router.get('/companies', platformController.listCompanies);

module.exports = router;

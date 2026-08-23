// src/routes/billing.routes.js
const { Router } = require('express');
const billingController = require('../controllers/billing.controller');
const { authenticate, requirePlatformAdmin } = require('../middleware/auth.middleware');

const router = Router();

// Tudo aqui é restrito ao admin da plataforma (você) — sem gateway/API
// de pagamento, gerar e confirmar cobrança é ação administrativa, não
// pública. Mesmo padrão de backup/platform.routes.
router.use(authenticate, requirePlatformAdmin);

router.post('/companies/:companyId/charge', billingController.createChargeForCompany);
router.post('/charges/:chargeId/confirm', billingController.confirmPayment);

module.exports = router;

// src/routes/company.routes.js
const { Router } = require('express');
const companyController = require('../controllers/company.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate, requireRole('admin'));

router.post('/me/request-deletion', companyController.requestDeletion);
router.post('/me/cancel-deletion', companyController.cancelDeletion);

module.exports = router;

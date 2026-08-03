// src/routes/report.routes.js
const { Router } = require('express');
const reportController = require('../controllers/report.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/overview', reportController.overview);
router.get('/export.csv', reportController.exportCsv);
router.get('/export.pdf', reportController.exportPdf);

module.exports = router;

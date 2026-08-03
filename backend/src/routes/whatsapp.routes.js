// src/routes/whatsapp.routes.js
const { Router } = require('express');
const whatsappController = require('../controllers/whatsapp.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.post('/connect', whatsappController.connect);
router.get('/status', whatsappController.status);
router.post('/disconnect', whatsappController.disconnect);

module.exports = router;

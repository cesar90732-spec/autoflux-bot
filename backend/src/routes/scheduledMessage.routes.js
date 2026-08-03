// src/routes/scheduledMessage.routes.js
const { Router } = require('express');
const scheduledMessageController = require('../controllers/scheduledMessage.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/', scheduledMessageController.list);
router.post('/', scheduledMessageController.create);
router.post('/:id/cancel', scheduledMessageController.cancel);

module.exports = router;

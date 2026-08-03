// src/routes/conversation.routes.js
const { Router } = require('express');
const conversationController = require('../controllers/conversation.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

// IMPORTANTE: a rota de busca precisa vir antes de "/:id/*" para o
// Express não tentar interpretar "search" como um :id de conversa.
router.get('/search', conversationController.search);

router.get('/', conversationController.list);
router.get('/:id/messages', conversationController.listMessages);
router.post('/:id/reply', conversationController.reply);
router.post('/:id/transfer', conversationController.transfer);
router.post('/:id/return-to-bot', conversationController.returnToBot);

module.exports = router;

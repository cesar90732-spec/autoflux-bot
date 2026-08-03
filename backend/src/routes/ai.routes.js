// src/routes/ai.routes.js
const { Router } = require('express');
const aiController = require('../controllers/ai.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

// Configuração de IA da empresa: só administradores podem ver/alterar
// (envolve chave de API e persona/comportamento do bot).
router.get('/settings', requireRole('admin'), aiController.getSettings);
router.put('/settings', requireRole('admin'), aiController.updateSettings);

// Resumo e sugestão de resposta: qualquer atendente autenticado pode usar,
// já que são ferramentas de apoio ao atendimento do dia a dia.
router.post('/conversations/:id/summary', aiController.summarizeConversation);
router.post('/conversations/:id/suggest-reply', aiController.suggestReply);

module.exports = router;

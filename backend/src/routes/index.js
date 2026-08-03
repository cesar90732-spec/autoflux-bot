// src/routes/index.js
// Ponto único que agrega todos os módulos de rota sob o prefixo /api.
// Nas próximas etapas, novos módulos (whatsapp, contacts, messages,
// campaigns, reports, ai, etc.) serão importados e registrados aqui —
// isso é o que torna a arquitetura "pronta para expansão".

const { Router } = require('express');
const authRoutes = require('./auth.routes');
const whatsappRoutes = require('./whatsapp.routes');
const keywordRoutes = require('./keyword.routes');
const flowRoutes = require('./flow.routes');
const contactRoutes = require('./contact.routes');
const conversationRoutes = require('./conversation.routes');
const mediaRoutes = require('./media.routes');
const productRoutes = require('./product.routes');
const broadcastListRoutes = require('./broadcastList.routes');
const scheduledMessageRoutes = require('./scheduledMessage.routes');
const aiRoutes = require('./ai.routes');
const reportRoutes = require('./report.routes');
const backupRoutes = require('./backup.routes');
const platformRoutes = require('./platform.routes');
const router = Router();

router.use('/auth', authRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/keywords', keywordRoutes);
router.use('/flows', flowRoutes);
router.use('/contacts', contactRoutes);
router.use('/conversations', conversationRoutes);
router.use('/media', mediaRoutes);
router.use('/products', productRoutes);
router.use('/broadcast-lists', broadcastListRoutes);
router.use('/scheduled-messages', scheduledMessageRoutes);
router.use('/ai', aiRoutes);
router.use('/reports', reportRoutes);
router.use('/backups', backupRoutes);
router.use('/platform', platformRoutes);
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'autoflux-backend', timestamp: new Date().toISOString() });
});

module.exports = router;

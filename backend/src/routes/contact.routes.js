// src/routes/contact.routes.js
const { Router } = require('express');
const contactController = require('../controllers/contact.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/', contactController.list);
router.post('/:id/tags', contactController.addTag);
router.delete('/:id/tags/:tagId', contactController.removeTag);

module.exports = router;

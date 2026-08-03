// src/routes/backup.routes.js
//
// Restrito a requirePlatformAdmin (não a requireRole('admin')): como o
// banco é compartilhado entre todas as empresas do SaaS, o backup do
// pg_dump contém os dados de todas elas — um admin de empresa cliente
// não deveria conseguir baixá-lo. isPlatformAdmin é uma flag separada
// do "role", concedida manualmente via scripts/grant-platform-admin.js.
const { Router } = require('express');
const backupController = require('../controllers/backup.controller');
const { authenticate, requirePlatformAdmin } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate, requirePlatformAdmin);

router.get('/', backupController.list);
router.post('/', backupController.triggerNow);
router.get('/:filename/download', backupController.download);

module.exports = router;

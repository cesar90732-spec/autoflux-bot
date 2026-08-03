// src/controllers/backup.controller.js
// Backup automático do banco. Restrito a administradores de PLATAFORMA
// (isPlatformAdmin, ver auth.middleware.js) — não a admins de empresa —
// porque o banco é compartilhado entre todos os tenants do SaaS e o
// dump contém dados de todas as empresas, não só da de quem o baixou.

const backupService = require('../services/backup.service');
const backupQueueService = require('../services/backupQueue.service');

async function list(req, res, next) {
  try {
    const backups = backupService.listBackups();
    return res.json({ backups });
  } catch (err) {
    next(err);
  }
}

// POST /api/backups — dispara um backup imediatamente (fora do horário
// agendado), útil antes de uma manutenção ou migração arriscada.
async function triggerNow(req, res, next) {
  try {
    await backupQueueService.triggerNow();
    return res.status(202).json({ message: 'Backup enfileirado. Atualize a lista em alguns instantes.' });
  } catch (err) {
    next(err);
  }
}

async function download(req, res, next) {
  try {
    const filePath = backupService.resolveBackupPath(req.params.filename);
    if (!filePath) {
      return res.status(404).json({ error: 'Backup não encontrado.' });
    }
    return res.download(filePath);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, triggerNow, download };

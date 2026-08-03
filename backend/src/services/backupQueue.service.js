// src/services/backupQueue.service.js
// Agenda o backup automático do banco usando um "repeatable job" do
// BullMQ — mesma infra de filas já usada para mensagens agendadas
// (Etapa 3), então não precisamos adicionar node-cron nem nenhuma outra
// dependência só para isso. O padrão de repetição vem de BACKUP_CRON
// (.env), no formato cron padrão (ex: "0 3 * * *" = todo dia às 3h).

const { Queue, Worker } = require('bullmq');
const logger = require('../utils/logger');
const backupService = require('./backup.service');

const QUEUE_NAME = 'database-backup';
const JOB_NAME = 'run-backup';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
};

const backupQueue = new Queue(QUEUE_NAME, { connection });

// Garante que existe (e apenas um) job repetido agendado com o padrão
// cron atual. Se BACKUP_CRON mudar no .env e o backend reiniciar, o
// job repetido antigo é removido e substituído pelo novo.
async function scheduleRecurringBackup() {
  const pattern = process.env.BACKUP_CRON || '0 3 * * *';

  const existingJobs = await backupQueue.getRepeatableJobs();
  for (const job of existingJobs) {
    if (job.pattern !== pattern) {
      await backupQueue.removeRepeatableByKey(job.key);
    }
  }

  const alreadyScheduled = existingJobs.some((job) => job.pattern === pattern);
  if (!alreadyScheduled) {
    await backupQueue.add(JOB_NAME, {}, { repeat: { pattern } });
  }

  logger.info(`Backup automático agendado com o padrão cron "${pattern}".`);
}

const worker = new Worker(
  QUEUE_NAME,
  async () => {
    await backupService.runBackup();
  },
  { connection }
);

worker.on('failed', (job, err) => {
  logger.error(`Backup automático (job ${job?.id}) falhou: ${err.message}`);
});

// Dispara um backup imediatamente, fora do agendamento (usado pelo
// botão "Fazer backup agora" no painel).
async function triggerNow() {
  await backupQueue.add(JOB_NAME, {});
}

scheduleRecurringBackup().catch((err) =>
  logger.error(`Falha ao agendar o backup automático: ${err.message}`)
);

module.exports = { backupQueue, triggerNow };

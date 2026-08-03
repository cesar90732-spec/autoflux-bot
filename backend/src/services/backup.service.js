// src/services/backup.service.js
// Backup automático do banco de dados via pg_dump (formato "custom",
// -Fc, que já vem comprimido e permite restauração seletiva com
// pg_restore). Não usamos nenhuma lib de backup — pg_dump já resolve
// isso de forma confiável, então só orquestramos a chamada e a
// retenção dos arquivos gerados.

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const logger = require('../utils/logger');

const execFileAsync = promisify(execFile);

const BACKUP_DIR = path.resolve(process.env.BACKUP_DIR || './backups');
const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS) || 14;
const FILE_PREFIX = 'autoflux_';

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function timestampedFilename() {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
  return `${FILE_PREFIX}${stamp}.dump`;
}

// Executa o pg_dump de fato. Usa DATABASE_URL diretamente (--dbname
// aceita a connection string completa), formato -Fc (custom, comprimido).
async function runBackup() {
  ensureBackupDir();

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não configurada — não é possível fazer backup.');
  }

  const filename = timestampedFilename();
  const filePath = path.join(BACKUP_DIR, filename);

  try {
    await execFileAsync('pg_dump', [
      '--dbname', process.env.DATABASE_URL,
      '--format', 'custom',
      '--file', filePath,
    ]);
  } catch (err) {
    // Limpa um arquivo parcial se o dump falhou no meio do caminho.
    fs.existsSync(filePath) && fs.unlinkSync(filePath);
    throw new Error(`Falha ao executar pg_dump: ${err.message}`);
  }

  const { size } = fs.statSync(filePath);
  logger.info(`Backup criado com sucesso: ${filename} (${(size / 1024 / 1024).toFixed(2)} MB)`);

  await cleanupOldBackups();

  return { filename, size, createdAt: new Date() };
}

// Remove backups mais antigos que BACKUP_RETENTION_DAYS, para o disco
// não crescer indefinidamente.
async function cleanupOldBackups() {
  ensureBackupDir();
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith(FILE_PREFIX));

  for (const file of files) {
    const filePath = path.join(BACKUP_DIR, file);
    const { mtimeMs } = fs.statSync(filePath);
    if (mtimeMs < cutoff) {
      fs.unlinkSync(filePath);
      logger.info(`Backup expirado removido: ${file}`);
    }
  }
}

function listBackups() {
  ensureBackupDir();
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith(FILE_PREFIX))
    .map((filename) => {
      const { size, mtime } = fs.statSync(path.join(BACKUP_DIR, filename));
      return { filename, size, createdAt: mtime };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

// Resolve o caminho absoluto de um backup pelo nome do arquivo,
// validando contra a listagem real em disco — nunca monta o caminho
// direto a partir do input do usuário, para evitar path traversal
// (ex: "../../etc/passwd").
function resolveBackupPath(filename) {
  const match = listBackups().find((b) => b.filename === filename);
  if (!match) return null;
  return path.join(BACKUP_DIR, match.filename);
}

module.exports = { runBackup, cleanupOldBackups, listBackups, resolveBackupPath, BACKUP_DIR };

// src/config/upload.js
// Configuração central do multer para upload de arquivos de mídia
// (catálogo de produtos, envio em conversas, campanhas de transmissão).
// Salva em disco com nome único, validando tipo MIME e limitando o
// tamanho para evitar abuso (uploads gigantes derrubando o servidor).

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'video/mp4',
  'video/3gpp',
  'audio/mpeg',
  'audio/ogg',
  'audio/mp4',
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB por arquivo
});

// Deriva o content_type do domínio (text/image/pdf/video/audio) a
// partir do mimetype recebido — usado para preencher a coluna
// "content_type" das mensagens/produtos/agendamentos.
function resolveContentType(mimetype) {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype === 'application/pdf') return 'pdf';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'text';
}

module.exports = { upload, resolveContentType, UPLOAD_DIR };

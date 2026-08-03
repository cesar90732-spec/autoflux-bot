// src/services/whatsapp.service.js
// Gerencia as conexões WhatsApp (uma por empresa) usando Baileys.
// Mantém os sockets ativos em memória (Map), com o estado de autenticação
// persistido em disco (pasta configurada em WHATSAPP_SESSION_DIR), para
// que a sessão sobreviva a um restart do backend sem precisar escanear
// o QR Code de novo.

const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');

const logger = require('../utils/logger');
const sessionModel = require('../models/whatsappSession.model');
const contactModel = require('../models/contact.model');
const conversationModel = require('../models/conversation.model');
const messageModel = require('../models/message.model');
const companyModel = require('../models/company.model');
const automationService = require('./automation.service');

const SESSION_DIR = process.env.WHATSAPP_SESSION_DIR || './sessions';

// Estado em memória de cada conexão ativa. Chave = companyId.
// { sock, status: 'connecting'|'qr_pending'|'connected'|'disconnected', qrDataUrl, phoneNumber }
const connections = new Map();

// Logger silencioso para o Baileys (ele é MUITO verboso por padrão).
// Erros continuam sendo logados pelo nosso winston nos handlers abaixo.
const baileysLogger = pino({ level: 'silent' });

function getConnectionState(companyId) {
  return connections.get(companyId) || { status: 'disconnected', qrDataUrl: null };
}

function sessionPath(companyId) {
  return path.join(SESSION_DIR, companyId);
}

// Extrai o texto de uma mensagem do Baileys, cobrindo os formatos mais
// comuns (mensagem simples, "extendedTextMessage" quando há reply, etc.)
function extractMessageText(message) {
  return (
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    message.message?.imageMessage?.caption ||
    message.message?.videoMessage?.caption ||
    ''
  );
}

// Inicia (ou reinicia) a conexão WhatsApp de uma empresa. Idempotente:
// se já existe uma conexão ativa, apenas retorna o estado atual.
async function startConnection(companyId) {
  const existing = connections.get(companyId);
  if (existing && (existing.status === 'connected' || existing.status === 'connecting')) {
    return getConnectionState(companyId);
  }

  connections.set(companyId, { sock: null, status: 'connecting', qrDataUrl: null });
  await sessionModel.upsertStatus(companyId, { status: 'connecting' });

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath(companyId));
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: baileysLogger,
    printQRInTerminal: false,
  });

  connections.set(companyId, { sock, status: 'connecting', qrDataUrl: null });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    await handleConnectionUpdate(companyId, update);
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      await handleIncomingMessage(companyId, msg).catch((err) =>
        logger.error(`Erro ao processar mensagem da empresa ${companyId}: ${err.message}`)
      );
    }
  });

  return getConnectionState(companyId);
}

async function handleConnectionUpdate(companyId, update) {
  const { connection, lastDisconnect, qr } = update;
  const current = connections.get(companyId) || {};

  if (qr) {
    const qrDataUrl = await QRCode.toDataURL(qr);
    connections.set(companyId, { ...current, status: 'qr_pending', qrDataUrl });
    await sessionModel.upsertStatus(companyId, { status: 'qr_pending' });
    logger.info(`QR Code gerado para a empresa ${companyId}`);
  }

  if (connection === 'open') {
    const phoneNumber = current.sock?.user?.id?.split(':')[0] || null;
    connections.set(companyId, { ...current, status: 'connected', qrDataUrl: null, phoneNumber });
    await sessionModel.upsertStatus(companyId, { status: 'connected', phoneNumber });
    logger.info(`WhatsApp conectado para a empresa ${companyId} (${phoneNumber})`);
  }

  if (connection === 'close') {
    const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
    const loggedOut = statusCode === DisconnectReason.loggedOut;

    connections.set(companyId, { sock: null, status: 'disconnected', qrDataUrl: null });
    await sessionModel.upsertStatus(companyId, { status: 'disconnected' });

    if (loggedOut) {
      // Sessão desconectada pelo próprio usuário no celular — não tenta
      // reconectar automaticamente, é preciso gerar um novo QR Code.
      logger.info(`Sessão da empresa ${companyId} foi desconectada (logout).`);
    } else {
      // Queda de rede/instabilidade — tenta reconectar automaticamente.
      logger.warn(`Conexão da empresa ${companyId} caiu, tentando reconectar...`);
      setTimeout(() => startConnection(companyId).catch((e) => logger.error(e.message)), 3000);
    }
  }
}

// Processa uma mensagem recebida: identifica o contato, atualiza a
// conversa, decide a resposta via automation.service e envia de volta.
async function handleIncomingMessage(companyId, msg) {
  // Ignora mensagens enviadas por nós mesmos, notificações de status,
  // e mensagens de grupo (grupos ficam fora do escopo desta etapa).
  if (msg.key.fromMe) return;
  if (!msg.message) return;
  const remoteJid = msg.key.remoteJid;
  if (!remoteJid || remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast') return;

  const text = extractMessageText(msg);
  if (!text) return; // mídia sem legenda, reação, etc. — fora do escopo do bot por ora

  const phoneNumber = remoteJid.split('@')[0];
  const contactName = msg.pushName || phoneNumber;

  const contact = await contactModel.findOrCreate(companyId, phoneNumber, contactName);
  const conversation = await conversationModel.findOrCreate(companyId, contact.id);
  await conversationModel.touch(conversation.id);

  await messageModel.create({
    conversationId: conversation.id,
    direction: 'inbound',
    senderType: 'contact',
    content: text,
  });

  const company = await companyModel.findById(companyId);
  const replies = await automationService.processIncomingMessage({ company, conversation, text });

  for (const reply of replies) {
    await sendTextMessage(companyId, remoteJid, reply.text);
    await messageModel.create({
      conversationId: conversation.id,
      direction: 'outbound',
      senderType: 'bot',
      content: reply.text,
      generatedByAi: Boolean(reply.generatedByAi),
    });
  }
}

// Monta o payload de mídia esperado pelo Baileys a partir do tipo de
// conteúdo (definido em config/upload.js: image, pdf, video, audio).
// "pdf" e outros arquivos genéricos vão como "document" no WhatsApp.
function buildMediaPayload(contentType, buffer, caption, fileName) {
  switch (contentType) {
    case 'image':
      return { image: buffer, caption };
    case 'video':
      return { video: buffer, caption };
    case 'audio':
      return { audio: buffer, mimetype: 'audio/mp4', ptt: false };
    case 'pdf':
      return { document: buffer, mimetype: 'application/pdf', fileName: fileName || 'documento.pdf', caption };
    default:
      throw new Error(`Tipo de mídia não suportado para envio: ${contentType}`);
  }
}

// Envia uma mensagem de mídia (imagem, PDF, vídeo ou áudio). "mediaUrl"
// é o caminho relativo salvo no banco (ex: "/uploads/arquivo.png"),
// resolvido aqui para o caminho absoluto em disco.
async function sendMediaMessage(companyId, jid, { contentType, mediaUrl, caption }) {
  const { sock, status } = getConnectionState(companyId);
  if (!sock || status !== 'connected') {
    throw new Error('WhatsApp não está conectado para esta empresa.');
  }

  const absolutePath = path.join(__dirname, '../../uploads', path.basename(mediaUrl));
  if (!fs.existsSync(absolutePath)) {
    throw new Error('Arquivo de mídia não encontrado no servidor.');
  }

  const buffer = fs.readFileSync(absolutePath);
  const payload = buildMediaPayload(contentType, buffer, caption, path.basename(mediaUrl));
  await sock.sendMessage(jid, payload);
}

// Envia uma mensagem de texto simples. Usado tanto pelo motor de
// automação quanto por qualquer envio manual futuro (Etapa 3).
async function sendTextMessage(companyId, jid, text) {
  const { sock, status } = getConnectionState(companyId);
  if (!sock || status !== 'connected') {
    throw new Error('WhatsApp não está conectado para esta empresa.');
  }
  await sock.sendMessage(jid, { text });
}

async function disconnectCompany(companyId) {
  const { sock } = getConnectionState(companyId);
  if (sock) {
    await sock.logout().catch(() => {});
  }
  connections.delete(companyId);
  await sessionModel.upsertStatus(companyId, { status: 'disconnected' });
}

function getStatus(companyId) {
  const state = getConnectionState(companyId);
  return { status: state.status, phoneNumber: state.phoneNumber || null };
}

function getQrCode(companyId) {
  const state = getConnectionState(companyId);
  return state.qrDataUrl || null;
}

module.exports = {
  startConnection,
  disconnectCompany,
  getStatus,
  getQrCode,
  sendTextMessage,
  sendMediaMessage,
};

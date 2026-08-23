// src/controllers/conversation.controller.js
const conversationModel = require('../models/conversation.model');
const messageModel = require('../models/message.model');
const whatsappService = require('../services/whatsapp.service');

// GET /api/conversations?status=open
async function list(req, res, next) {
  try {
    const conversations = await conversationModel.listByCompany(req.user.companyId, {
      status: req.query.status,
    });
    return res.json({ conversations });
  } catch (err) {
    next(err);
  }
}

// Confere que a conversa pedida na URL (:id) realmente pertence à
// empresa do usuário logado. SEM ISSO, qualquer usuário autenticado de
// qualquer empresa poderia ler/responder/transferir conversas de outras
// empresas só adivinhando ou trocando o UUID na URL — é a checagem mais
// importante de todo o multi-tenant, então toda rota abaixo passa por
// aqui antes de tocar na conversa.
async function loadOwnedConversation(req, res) {
  const conversation = await conversationModel.findById(req.params.id, req.user.companyId);
  if (!conversation) {
    res.status(404).json({ error: 'Conversa não encontrada.' });
    return null;
  }
  return conversation;
}

// GET /api/conversations/:id/messages
async function listMessages(req, res, next) {
  try {
    const conversation = await loadOwnedConversation(req, res);
    if (!conversation) return;

    const messages = await messageModel.listByConversation(req.params.id);
    return res.json({ messages });
  } catch (err) {
    next(err);
  }
}

// POST /api/conversations/:id/reply  { text, phoneNumber, contentType?, mediaUrl? }
// Permite que um atendente humano responda manualmente pelo painel,
// com texto simples ou mídia (imagem/PDF/vídeo/áudio já enviada via
// POST /api/media/upload).
async function reply(req, res, next) {
  try {
    const conversation = await loadOwnedConversation(req, res);
    if (!conversation) return;

    const { text, phoneNumber, contentType = 'text', mediaUrl } = req.body;
    if (!phoneNumber || (contentType === 'text' && !text) || (contentType !== 'text' && !mediaUrl)) {
      return res.status(400).json({ error: 'Dados insuficientes para enviar a mensagem.' });
    }
    const jid = `${phoneNumber}@s.whatsapp.net`;

    if (contentType === 'text') {
      await whatsappService.sendTextMessage(req.user.companyId, jid, text);
    } else {
      await whatsappService.sendMediaMessage(req.user.companyId, jid, {
        contentType,
        mediaUrl,
        caption: text,
      });
    }

    const message = await messageModel.create({
      conversationId: req.params.id,
      direction: 'outbound',
      senderType: 'user',
      senderUserId: req.user.userId,
      contentType,
      content: text || null,
      mediaUrl: mediaUrl || null,
    });
    await conversationModel.touch(req.params.id);

    return res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
}

// POST /api/conversations/:id/transfer
// O atendente assume a conversa manualmente (ex: cliente pediu ajuda
// mesmo sem o bot ter transferido automaticamente).
async function transfer(req, res, next) {
  try {
    const owned = await loadOwnedConversation(req, res);
    if (!owned) return;

    const conversation = await conversationModel.transferToHuman(req.params.id, req.user.userId);
    return res.json({ conversation });
  } catch (err) {
    next(err);
  }
}

// POST /api/conversations/:id/return-to-bot
async function returnToBot(req, res, next) {
  try {
    const owned = await loadOwnedConversation(req, res);
    if (!owned) return;

    const conversation = await conversationModel.returnToBot(req.params.id);
    return res.json({ conversation });
  } catch (err) {
    next(err);
  }
}

// GET /api/conversations/search?q=texto
async function search(req, res, next) {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Informe o termo de busca (?q=).' });
    const results = await messageModel.searchByCompany(req.user.companyId, q);
    return res.json({ results });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, listMessages, reply, transfer, returnToBot, search };

// src/controllers/scheduledMessage.controller.js
const scheduledMessageModel = require('../models/scheduledMessage.model');
const queueService = require('../services/queue.service');

async function list(req, res, next) {
  try {
    const messages = await scheduledMessageModel.listByCompany(req.user.companyId);
    return res.json({ messages });
  } catch (err) {
    next(err);
  }
}

// POST /api/scheduled-messages
// Body: { contactId? , broadcastListId?, contentType, content, mediaUrl?, scheduledAt }
// Exatamente um entre contactId e broadcastListId deve ser informado.
async function create(req, res, next) {
  try {
    const { contactId, broadcastListId, contentType, content, mediaUrl, scheduledAt } = req.body;

    if (!!contactId === !!broadcastListId) {
      return res
        .status(400)
        .json({ error: 'Informe um contato OU uma lista de transmissão (não os dois).' });
    }
    if (!scheduledAt || new Date(scheduledAt) <= new Date()) {
      return res.status(400).json({ error: 'Informe uma data/hora futura para o agendamento.' });
    }
    if (contentType !== 'text' && !mediaUrl) {
      return res.status(400).json({ error: 'Envie a mídia antes de agendar (POST /api/media/upload).' });
    }

    const scheduledMessage = await scheduledMessageModel.create(req.user.companyId, {
      contactId,
      broadcastListId,
      contentType: contentType || 'text',
      content,
      mediaUrl,
      scheduledAt,
      createdBy: req.user.userId,
    });

    await queueService.enqueue(scheduledMessage);

    return res.status(201).json({ scheduledMessage });
  } catch (err) {
    next(err);
  }
}

async function cancel(req, res, next) {
  try {
    const cancelled = await scheduledMessageModel.cancel(req.params.id, req.user.companyId);
    if (!cancelled) {
      return res.status(404).json({ error: 'Mensagem não encontrada ou já processada.' });
    }
    return res.json({ scheduledMessage: cancelled });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, cancel };

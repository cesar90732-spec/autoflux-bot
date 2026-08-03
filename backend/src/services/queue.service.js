// src/services/queue.service.js
// Fila de agendamento baseada em BullMQ + Redis. Quando uma mensagem é
// agendada (scheduled_messages), um job é enfileirado com "delay" igual
// à diferença entre agora e o horário agendado — o Redis/BullMQ cuida
// de disparar o job automaticamente na hora certa, mesmo que o backend
// seja reiniciado no meio do caminho (os jobs ficam persistidos no Redis).

const { Queue, Worker } = require('bullmq');
const logger = require('../utils/logger');
const scheduledMessageModel = require('../models/scheduledMessage.model');
const broadcastListModel = require('../models/broadcastList.model');
const contactModel = require('../models/contact.model');
const conversationModel = require('../models/conversation.model');
const messageModel = require('../models/message.model');
const whatsappService = require('./whatsapp.service');

const QUEUE_NAME = 'scheduled-messages';

// BullMQ exige a conexão no formato aceito pelo ioredis (host/port),
// não a URL diretamente — por isso parseamos aqui.
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
};

const scheduledMessagesQueue = new Queue(QUEUE_NAME, { connection });

// Enfileira um job para uma mensagem agendada já persistida no banco.
async function enqueue(scheduledMessage) {
  const delay = Math.max(0, new Date(scheduledMessage.scheduled_at).getTime() - Date.now());
  await scheduledMessagesQueue.add(
    'send',
    { scheduledMessageId: scheduledMessage.id },
    { delay, attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
  );
  logger.info(`Mensagem agendada ${scheduledMessage.id} enfileirada (delay: ${delay}ms).`);
}

// Envia a mensagem de fato (texto ou mídia) para um único contato,
// registrando no histórico da conversa correspondente.
async function sendToContact(companyId, contact, { contentType, content, mediaUrl }) {
  const jid = `${contact.phone_number}@s.whatsapp.net`;

  if (contentType === 'text') {
    await whatsappService.sendTextMessage(companyId, jid, content);
  } else {
    await whatsappService.sendMediaMessage(companyId, jid, {
      contentType,
      mediaUrl,
      caption: content,
    });
  }

  const conversation = await conversationModel.findOrCreate(companyId, contact.id);
  await messageModel.create({
    conversationId: conversation.id,
    direction: 'outbound',
    senderType: 'bot',
    contentType,
    content,
    mediaUrl,
  });
  await conversationModel.touch(conversation.id);
}

// Worker que efetivamente processa os jobs quando chega a hora agendada.
const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const scheduledMessage = await scheduledMessageModel.findById(job.data.scheduledMessageId);
    if (!scheduledMessage || scheduledMessage.status !== 'pending') {
      return; // foi cancelada ou já processada
    }

    const payload = {
      contentType: scheduledMessage.content_type,
      content: scheduledMessage.content,
      mediaUrl: scheduledMessage.media_url,
    };

    try {
      if (scheduledMessage.contact_id) {
        const contact = await contactModel.findById(
          scheduledMessage.company_id,
          scheduledMessage.contact_id
        );
        if (!contact) throw new Error('Contato não encontrado.');
        await sendToContact(scheduledMessage.company_id, contact, payload);
      } else if (scheduledMessage.broadcast_list_id) {
        const contacts = await broadcastListModel.listContacts(scheduledMessage.broadcast_list_id);
        // Envio sequencial com um pequeno intervalo entre mensagens para
        // reduzir o risco de bloqueio por comportamento de spam do WhatsApp.
        for (const contact of contacts) {
          await sendToContact(scheduledMessage.company_id, contact, payload);
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }

      await scheduledMessageModel.updateStatus(scheduledMessage.id, 'sent');
      logger.info(`Mensagem agendada ${scheduledMessage.id} enviada com sucesso.`);
    } catch (err) {
      await scheduledMessageModel.updateStatus(scheduledMessage.id, 'failed', err.message);
      logger.error(`Falha ao enviar mensagem agendada ${scheduledMessage.id}: ${err.message}`);
      throw err; // permite que o BullMQ aplique a política de retry configurada
    }
  },
  { connection }
);

worker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} da fila ${QUEUE_NAME} falhou definitivamente: ${err.message}`);
});

module.exports = { scheduledMessagesQueue, enqueue };

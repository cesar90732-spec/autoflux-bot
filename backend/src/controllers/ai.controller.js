// src/controllers/ai.controller.js
// Etapa 4: endpoints de integração com IA.
//   - GET/PUT /api/ai/settings          -> configuração de IA da empresa
//   - POST    /api/ai/conversations/:id/summary        -> resume a conversa
//   - POST    /api/ai/conversations/:id/suggest-reply   -> sugere resposta ao atendente
//
// Resumo e sugestão são sempre escopados pela empresa do usuário logado
// (req.user.companyId), então um atendente nunca consegue gerar conteúdo
// a partir de uma conversa de outra empresa.

const companyModel = require('../models/company.model');
const conversationModel = require('../models/conversation.model');
const messageModel = require('../models/message.model');
const aiService = require('../services/ai/ai.service');

const VALID_MODES = ['suggest', 'auto'];

async function getSettings(req, res, next) {
  try {
    const company = await companyModel.findById(req.user.companyId);
    const settings = aiService.resolveSettings(company);
    // Nunca devolve a chave de API para o frontend — só indica se está definida.
    const { api_key, provider, model, ...safeSettings } = settings;
    return res.json({ settings: { ...safeSettings, has_api_key: Boolean(aiService.resolveApiKey(settings)) } });
  } catch (err) {
    next(err);
  }
}

// Provedor/modelo/chave de IA são fixos no sistema (Groq, configurado
// via variável de ambiente no servidor) — o cliente nunca escolhe isso,
// então essas opções nem chegam a existir no formulário do frontend.
// Este endpoint só aceita o que a empresa de fato controla: se a IA está
// ligada, o modo de operação, a persona e os parâmetros de geração.
async function updateSettings(req, res, next) {
  try {
    const { enabled, mode, persona, temperature, maxHistoryMessages } = req.body;

    if (mode && !VALID_MODES.includes(mode)) {
      return res.status(400).json({ error: `Modo inválido. Use um de: ${VALID_MODES.join(', ')}.` });
    }
    if (temperature !== undefined && (temperature < 0 || temperature > 1)) {
      return res.status(400).json({ error: 'A temperatura deve estar entre 0 e 1.' });
    }

    const company = await companyModel.findById(req.user.companyId);
    const current = aiService.resolveSettings(company);

    const updated = {
      ...current,
      ...(enabled !== undefined && { enabled: Boolean(enabled) }),
      ...(mode && { mode }),
      ...(persona !== undefined && { persona }),
      ...(temperature !== undefined && { temperature }),
      ...(maxHistoryMessages !== undefined && { max_history_messages: maxHistoryMessages }),
    };

    const result = await companyModel.updateAiSettings(req.user.companyId, updated);
    const { api_key, provider, model, ...safeSettings } = result.ai_settings;
    return res.json({ settings: { ...safeSettings, has_api_key: Boolean(aiService.resolveApiKey(result.ai_settings)) } });
  } catch (err) {
    next(err);
  }
}

async function loadConversationOr404(req, res) {
  const conversation = await conversationModel.findById(req.params.id, req.user.companyId);
  if (!conversation) {
    res.status(404).json({ error: 'Conversa não encontrada.' });
    return null;
  }
  return conversation;
}

async function summarizeConversation(req, res, next) {
  try {
    const conversation = await loadConversationOr404(req, res);
    if (!conversation) return;

    const company = await companyModel.findById(req.user.companyId);
    const settings = aiService.resolveSettings(company);
    if (!aiService.resolveApiKey(settings)) {
      return res.status(400).json({ error: 'Configure uma chave de API de IA antes de gerar resumos.' });
    }

    const history = await messageModel.listByConversation(conversation.id, { limit: 100 });
    if (history.length === 0) {
      return res.status(400).json({ error: 'Esta conversa ainda não tem mensagens para resumir.' });
    }

    const summary = await aiService.summarizeConversation({ company, settings, history });
    const saved = await conversationModel.saveSummary(conversation.id, summary);
    return res.json({ summary: saved.ai_summary, updatedAt: saved.ai_summary_updated_at });
  } catch (err) {
    next(err);
  }
}

async function suggestReply(req, res, next) {
  try {
    const conversation = await loadConversationOr404(req, res);
    if (!conversation) return;

    const company = await companyModel.findById(req.user.companyId);
    const settings = aiService.resolveSettings(company);
    if (!aiService.resolveApiKey(settings)) {
      return res.status(400).json({ error: 'Configure uma chave de API de IA antes de gerar sugestões.' });
    }

    const history = await messageModel.listByConversation(conversation.id, { limit: 50 });
    const suggestion = await aiService.suggestReply({ company, settings, history });
    return res.json({ suggestion });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSettings, updateSettings, summarizeConversation, suggestReply };

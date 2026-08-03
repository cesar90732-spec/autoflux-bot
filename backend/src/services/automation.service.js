// src/services/automation.service.js
// Motor de decisão do atendimento automático. Para cada mensagem
// recebida, decide (nessa ordem de prioridade):
//   1. Se a conversa já foi transferida para humano -> não responde nada
//   2. Se há um fluxo em andamento -> processa a opção escolhida
//   3. Se o texto dispara um fluxo (trigger_keyword) -> inicia o fluxo
//   4. Se o texto casa com uma palavra-chave simples -> responde direto
//   5. Se está fora do horário de funcionamento -> avisa o horário
//   6. Se a empresa tem IA habilitada no modo "auto" (Etapa 4) -> a IA
//      responde usando o histórico da conversa e a persona da empresa
//   7. Caso contrário -> mensagem de fallback + transfere para humano
//
// Retorna sempre um array de "ações de resposta" ({ text, generatedByAi? })
// que o chamador (whatsapp.service.js) envia de volta pelo WhatsApp.

const flowModel = require('../models/flow.model');
const keywordModel = require('../models/keyword.model');
const conversationModel = require('../models/conversation.model');
const messageModel = require('../models/message.model');
const aiService = require('./ai/ai.service');
const logger = require('../utils/logger');

const TRANSFER_OPTION = '__transfer__';

function normalize(text) {
  return (text || '').trim().toLowerCase();
}

// Verifica se o horário atual está dentro do "business_hours" da empresa.
// Formato esperado em company.business_hours (JSONB):
// { "open": "08:00", "close": "20:00", "days": [1,2,3,4,5,6] }  // 0=domingo
function isWithinBusinessHours(businessHours) {
  if (!businessHours || !businessHours.open || !businessHours.close) {
    return true; // sem configuração definida, assume sempre aberto
  }
  const now = new Date();
  const day = now.getDay();
  if (Array.isArray(businessHours.days) && !businessHours.days.includes(day)) {
    return false;
  }
  const [openH, openM] = businessHours.open.split(':').map(Number);
  const [closeH, closeM] = businessHours.close.split(':').map(Number);
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const minutesOpen = openH * 60 + openM;
  const minutesClose = closeH * 60 + closeM;
  return minutesNow >= minutesOpen && minutesNow < minutesClose;
}

async function handleFlowStep(conversation, flow, incomingText) {
  const steps = flow.steps || {};
  const currentStep = steps[conversation.active_flow_step];

  if (!currentStep) {
    // Estado inconsistente (fluxo editado no meio do caminho) — reinicia
    return startFlow(conversation, flow);
  }

  const chosenOption = currentStep.options?.[normalize(incomingText)];

  if (!chosenOption) {
    // Opção inválida: repete a mensagem do step atual
    return [{ text: `Não entendi essa opção. ${currentStep.message}` }];
  }

  if (chosenOption === TRANSFER_OPTION) {
    await conversationModel.transferToHuman(conversation.id);
    return [
      {
        text: 'Já vou te transferir para um de nossos atendentes. Só um instante! 🙂',
      },
    ];
  }

  const nextStep = steps[chosenOption];
  if (!nextStep) {
    logger.warn(`Fluxo ${flow.id}: step "${chosenOption}" não existe, encerrando fluxo.`);
    await conversationModel.setFlowPosition(conversation.id, null, null);
    return [{ text: 'Certo! Se precisar de mais alguma coisa, é só chamar.' }];
  }

  await conversationModel.setFlowPosition(conversation.id, flow.id, chosenOption);

  const isFinalStep = !nextStep.options || Object.keys(nextStep.options).length === 0;
  if (isFinalStep) {
    // Step sem opções = fim do fluxo, libera a conversa para nova interação
    await conversationModel.setFlowPosition(conversation.id, null, null);
  }

  return [{ text: nextStep.message }];
}

async function startFlow(conversation, flow) {
  const startStep = flow.steps?.start;
  if (!startStep) {
    logger.warn(`Fluxo ${flow.id} não possui step "start" configurado.`);
    return [];
  }
  await conversationModel.setFlowPosition(conversation.id, flow.id, 'start');
  return [{ text: startStep.message }];
}

// Ponto de entrada principal, chamado pelo whatsapp.service.js a cada
// mensagem de texto recebida.
async function processIncomingMessage({ company, conversation, text }) {
  // 1. Conversa já está com atendente humano — o bot fica em silêncio.
  if (!conversation.is_bot_active) {
    return [];
  }

  // 2. Há um fluxo em andamento para este contato — continua o fluxo.
  if (conversation.active_flow_id && conversation.active_flow_step) {
    const flow = await flowModel.findById(conversation.active_flow_id, company.id);
    if (flow && flow.is_active) {
      return handleFlowStep(conversation, flow, text);
    }
  }

  const normalizedText = normalize(text);

  // 3. O texto dispara um fluxo novo?
  const flows = await flowModel.listActiveByCompany(company.id);
  const matchedFlow = flows.find((f) => normalize(f.trigger_keyword) === normalizedText);
  if (matchedFlow) {
    return startFlow(conversation, matchedFlow);
  }

  // 4. O texto casa com alguma palavra-chave simples (busca por "contém")?
  const keywords = await keywordModel.listActiveByCompany(company.id);
  const matchedKeyword = keywords.find((k) => normalizedText.includes(normalize(k.trigger_text)));
  if (matchedKeyword) {
    return [{ text: matchedKeyword.reply_text }];
  }

  // 5. Fora do horário de funcionamento?
  if (!isWithinBusinessHours(company.business_hours)) {
    const hours = company.business_hours;
    return [
      {
        text: `No momento estamos fora do horário de atendimento (funcionamos das ${hours.open} às ${hours.close}). Assim que possível, um atendente irá te responder!`,
      },
    ];
  }

  // 6. Nada casou com fluxo/palavra-chave — se a empresa tem IA habilitada
  // no modo "auto" (Etapa 4), deixa a IA responder usando o histórico da
  // conversa e a persona configurada, em vez de ir direto para humano.
  const settings = aiService.resolveSettings(company);
  if (settings.enabled && settings.mode === 'auto') {
    try {
      const history = await messageModel.listByConversation(conversation.id, { limit: 50 });
      const replyText = await aiService.generateReply({ company, settings, history, incomingText: text });
      return [{ text: replyText, generatedByAi: true }];
    } catch (err) {
      logger.error(`Falha ao gerar resposta de IA para a empresa ${company.id}: ${err.message}`);
      // Cai para o fallback padrão abaixo se a IA falhar (chave inválida,
      // provedor fora do ar, etc.) — o cliente nunca fica sem resposta.
    }
  }

  // 7. Nada casou: transfere para atendimento humano com aviso ao cliente.
  await conversationModel.transferToHuman(conversation.id);
  return [
    {
      text: 'Vou te encaminhar para um de nossos atendentes, só um momento! 🙂',
    },
  ];
}

module.exports = { processIncomingMessage, isWithinBusinessHours };

// src/services/ai/ai.service.js
// Camada única por onde todo o resto do sistema fala com IA. Ninguém
// fora deste arquivo (e dos adaptadores em ./providers) deve saber qual
// provedor está configurado ou como montar o payload de cada API —
// automation.service.js e ai.controller.js só chamam as funções daqui.
//
// Responsabilidades:
//   - Resolver qual provedor/chave/modelo usar para cada empresa
//     (personalização por empresa, Etapa 4).
//   - Montar o prompt de sistema com a persona da empresa + catálogo de
//     produtos + horário de funcionamento, para respostas contextualizadas.
//   - Três operações: gerar resposta automática, resumir conversa e
//     sugerir resposta para o atendente.

const openaiProvider = require('./providers/openai.provider');
const geminiProvider = require('./providers/gemini.provider');
const claudeProvider = require('./providers/claude.provider');
const productModel = require('../../models/product.model');
const logger = require('../../utils/logger');

const PROVIDERS = {
  openai: openaiProvider,
  gemini: geminiProvider,
  claude: claudeProvider,
};

const ENV_KEY_BY_PROVIDER = {
  openai: 'OPENAI_API_KEY',
  gemini: 'GEMINI_API_KEY',
  claude: 'ANTHROPIC_API_KEY',
};

const DEFAULT_SETTINGS = {
  enabled: false,
  mode: 'suggest',
  provider: 'openai',
  model: 'gpt-4o-mini',
  api_key: null,
  persona: '',
  temperature: 0.5,
  max_history_messages: 10,
};

function resolveSettings(company) {
  return { ...DEFAULT_SETTINGS, ...(company.ai_settings || {}) };
}

// A chave de API pode vir da própria empresa (personalização por empresa,
// ex: revenda white-label) ou, na ausência dela, da chave global do .env.
function resolveApiKey(settings) {
  if (settings.api_key) return settings.api_key;
  return process.env[ENV_KEY_BY_PROVIDER[settings.provider]] || null;
}

function getProvider(providerName) {
  const provider = PROVIDERS[providerName];
  if (!provider) {
    throw new Error(`Provedor de IA "${providerName}" não suportado.`);
  }
  return provider;
}

// Converte o histórico de mensagens do banco (message.model) no formato
// { role, content } esperado pelos adaptadores, limitado às últimas N
// mensagens configuradas pela empresa (contexto de conversa, Etapa 4).
function buildHistoryMessages(messages, limit) {
  return messages
    .filter((m) => m.content_type === 'text' && m.content)
    .slice(-limit)
    .map((m) => ({
      role: m.sender_type === 'contact' ? 'user' : 'assistant',
      content: m.content,
    }));
}

// Monta o prompt de sistema: quem é a empresa, como o bot deve se
// comportar (persona configurável) e o que ele sabe sobre o catálogo e
// horário de funcionamento — isso é a "personalização por empresa".
async function buildSystemPrompt(company, settings, { forSuggestion = false } = {}) {
  const parts = [];

  parts.push(
    `Você é o assistente de atendimento via WhatsApp da empresa "${company.name}".`
  );

  if (settings.persona && settings.persona.trim()) {
    parts.push(`Instruções de tom e comportamento definidas pela empresa: ${settings.persona.trim()}`);
  } else {
    parts.push('Responda de forma cordial, objetiva e profissional.');
  }

  if (company.business_hours?.open && company.business_hours?.close) {
    parts.push(
      `Horário de funcionamento: das ${company.business_hours.open} às ${company.business_hours.close}.`
    );
  }

  try {
    const products = await productModel.listByCompany(company.id);
    const activeProducts = products.filter((p) => p.is_active).slice(0, 20);
    if (activeProducts.length > 0) {
      const catalogText = activeProducts
        .map((p) => `- ${p.name}${p.description ? `: ${p.description}` : ''} (R$ ${(p.price_cents / 100).toFixed(2)})`)
        .join('\n');
      parts.push(`Catálogo de produtos/serviços disponível:\n${catalogText}`);
    }
  } catch (err) {
    logger.warn(`Não foi possível carregar o catálogo da empresa ${company.id} para o prompt de IA: ${err.message}`);
  }

  parts.push(
    'Responda sempre em português do Brasil, em mensagens curtas (poucas frases), como em uma conversa de WhatsApp. ' +
    'Nunca invente preços, prazos ou informações que não foram fornecidas acima — se não souber, diga que vai verificar com um atendente.'
  );

  if (forSuggestion) {
    parts.push(
      'Você está sugerindo uma resposta para um ATENDENTE HUMANO revisar antes de enviar — escreva a mensagem pronta, sem comentários sobre a sugestão em si.'
    );
  }

  return parts.join('\n\n');
}

// Gera a próxima resposta do bot para uma conversa (usado pelo motor de
// automação quando nada casa com fluxo/palavra-chave e o modo é "auto").
async function generateReply({ company, settings, history, incomingText }) {
  const apiKey = resolveApiKey(settings);
  const provider = getProvider(settings.provider);
  const systemPrompt = await buildSystemPrompt(company, settings);
  const messages = buildHistoryMessages(history, settings.max_history_messages);

  // Garante que a última mensagem do usuário está no histórico enviado.
  if (messages[messages.length - 1]?.content !== incomingText) {
    messages.push({ role: 'user', content: incomingText });
  }

  return provider.complete({
    apiKey,
    model: settings.model,
    systemPrompt,
    messages,
    temperature: settings.temperature,
  });
}

// Gera um resumo curto da conversa inteira, para o atendente entender
// rapidamente o contexto ao assumir o atendimento.
async function summarizeConversation({ company, settings, history }) {
  const apiKey = resolveApiKey(settings);
  const provider = getProvider(settings.provider);

  const transcript = history
    .filter((m) => m.content_type === 'text' && m.content)
    .map((m) => `${m.sender_type === 'contact' ? 'Cliente' : 'Atendimento'}: ${m.content}`)
    .join('\n');

  const systemPrompt =
    `Você resume conversas de atendimento ao cliente da empresa "${company.name}" para atendentes humanos. ` +
    'Escreva um resumo objetivo em português, em no máximo 4 frases, destacando: o que o cliente quer, ' +
    'decisões ou combinados já feitos, e qualquer pendência em aberto. Não invente informação que não está na conversa.';

  return provider.complete({
    apiKey,
    model: settings.model,
    systemPrompt,
    messages: [{ role: 'user', content: `Conversa a resumir:\n\n${transcript}` }],
    temperature: 0.2,
    maxTokens: 250,
  });
}

// Sugere uma resposta pronta para o atendente revisar/editar antes de
// enviar — diferente de generateReply, aqui a IA nunca envia sozinha.
async function suggestReply({ company, settings, history }) {
  const apiKey = resolveApiKey(settings);
  const provider = getProvider(settings.provider);
  const systemPrompt = await buildSystemPrompt(company, settings, { forSuggestion: true });
  const messages = buildHistoryMessages(history, settings.max_history_messages);

  if (messages.length === 0) {
    throw new Error('Não há mensagens suficientes nesta conversa para gerar uma sugestão.');
  }

  return provider.complete({
    apiKey,
    model: settings.model,
    systemPrompt,
    messages,
    temperature: settings.temperature,
  });
}

module.exports = {
  DEFAULT_SETTINGS,
  resolveSettings,
  resolveApiKey,
  buildSystemPrompt,
  generateReply,
  summarizeConversation,
  suggestReply,
};

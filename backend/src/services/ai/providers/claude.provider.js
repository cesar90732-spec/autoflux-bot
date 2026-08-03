// src/services/ai/providers/claude.provider.js
// Adaptador fino para a API de Messages da Anthropic.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// messages: [{ role: 'user' | 'assistant', content: string }]
async function complete({ apiKey, model, systemPrompt, messages, temperature, maxTokens }) {
  if (!apiKey) {
    throw new Error('Chave da Anthropic não configurada.');
  }

  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: model || 'claude-3-5-haiku-20241022',
      system: systemPrompt,
      temperature: temperature ?? 0.5,
      max_tokens: maxTokens || 400,
      messages,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Erro na API da Anthropic (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const text = data.content?.map((block) => block.text || '').join('').trim();
  if (!text) {
    throw new Error('A Anthropic não retornou nenhum texto na resposta.');
  }
  return text;
}

module.exports = { complete };

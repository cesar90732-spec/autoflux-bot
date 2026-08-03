// src/services/ai/providers/openai.provider.js
// Adaptador fino para a API de Chat Completions da OpenAI. Não usamos o
// SDK oficial para manter as dependências do projeto enxutas — a API é
// só um POST em JSON, então `fetch` nativo (Node 20) resolve bem.

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

// messages: [{ role: 'user' | 'assistant', content: string }]
async function complete({ apiKey, model, systemPrompt, messages, temperature, maxTokens }) {
  if (!apiKey) {
    throw new Error('Chave da OpenAI não configurada.');
  }

  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      temperature: temperature ?? 0.5,
      max_tokens: maxTokens || 400,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Erro na API da OpenAI (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error('A OpenAI não retornou nenhum texto na resposta.');
  }
  return text;
}

module.exports = { complete };

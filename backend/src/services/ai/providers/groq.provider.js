// src/services/ai/providers/groq.provider.js
// Adaptador para a API da Groq. A Groq expõe uma API compatível com o
// formato "Chat Completions" da OpenAI, então a lógica é praticamente
// idêntica à de openai.provider.js — só muda a URL e o modelo padrão.
// Vantagem: a Groq tem um plano grátis generoso e sem cartão de
// crédito, ótimo pra rodar sem custo até as primeiras vendas.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// messages: [{ role: 'user' | 'assistant', content: string }]
async function complete({ apiKey, model, systemPrompt, messages, temperature, maxTokens }) {
  if (!apiKey) {
    throw new Error('Chave da Groq não configurada.');
  }

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'llama-3.3-70b-versatile',
      temperature: temperature ?? 0.5,
      max_tokens: maxTokens || 400,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Erro na API da Groq (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error('A Groq não retornou nenhum texto na resposta.');
  }
  return text;
}

module.exports = { complete };

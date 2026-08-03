// src/services/ai/providers/gemini.provider.js
// Adaptador fino para a API do Google Gemini (generateContent). O Gemini
// não tem um "role" de sistema separado em todas as versões da API, então
// mandamos a persona como "systemInstruction" (suportado desde 1.5).

function geminiUrl(model, apiKey) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
}

// messages: [{ role: 'user' | 'assistant', content: string }]
async function complete({ apiKey, model, systemPrompt, messages, temperature, maxTokens }) {
  if (!apiKey) {
    throw new Error('Chave do Gemini não configurada.');
  }

  const resolvedModel = model || 'gemini-1.5-flash';

  // A API do Gemini usa "user"/"model" em vez de "user"/"assistant".
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const response = await fetch(geminiUrl(resolvedModel, apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: temperature ?? 0.5,
        maxOutputTokens: maxTokens || 400,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Erro na API do Gemini (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim();
  if (!text) {
    throw new Error('O Gemini não retornou nenhum texto na resposta.');
  }
  return text;
}

module.exports = { complete };

// src/api/uploadMedia.js
// Helper reutilizado por qualquer tela que precise enviar um arquivo
// (catálogo de produtos, mensagens agendadas) antes de salvar o
// registro que referencia esse arquivo.
import api from './client';

export async function uploadMedia(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data; // { url, contentType, originalName, sizeBytes }
}

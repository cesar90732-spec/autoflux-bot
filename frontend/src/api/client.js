// src/api/client.js
// Instância única do Axios usada por toda a aplicação. O interceptor
// injeta automaticamente o token JWT salvo no localStorage em toda
// requisição, e trata 401 (token expirado) fazendo logout automático.
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('autoflux_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('autoflux_token');
      // Redireciona para o login se a sessão expirou, mantendo o
      // usuário sempre em um estado consistente.
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

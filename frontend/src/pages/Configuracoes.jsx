// src/pages/Configuracoes.jsx
// Painel de configuração administrativa: integração com IA (Etapa 4) e
// backup automático do banco de dados (Etapa 5). Só administradores
// enxergam esta tela com dados reais (o backend também restringe por
// requireRole('admin') em /api/ai/settings e /api/backups).
//
// "has_api_key" vem do backend para indicar se já existe uma chave válida
// configurada (própria da empresa ou a global do .env), sem nunca expor
// o valor da chave de volta para o navegador.
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Save, Loader2, CheckCircle2, ShieldAlert, Sparkles, DatabaseBackup, Download } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ThemeToggle from '../components/ThemeToggle';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI (GPT)' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'claude', label: 'Anthropic Claude' },
];

const MODES = [
  {
    value: 'suggest',
    label: 'Sugerir ao atendente',
    description: 'A IA nunca responde sozinha — apenas sugere uma resposta para o atendente revisar e enviar.',
  },
  {
    value: 'auto',
    label: 'Responder automaticamente',
    description: 'Quando nada casa com fluxo/palavra-chave e está dentro do horário, a IA responde direto ao cliente.',
  },
];

const EMPTY_FORM = {
  enabled: false,
  mode: 'suggest',
  provider: 'openai',
  model: 'gpt-4o-mini',
  apiKey: '',
  persona: '',
  temperature: 0.5,
  maxHistoryMessages: 10,
};

export default function Configuracoes() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [form, setForm] = useState(EMPTY_FORM);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    async function loadSettings() {
      setLoading(true);
      try {
        const { data } = await api.get('/ai/settings');
        setForm({
          enabled: data.settings.enabled,
          mode: data.settings.mode,
          provider: data.settings.provider,
          model: data.settings.model,
          apiKey: '',
          persona: data.settings.persona || '',
          temperature: data.settings.temperature,
          maxHistoryMessages: data.settings.max_history_messages,
        });
        setHasApiKey(data.settings.has_api_key);
      } catch (err) {
        setError(err.response?.data?.error || 'Não foi possível carregar as configurações de IA.');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [isAdmin]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedAt(null);
    try {
      const { data } = await api.put('/ai/settings', form);
      setHasApiKey(data.settings.has_api_key);
      setForm((prev) => ({ ...prev, apiKey: '' }));
      setSavedAt(new Date());
    } catch (err) {
      setError(err.response?.data?.error || 'Não foi possível salvar as configurações de IA.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="min-h-screen flex-1 bg-slate-50 dark:bg-slate-950">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Configurações</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Integração com IA: personalize como o assistente atende pelo WhatsApp.
            </p>
          </div>
          <ThemeToggle />
        </header>

        <div className="mx-auto max-w-3xl p-6">
          {!isAdmin ? (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              <ShieldAlert size={20} />
              Apenas administradores podem ver e alterar a configuração de IA da empresa.
            </div>
          ) : loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 size={16} className="animate-spin" /> Carregando configurações...
            </div>
          ) : (
            <motion.form
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleSave}
              className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                  <Bot size={20} />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-white">Assistente de IA</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Usado para resumir conversas, sugerir respostas ao atendente e, se habilitado, responder
                    automaticamente ao cliente.
                  </p>
                </div>
              </div>

              <label className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Habilitar IA para esta empresa</span>
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                  className="h-5 w-5 accent-brand-600"
                />
              </label>

              <div>
                <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Modo de funcionamento</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {MODES.map((m) => (
                    <label
                      key={m.value}
                      className={`cursor-pointer rounded-lg border p-3 text-sm transition ${
                        form.mode === m.value
                          ? 'border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-900/30'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <input
                        type="radio"
                        name="mode"
                        value={m.value}
                        checked={form.mode === m.value}
                        onChange={(e) => setForm({ ...form, mode: e.target.value })}
                        className="sr-only"
                      />
                      <span className="block font-medium text-slate-800 dark:text-slate-200">{m.label}</span>
                      <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{m.description}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Provedor</label>
                  <select
                    value={form.provider}
                    onChange={(e) => setForm({ ...form, provider: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {PROVIDERS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Modelo</label>
                  <input
                    type="text"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    placeholder="ex: gpt-4o-mini"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Chave de API {hasApiKey && <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400">(já configurada)</span>}
                </label>
                <input
                  type="password"
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  placeholder={hasApiKey ? 'Deixe em branco para manter a chave atual' : 'Cole aqui a chave do provedor escolhido'}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Se deixada em branco, usamos a chave global configurada no servidor (variável de ambiente).
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Persona e instruções (personalização por empresa)
                </label>
                <textarea
                  value={form.persona}
                  onChange={(e) => setForm({ ...form, persona: e.target.value })}
                  rows={4}
                  placeholder="Ex: Você atende a Barbearia Estilo. Seja informal e simpático, use emojis com moderação, e sempre pergunte se o cliente prefere corte ou barba antes de indicar horários."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Criatividade (temperatura): {form.temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={form.temperature}
                    onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                    className="w-full accent-brand-600"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Mensagens de contexto
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="50"
                    value={form.maxHistoryMessages}
                    onChange={(e) => setForm({ ...form, maxHistoryMessages: parseInt(e.target.value, 10) || 10 })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  {error}
                </p>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Salvar configurações
                </button>
                {savedAt && (
                  <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={16} /> Salvo com sucesso
                  </span>
                )}
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <Sparkles size={14} className="mt-0.5 shrink-0" />
                Resumo de conversa e sugestão de resposta ficam disponíveis para os atendentes assim que uma chave
                de API válida estiver configurada aqui.
              </div>
            </motion.form>
          )}

          {isAdmin && !loading && user?.isPlatformAdmin && <BackupsCard />}
          {isAdmin && !loading && !user?.isPlatformAdmin && (
            <p className="mt-6 text-xs text-slate-400 dark:text-slate-500">
              Backup do banco de dados é uma operação de nível de plataforma (envolve dados de todas as
              empresas do SaaS) e não fica disponível aqui para administradores de empresa.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

// Etapa 5: card de backup automático do banco de dados. Lista os
// backups já gerados (o cron roda sozinho em BACKUP_CRON), permite
// disparar um backup avulso e baixar qualquer arquivo já criado.
function BackupsCard() {
  const [backups, setBackups] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState(null);

  async function loadBackups() {
    setLoadingBackups(true);
    try {
      const { data } = await api.get('/backups');
      setBackups(data.backups);
    } catch {
      // Falha ao listar não deve travar a tela — o card só fica vazio.
    } finally {
      setLoadingBackups(false);
    }
  }

  useEffect(() => {
    loadBackups();
  }, []);

  async function handleTriggerNow() {
    setTriggering(true);
    setMessage(null);
    try {
      const { data } = await api.post('/backups');
      setMessage(data.message);
      setTimeout(loadBackups, 4000);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Não foi possível disparar o backup.');
    } finally {
      setTriggering(false);
    }
  }

  async function handleDownload(filename) {
    const response = await api.get(`/backups/${filename}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  function formatSize(bytes) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleString('pt-BR');
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
            <DatabaseBackup size={20} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">Backup do banco de dados</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Executado automaticamente todo dia (configurável via BACKUP_CRON no servidor).
            </p>
          </div>
        </div>
        <button
          onClick={handleTriggerNow}
          disabled={triggering}
          className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {triggering ? <Loader2 size={16} className="animate-spin" /> : null}
          Fazer backup agora
        </button>
      </div>

      {message && <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">{message}</p>}

      {loadingBackups ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Carregando backups...</p>
      ) : backups.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum backup gerado ainda.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {backups.map((b) => (
            <li key={b.filename} className="flex items-center justify-between py-2 text-sm">
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">{b.filename}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatDate(b.createdAt)} · {formatSize(b.size)}
                </p>
              </div>
              <button
                onClick={() => handleDownload(b.filename)}
                className="flex items-center gap-1 text-brand-600 hover:underline dark:text-brand-400"
              >
                <Download size={14} /> Baixar
              </button>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

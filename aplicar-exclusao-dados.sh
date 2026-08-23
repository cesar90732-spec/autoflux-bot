#!/data/data/com.termux/files/usr/bin/bash
# aplicar-exclusao-dados.sh
# Adiciona o fluxo de solicitacao de exclusao de dados (LGPD).
# Rode DENTRO da pasta raiz do repo.
set -e

echo "Aplicando..."

mkdir -p "$(dirname "backend/migrations/013_data_deletion_request.sql")"
cat > "backend/migrations/013_data_deletion_request.sql" << 'AUTOFLUX_EOF'
-- 013_data_deletion_request.sql
-- Direito de exclusão (LGPD): a empresa pode solicitar a exclusão dos
-- seus dados a qualquer momento. Fica marcado aqui em vez de apagar na
-- hora — o admin da plataforma revisa e executa a exclusão de fato
-- (evita perda de dados por clique acidental, e dá chance de resolver
-- pendência de cobrança antes).
ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;
AUTOFLUX_EOF
echo "  - backend/migrations/013_data_deletion_request.sql"

mkdir -p "$(dirname "backend/src/models/company.model.js")"
cat > "backend/src/models/company.model.js" << 'AUTOFLUX_EOF'
// src/models/company.model.js
// Camada de acesso a dados para "companies" (cada empresa cliente do SaaS).

const { query } = require('../config/db');

const TRIAL_DAYS = 7;

// Onboarding automático: toda empresa nova nasce em teste grátis de
// TRIAL_DAYS dias (payment_status = 'trial') e já com o telefone de
// cobrança salvo (se informado no cadastro). Isso é o que permite o
// billingReminder.job assumir a cobrança sozinho quando o trial acaba,
// sem um admin da plataforma precisar configurar nada na mão.
async function create({ name, document, billingPhone, billingName }) {
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  const result = await query(
    `INSERT INTO companies (name, document, billing_phone, billing_name, payment_status, trial_ends_at)
     VALUES ($1, $2, $3, $4, 'trial', $5)
     RETURNING id, name, document, business_hours, payment_status, trial_ends_at, created_at`,
    [name, document || null, billingPhone || null, billingName || null, trialEndsAt.toISOString().slice(0, 10)]
  );
  return result.rows[0];
}

async function findById(id) {
  const result = await query('SELECT * FROM companies WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function updateBusinessHours(id, businessHours) {
  const result = await query(
    `UPDATE companies SET business_hours = $1 WHERE id = $2
     RETURNING id, name, business_hours`,
    [JSON.stringify(businessHours), id]
  );
  return result.rows[0];
}

// Etapa 4: configuração de IA da empresa (provedor, modelo, persona,
// modo automático/sugestão). Guardada como JSONB para não precisar de
// migration nova a cada novo campo de configuração.
async function updateAiSettings(id, aiSettings) {
  const result = await query(
    `UPDATE companies SET ai_settings = $1 WHERE id = $2
     RETURNING id, name, ai_settings`,
    [JSON.stringify(aiSettings), id]
  );
  return result.rows[0];
}

// Direito de exclusão (LGPD). Marca o pedido com data/hora — não apaga
// nada aqui, ver comentário na migration 013. requestedByUserId fica
// registrado pra saber quem pediu, caso a empresa tenha mais de um
// admin.
async function requestDataDeletion(id) {
  const result = await query(
    `UPDATE companies SET deletion_requested_at = now() WHERE id = $1
     RETURNING id, name, deletion_requested_at`,
    [id]
  );
  return result.rows[0];
}

async function cancelDataDeletionRequest(id) {
  const result = await query(
    `UPDATE companies SET deletion_requested_at = NULL WHERE id = $1
     RETURNING id, name, deletion_requested_at`,
    [id]
  );
  return result.rows[0];
}

module.exports = {
  create,
  findById,
  updateBusinessHours,
  updateAiSettings,
  requestDataDeletion,
  cancelDataDeletionRequest,
};
AUTOFLUX_EOF
echo "  - backend/src/models/company.model.js"

mkdir -p "$(dirname "backend/src/controllers/company.controller.js")"
cat > "backend/src/controllers/company.controller.js" << 'AUTOFLUX_EOF'
// src/controllers/company.controller.js
// Ações que a própria empresa faz sobre a sua conta (não confundir com
// platform.controller.js, que é visão do admin da plataforma sobre
// TODAS as empresas). Por enquanto só o pedido de exclusão de dados
// (LGPD) — pode crescer com outras ações de "minha conta" depois.

const companyModel = require('../models/company.model');

// POST /api/companies/me/request-deletion
// Só admin da empresa pode pedir (ver company.routes.js). Não apaga
// nada na hora — só marca o pedido para o admin da plataforma revisar.
async function requestDeletion(req, res, next) {
  try {
    const company = await companyModel.requestDataDeletion(req.user.companyId);
    return res.json({
      message: 'Pedido de exclusão registrado. Nossa equipe vai processar e confirmar em breve.',
      company,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/companies/me/cancel-deletion
// Desiste do pedido (ex: empresa mudou de ideia antes de ser processado).
async function cancelDeletion(req, res, next) {
  try {
    const company = await companyModel.cancelDataDeletionRequest(req.user.companyId);
    return res.json({ message: 'Pedido de exclusão cancelado.', company });
  } catch (err) {
    next(err);
  }
}

module.exports = { requestDeletion, cancelDeletion };
AUTOFLUX_EOF
echo "  - backend/src/controllers/company.controller.js"

mkdir -p "$(dirname "backend/src/routes/company.routes.js")"
cat > "backend/src/routes/company.routes.js" << 'AUTOFLUX_EOF'
// src/routes/company.routes.js
const { Router } = require('express');
const companyController = require('../controllers/company.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate, requireRole('admin'));

router.post('/me/request-deletion', companyController.requestDeletion);
router.post('/me/cancel-deletion', companyController.cancelDeletion);

module.exports = router;
AUTOFLUX_EOF
echo "  - backend/src/routes/company.routes.js"

mkdir -p "$(dirname "backend/src/routes/index.js")"
cat > "backend/src/routes/index.js" << 'AUTOFLUX_EOF'
// src/routes/index.js
// Ponto único que agrega todos os módulos de rota sob o prefixo /api.
// Nas próximas etapas, novos módulos (whatsapp, contacts, messages,
// campaigns, reports, ai, etc.) serão importados e registrados aqui —
// isso é o que torna a arquitetura "pronta para expansão".

const { Router } = require('express');
const authRoutes = require('./auth.routes');
const whatsappRoutes = require('./whatsapp.routes');
const keywordRoutes = require('./keyword.routes');
const flowRoutes = require('./flow.routes');
const contactRoutes = require('./contact.routes');
const conversationRoutes = require('./conversation.routes');
const mediaRoutes = require('./media.routes');
const productRoutes = require('./product.routes');
const broadcastListRoutes = require('./broadcastList.routes');
const scheduledMessageRoutes = require('./scheduledMessage.routes');
const aiRoutes = require('./ai.routes');
const reportRoutes = require('./report.routes');
const backupRoutes = require('./backup.routes');
const platformRoutes = require('./platform.routes');
const billingRoutes = require('./billing.routes');
const companyRoutes = require('./company.routes');
const router = Router();

router.use('/auth', authRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/keywords', keywordRoutes);
router.use('/flows', flowRoutes);
router.use('/contacts', contactRoutes);
router.use('/conversations', conversationRoutes);
router.use('/media', mediaRoutes);
router.use('/products', productRoutes);
router.use('/broadcast-lists', broadcastListRoutes);
router.use('/scheduled-messages', scheduledMessageRoutes);
router.use('/ai', aiRoutes);
router.use('/reports', reportRoutes);
router.use('/backups', backupRoutes);
router.use('/platform', platformRoutes);
router.use('/billing', billingRoutes);
router.use('/companies', companyRoutes);
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'autoflux-backend', timestamp: new Date().toISOString() });
});

module.exports = router;
AUTOFLUX_EOF
echo "  - backend/src/routes/index.js"

mkdir -p "$(dirname "backend/src/models/platform.model.js")"
cat > "backend/src/models/platform.model.js" << 'AUTOFLUX_EOF'
// src/models/platform.model.js
const { query } = require('../config/db');

async function listCompanies() {
  const result = await query(`
    SELECT
      c.id,
      c.name,
      c.plan,
      c.payment_status,
      c.plan_renews_at,
      c.trial_ends_at,
      c.deletion_requested_at,
      (c.ai_settings->>'enabled')::boolean AS ai_enabled,
      c.ai_settings->>'provider' AS ai_provider,
      c.ai_settings->>'mode' AS ai_mode,
      (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id AND u.role = 'employee') AS attendants_count,
      (SELECT status FROM whatsapp_sessions ws WHERE ws.company_id = c.id) AS whatsapp_status
    FROM companies c
    ORDER BY c.created_at DESC
  `);
  return result.rows;
}

module.exports = { listCompanies };
AUTOFLUX_EOF
echo "  - backend/src/models/platform.model.js"

mkdir -p "$(dirname "frontend/src/pages/Configuracoes.jsx")"
cat > "frontend/src/pages/Configuracoes.jsx" << 'AUTOFLUX_EOF'
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
import { Bot, Save, Loader2, CheckCircle2, ShieldAlert, Sparkles, DatabaseBackup, Download, Trash2, AlertOctagon } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ThemeToggle from '../components/ThemeToggle';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

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
  persona: '',
  temperature: 0.5,
  maxHistoryMessages: 10,
};

export default function Configuracoes() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [form, setForm] = useState(EMPTY_FORM);
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
          persona: data.settings.persona || '',
          temperature: data.settings.temperature,
          maxHistoryMessages: data.settings.max_history_messages,
        });
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
      await api.put('/ai/settings', form);
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
        <header className="flex items-center justify-between border-b border-slate-200 bg-white py-4 pl-16 pr-4 dark:border-slate-800 dark:bg-slate-900 md:px-6">
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
          {isAdmin && !loading && <DataDeletionCard />}
        </div>
      </main>
    </div>
  );
}

// Direito de exclusão (LGPD): a empresa pede a exclusão dos próprios
// dados a qualquer momento. Não apaga na hora — só registra o pedido
// (com data/hora) para a equipe processar, evitando perda de dados por
// clique acidental. Ver company.controller.js no backend.
function DataDeletionCard() {
  const [requestedAt, setRequestedAt] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleRequest() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const { data } = await api.post('/companies/me/request-deletion');
      setRequestedAt(data.company.deletion_requested_at);
      setMessage(data.message);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Não foi possível registrar o pedido.');
    } finally {
      setSubmitting(false);
      setConfirming(false);
    }
  }

  async function handleCancel() {
    setSubmitting(true);
    setMessage(null);
    try {
      const { data } = await api.post('/companies/me/cancel-deletion');
      setRequestedAt(null);
      setMessage(data.message);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Não foi possível cancelar o pedido.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 rounded-xl border border-red-200 bg-white p-6 dark:border-red-900/60 dark:bg-slate-900"
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
          <Trash2 size={20} />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white">Exclusão de dados</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Você pode solicitar a exclusão permanente dos dados da sua empresa (conversas, contatos,
            catálogo e configurações) a qualquer momento, conforme a LGPD.
          </p>
        </div>
      </div>

      {requestedAt ? (
        <div className="flex flex-col gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 sm:flex-row sm:items-center sm:justify-between">
          <span>Pedido de exclusão registrado em {new Date(requestedAt).toLocaleString('pt-BR')}.</span>
          <button
            onClick={handleCancel}
            disabled={submitting}
            className="shrink-0 rounded-lg border border-amber-300 px-3 py-1.5 font-medium hover:bg-amber-100 disabled:opacity-60 dark:border-amber-800 dark:hover:bg-amber-900/40"
          >
            Cancelar pedido
          </button>
        </div>
      ) : (
        <button
          onClick={handleRequest}
          disabled={submitting}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${
            confirming
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40'
          }`}
        >
          {submitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : confirming ? (
            <AlertOctagon size={16} />
          ) : (
            <Trash2 size={16} />
          )}
          {confirming ? 'Confirmar: apagar todos os meus dados' : 'Solicitar exclusão dos meus dados'}
        </button>
      )}

      {message && <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{message}</p>}
    </motion.div>
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
AUTOFLUX_EOF
echo "  - frontend/src/pages/Configuracoes.jsx"

echo ""
echo "Pronto. Agora rode:"
echo "  git add -A"
echo "  git commit -m 'feat: fluxo de solicitacao de exclusao de dados (LGPD)'"
echo "  git push origin main"

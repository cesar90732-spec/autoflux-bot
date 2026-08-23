import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import ThemeToggle from '../components/ThemeToggle';
import StatCard from '../components/StatCard';
import api from '../api/client';
import { Building2, Loader2, Sparkles, Users, MessageCircle, QrCode, CheckCircle2, X } from 'lucide-react';

// Modal simples que mostra o QR Code + Copia-e-Cola de uma cobrança recém
// gerada, e permite confirmar o pagamento depois de ver o Pix cair na conta.
function ChargeModal({ charge, onClose, onConfirm, confirming }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(charge.payment_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm rounded-xl bg-white p-5 dark:bg-slate-900"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white">Cobrança Pix</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <img
            src={charge.qr_code_base64}
            alt="QR Code Pix"
            className="h-56 w-56 rounded-lg border dark:border-slate-700"
          />

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            R$ {(charge.amount_cents / 100).toFixed(2)} — status: <strong>{charge.status}</strong>
          </p>

          <button
            onClick={handleCopy}
            className="w-full rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {copied ? 'Código copiado!' : 'Copiar Pix Copia-e-Cola'}
          </button>

          {charge.status !== 'paid' && (
            <button
              onClick={() => onConfirm(charge)}
              disabled={confirming}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {confirming ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
              Confirmar que o Pix caiu
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function PaymentBadge({ status, trialEndsAt }) {
  if (status === 'trial') {
    const daysLeft = trialEndsAt
      ? Math.ceil((new Date(trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24))
      : null;
    const expired = daysLeft !== null && daysLeft < 0;
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
          expired
            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${expired ? 'bg-red-500' : 'bg-amber-500'}`} />
        {expired ? 'Teste vencido' : `Teste (${daysLeft}d)`}
      </span>
    );
  }

  const isOk = status === 'em_dia';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        isOk
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isOk ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {isOk ? 'Em dia' : status}
    </span>
  );
}

function WhatsAppBadge({ status }) {
  const label = { connected: 'Conectado', qr_pending: 'Aguardando QR', connecting: 'Conectando' }[status] || 'Desconectado';
  const isConnected = status === 'connected';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        isConnected
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
      }`}
    >
      {label}
    </span>
  );
}

export default function Admin() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chargingId, setChargingId] = useState(null); // qual empresa está gerando cobrança agora
  const [activeCharge, setActiveCharge] = useState(null); // cobrança aberta no modal
  const [confirming, setConfirming] = useState(false);

  async function loadCompanies() {
    try {
      const { data } = await api.get('/platform/companies');
      setCompanies(data);
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  async function handleGenerateCharge(company) {
    setChargingId(company.id);
    try {
      const { data } = await api.post(`/billing/companies/${company.id}/charge`);
      setActiveCharge(data);
    } catch (err) {
      console.error('Erro ao gerar cobrança:', err);
      alert(err.response?.data?.error || 'Não foi possível gerar a cobrança. Veja o console.');
    } finally {
      setChargingId(null);
    }
  }

  async function handleConfirmPayment(charge) {
    setConfirming(true);
    try {
      await api.post(`/billing/charges/${charge.id}/confirm`);
      setActiveCharge(null);
      await loadCompanies(); // atualiza a tabela pra refletir "em dia"
    } catch (err) {
      console.error('Erro ao confirmar pagamento:', err);
      alert(err.response?.data?.error || 'Não foi possível confirmar. Veja o console.');
    } finally {
      setConfirming(false);
    }
  }

  const emDia = companies.filter((c) => c.payment_status === 'em_dia').length;
  const usandoIa = companies.filter((c) => c.ai_enabled).length;
  const totalAtendentes = companies.reduce((sum, c) => sum + Number(c.attendants_count || 0), 0);

  return (
    <div className="flex">
      <Sidebar />

      <main className="min-h-screen flex-1 bg-slate-50 dark:bg-slate-950">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white py-4 pl-16 pr-4 dark:border-slate-800 dark:bg-slate-900 md:px-6">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
              Administração da Plataforma
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Gerenciamento geral do AutoFlux
            </p>
          </div>

          <ThemeToggle />
        </header>

        <div className="p-6">
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Building2} label="Empresas" value={companies.length} delay={0} />
            <StatCard icon={Building2} label="Pagamentos em dia" value={`${emDia}/${companies.length}`} delay={0.05} />
            <StatCard icon={Sparkles} label="Usando IA" value={`${usandoIa}/${companies.length}`} delay={0.1} />
            <StatCard icon={Users} label="Atendentes (total)" value={totalAtendentes} delay={0.15} />
          </div>

          <div className="rounded-xl border bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b p-4 dark:border-slate-800">
              <h2 className="font-semibold flex items-center gap-2">
                <Building2 size={18} />
                Clientes da plataforma
              </h2>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 p-6 text-slate-500">
                <Loader2 className="animate-spin" size={18} />
                Carregando...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-slate-800">
                      <th className="p-3 text-left">Empresa</th>
                      <th className="hidden p-3 text-left md:table-cell">Plano</th>
                      <th className="p-3 text-left">Pagamento</th>
                      <th className="hidden p-3 text-left lg:table-cell">Renovação</th>
                      <th className="hidden p-3 text-left lg:table-cell">IA</th>
                      <th className="hidden p-3 text-left lg:table-cell">Atendentes</th>
                      <th className="hidden p-3 text-left md:table-cell">WhatsApp</th>
                      <th className="p-3 text-left">Cobrança</th>
                    </tr>
                  </thead>

                  <tbody>
                    {companies.map((company, i) => (
                      <motion.tr
                        key={company.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                        className="border-b dark:border-slate-800"
                      >
                        <td className="p-3 font-medium">{company.name}</td>
                        <td className="hidden p-3 capitalize md:table-cell">{company.plan}</td>
                        <td className="p-3">
                          <PaymentBadge status={company.payment_status} trialEndsAt={company.trial_ends_at} />
                        </td>
                        <td className="hidden p-3 text-slate-500 lg:table-cell">
                          {company.plan_renews_at
                            ? new Date(company.plan_renews_at).toLocaleDateString('pt-BR')
                            : '—'}
                        </td>
                        <td className="hidden p-3 lg:table-cell">
                          {company.ai_enabled ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <Sparkles size={14} />
                              {company.ai_provider} ({company.ai_mode === 'auto' ? 'automático' : 'sugestão'})
                            </span>
                          ) : (
                            <span className="text-slate-400">Desativada</span>
                          )}
                        </td>
                        <td className="hidden p-3 lg:table-cell">
                          <span className="inline-flex items-center gap-1">
                            <Users size={14} className="text-slate-400" />
                            {company.attendants_count}
                          </span>
                        </td>
                        <td className="hidden p-3 md:table-cell">
                          <WhatsAppBadge status={company.whatsapp_status} />
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => handleGenerateCharge(company)}
                            disabled={chargingId === company.id}
                            className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                          >
                            {chargingId === company.id ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              <QrCode size={14} />
                            )}
                            <span className="hidden sm:inline">Gerar cobrança</span>
                            <span className="sm:hidden">Cobrar</span>
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {activeCharge && (
          <ChargeModal
            charge={activeCharge}
            onClose={() => setActiveCharge(null)}
            onConfirm={handleConfirmPayment}
            confirming={confirming}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import ThemeToggle from '../components/ThemeToggle';
import StatCard from '../components/StatCard';
import api from '../api/client';
import { Building2, Loader2, Sparkles, Users, MessageCircle } from 'lucide-react';

function PaymentBadge({ status }) {
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

  useEffect(() => {
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

    loadCompanies();
  }, []);

  const emDia = companies.filter((c) => c.payment_status === 'em_dia').length;
  const usandoIa = companies.filter((c) => c.ai_enabled).length;
  const totalAtendentes = companies.reduce((sum, c) => sum + Number(c.attendants_count || 0), 0);

  return (
    <div className="flex">
      <Sidebar />

      <main className="min-h-screen flex-1 bg-slate-50 dark:bg-slate-950">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
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
            <StatCard icon={Building2} label="Empresas" value={companies.length} />
            <StatCard icon={Building2} label="Pagamentos em dia" value={`${emDia}/${companies.length}`} />
            <StatCard icon={Sparkles} label="Usando IA" value={`${usandoIa}/${companies.length}`} />
            <StatCard icon={Users} label="Atendentes (total)" value={totalAtendentes} />
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
                      <th className="p-3 text-left">Plano</th>
                      <th className="p-3 text-left">Pagamento</th>
                      <th className="p-3 text-left">Renovação</th>
                      <th className="p-3 text-left">IA</th>
                      <th className="p-3 text-left">Atendentes</th>
                      <th className="p-3 text-left">WhatsApp</th>
                    </tr>
                  </thead>

                  <tbody>
                    {companies.map((company) => (
                      <tr
                        key={company.id}
                        className="border-b dark:border-slate-800"
                      >
                        <td className="p-3 font-medium">{company.name}</td>
                        <td className="p-3 capitalize">{company.plan}</td>
                        <td className="p-3">
                          <PaymentBadge status={company.payment_status} />
                        </td>
                        <td className="p-3 text-slate-500">
                          {company.plan_renews_at
                            ? new Date(company.plan_renews_at).toLocaleDateString('pt-BR')
                            : '—'}
                        </td>
                        <td className="p-3">
                          {company.ai_enabled ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <Sparkles size={14} />
                              {company.ai_provider} ({company.ai_mode === 'auto' ? 'automático' : 'sugestão'})
                            </span>
                          ) : (
                            <span className="text-slate-400">Desativada</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1">
                            <Users size={14} className="text-slate-400" />
                            {company.attendants_count}
                          </span>
                        </td>
                        <td className="p-3">
                          <WhatsAppBadge status={company.whatsapp_status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

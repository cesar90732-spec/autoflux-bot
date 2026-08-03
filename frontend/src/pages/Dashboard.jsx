// src/pages/Dashboard.jsx
// Painel principal com métricas e gráficos, consumindo dados reais de
// GET /api/reports/overview (Etapa 5).
import { useEffect, useState } from 'react';
import { MessageSquare, Users, Clock, UserCheck, Loader2, Sparkles } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import Sidebar from '../components/Sidebar';
import ThemeToggle from '../components/ThemeToggle';
import StatCard from '../components/StatCard';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOverview() {
      setLoading(true);
      try {
        const { data } = await api.get('/reports/overview');
        setStats(data);
      } finally {
        setLoading(false);
      }
    }
    loadOverview();
  }, []);

  return (
    <div className="flex">
      <Sidebar />

      <main className="min-h-screen flex-1 bg-slate-50 dark:bg-slate-950">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
              Olá, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Aqui está um resumo do atendimento da sua empresa nos últimos 7 dias.
            </p>
          </div>
          <ThemeToggle />
        </header>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 size={16} className="animate-spin" /> Carregando métricas...
            </div>
          ) : (
            <>
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  icon={MessageSquare}
                  label="Mensagens enviadas (7 dias)"
                  value={stats?.messagesSent ?? '—'}
                />
                <StatCard
                  icon={Users}
                  label="Clientes atendidos (7 dias)"
                  value={stats?.customersServed ?? '—'}
                />
                <StatCard
                  icon={Clock}
                  label="Tempo médio de resposta"
                  value={stats?.avgResponseTime ?? '—'}
                />
                <StatCard
                  icon={UserCheck}
                  label="Funcionários online"
                  value={stats?.employeesOnline ?? '—'}
                />
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                  icon={MessageSquare}
                  label="Conversas em aberto"
                  value={stats?.conversationsOpen ?? '—'}
                />
                <StatCard
                  icon={MessageSquare}
                  label="Conversas encerradas"
                  value={stats?.conversationsClosed ?? '—'}
                />
                <StatCard
                  icon={Sparkles}
                  label="Respostas do bot geradas por IA (7 dias)"
                  value={stats?.aiUsage ? `${stats.aiUsage.aiPercentage}%` : '—'}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Mensagens por dia (última semana)
                </h2>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={stats?.chartData ?? []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                    <XAxis dataKey="dia" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="mensagens"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

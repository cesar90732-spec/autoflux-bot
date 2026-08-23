// src/pages/Relatorios.jsx
// Página dedicada de relatórios: reaproveita GET /api/reports/overview
// (mesma fonte do Dashboard) e adiciona exportação em CSV/PDF.
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Loader2, FileDown, FileText } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ThemeToggle from '../components/ThemeToggle';
import StatCard from '../components/StatCard';
import api from '../api/client';
import { MessageSquare, Users, Clock, UserCheck, Sparkles } from 'lucide-react';

async function downloadExport(path, filename) {
  const response = await api.get(path, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export default function Relatorios() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data } = await api.get('/reports/overview');
        setStats(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleExport(format) {
    setExporting(format);
    try {
      if (format === 'csv') {
        await downloadExport('/reports/export.csv', 'relatorio-autoflux.csv');
      } else {
        await downloadExport('/reports/export.pdf', 'relatorio-autoflux.pdf');
      }
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="min-h-screen flex-1 bg-slate-50 dark:bg-slate-950">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white py-4 pl-16 pr-4 dark:border-slate-800 dark:bg-slate-900 md:px-6">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Relatórios</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Métricas de atendimento dos últimos 7 dias.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting !== null || loading}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {exporting === 'csv' ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
              Exportar CSV
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={exporting !== null || loading}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {exporting === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              Exportar PDF
            </button>
            <ThemeToggle />
          </div>
        </header>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 size={16} className="animate-spin" /> Carregando métricas...
            </div>
          ) : (
            <>
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={MessageSquare} label="Mensagens enviadas (7 dias)" value={stats?.messagesSent ?? '—'} delay={0} />
                <StatCard icon={Users} label="Clientes atendidos (7 dias)" value={stats?.customersServed ?? '—'} delay={0.05} />
                <StatCard icon={Clock} label="Tempo médio de resposta" value={stats?.avgResponseTime ?? '—'} delay={0.1} />
                <StatCard icon={UserCheck} label="Funcionários online" value={stats?.employeesOnline ?? '—'} delay={0.15} />
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard icon={MessageSquare} label="Conversas em aberto" value={stats?.conversationsOpen ?? '—'} delay={0.2} />
                <StatCard icon={MessageSquare} label="Conversas encerradas" value={stats?.conversationsClosed ?? '—'} delay={0.25} />
                <StatCard
                  icon={Sparkles}
                  label="Respostas do bot geradas por IA"
                  value={stats?.aiUsage ? `${stats.aiUsage.aiPercentage}%` : '—'}
                  delay={0.3}
                />
              </div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.35 }}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Mensagens por dia (última semana)
                </h2>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={stats?.chartData ?? []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                    <XAxis dataKey="dia" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                    <Line type="monotone" dataKey="mensagens" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

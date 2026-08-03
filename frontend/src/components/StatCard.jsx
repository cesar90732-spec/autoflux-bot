// src/components/StatCard.jsx
// Cartão reutilizável de métrica exibido no Dashboard (mensagens
// enviadas, clientes atendidos, tempo médio de resposta, etc.).
import { motion } from 'framer-motion';

export default function StatCard({ icon: Icon, label, value, trend }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
          <Icon size={20} />
        </div>
        {trend && (
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </motion.div>
  );
}

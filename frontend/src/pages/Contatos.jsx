// src/pages/Contatos.jsx
// Listagem e busca de contatos (clientes que já escreveram para o
// WhatsApp da empresa). Gestão de tags fica para uma próxima etapa —
// o backend ainda não tem endpoint para listar as tags disponíveis,
// só para associar/remover (POST/DELETE /api/contacts/:id/tags).
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, User } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ThemeToggle from '../components/ThemeToggle';
import api from '../api/client';

export default function Contatos() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/contacts', { params: search ? { search } : {} });
        setContacts(data.contacts);
      } finally {
        setLoading(false);
      }
    }, 300); // debounce simples para não disparar uma request por tecla

    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div className="flex">
      <Sidebar />
      <main className="min-h-screen flex-1 bg-slate-50 dark:bg-slate-950">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white py-4 pl-16 pr-4 dark:border-slate-800 dark:bg-slate-900 md:px-6">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Contatos</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Clientes que já escreveram para o seu WhatsApp.
            </p>
          </div>
          <ThemeToggle />
        </header>

        <div className="p-6">
          <div className="relative mb-4 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou telefone..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {loading ? (
              <div className="flex items-center gap-2 p-6 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 size={16} className="animate-spin" /> Carregando contatos...
              </div>
            ) : contacts.length === 0 ? (
              <p className="p-6 text-sm text-slate-500 dark:text-slate-400">Nenhum contato encontrado.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-medium">Contato</th>
                    <th className="px-5 py-3 font-medium">Telefone</th>
                    <th className="px-5 py-3 font-medium">Cadastrado em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <AnimatePresence>
                    {contacts.map((c, i) => (
                      <motion.tr
                        key={c.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                      >
                        <td className="flex items-center gap-2 px-5 py-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                            <User size={14} />
                          </div>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{c.name}</span>
                        </td>
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{c.phone_number}</td>
                        <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                          {new Date(c.created_at).toLocaleDateString('pt-BR')}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

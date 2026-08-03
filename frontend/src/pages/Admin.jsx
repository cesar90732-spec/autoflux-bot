import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import ThemeToggle from '../components/ThemeToggle';
import api from '../api/client';
import { Building2, Loader2 } from 'lucide-react';

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
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-500">Empresas</p>
              <p className="mt-2 text-3xl font-bold">
                {companies.length}
              </p>
            </div>
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
                      <th className="p-3 text-left">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {companies.map((company) => (
                      <tr
                        key={company.id}
                        className="border-b dark:border-slate-800"
                      >
                        <td className="p-3">
                          {company.name}
                        </td>
                        <td className="p-3">
                          {company.plan}
                        </td>
                        <td className="p-3">
                          {company.payment_status}
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

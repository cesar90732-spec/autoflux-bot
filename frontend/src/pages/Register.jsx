// src/pages/Register.jsx
// Tela de cadastro. Cria a empresa e o usuário administrador em uma
// única chamada (POST /api/auth/register).
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    companyName: '',
    name: '',
    email: '',
    password: '',
    billingPhone: '',
    termsAccepted: false,
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      const apiError = err.response?.data;
      setError(apiError?.error || apiError?.errors?.[0] || 'Não foi possível criar a conta.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <MessageCircle size={20} />
          </div>
          <span className="text-lg font-semibold text-slate-900 dark:text-white">AutoFlux</span>
        </div>

        <h1 className="mb-1 text-xl font-semibold text-slate-900 dark:text-white">
          Cadastre sua empresa
        </h1>
        <p className="mb-1 text-sm text-slate-500 dark:text-slate-400">
          Você será o administrador desta conta.
        </p>
        <p className="mb-6 text-xs text-slate-400 dark:text-slate-500">
          7 dias grátis — sem cobrança agora.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { key: 'companyName', label: 'Nome da empresa', type: 'text', placeholder: 'Barbearia do João' },
            { key: 'name', label: 'Seu nome', type: 'text', placeholder: 'João Silva' },
            { key: 'email', label: 'E-mail', type: 'email', placeholder: 'voce@empresa.com' },
            {
              key: 'billingPhone',
              label: 'WhatsApp para avisos de cobrança',
              type: 'tel',
              placeholder: '11987654321 (com DDD)',
            },
            { key: 'password', label: 'Senha (mín. 8 caracteres)', type: 'password', placeholder: '••••••••' },
          ].map((field) => (
            <div key={field.key}>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                {field.label}
              </label>
              <input
                type={field.type}
                required
                minLength={field.key === 'password' ? 8 : undefined}
                value={form[field.key]}
                onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                placeholder={field.placeholder}
              />
            </div>
          ))}

          <label className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              required
              checked={form.termsAccepted}
              onChange={(e) => setForm({ ...form, termsAccepted: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-700"
            />
            <span>
              Li e aceito os{' '}
              <Link to="/termos" target="_blank" className="font-medium text-brand-600 hover:underline">
                Termos de Uso e a Política de Privacidade
              </Link>
              .
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Criar conta
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Já tem conta?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            Entrar
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

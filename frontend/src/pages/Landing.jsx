// src/pages/Landing.jsx
// Página pública de vendas do AutoFlux Atendimento. É a porta de
// entrada de quem ainda não é cliente — por isso fica em "/" e não
// exige login. Quem já está logado é mandado direto pro dashboard.
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MessageCircle,
  Bot,
  BarChart3,
  Users,
  Megaphone,
  ShieldCheck,
  Check,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

const FEATURES = [
  {
    icon: MessageCircle,
    title: 'Atendimento automático no WhatsApp',
    description:
      'Conecte o WhatsApp da sua empresa e responda clientes automaticamente, mesmo fora do horário comercial.',
  },
  {
    icon: Bot,
    title: 'Respostas com Inteligência Artificial',
    description:
      'A IA entende a pergunta do cliente e responde no seu tom de voz, ou sugere a resposta pra sua equipe aprovar.',
  },
  {
    icon: Users,
    title: 'Um painel para toda a equipe',
    description:
      'Vários atendentes na mesma conversa, com histórico de contatos e etiquetas para organizar seus clientes.',
  },
  {
    icon: Megaphone,
    title: 'Transmissões e catálogo',
    description:
      'Envie promoções para listas de clientes e mostre seus produtos direto pelo WhatsApp.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios de atendimento',
    description:
      'Acompanhe mensagens enviadas, tempo de resposta e quanto da IA está ajudando sua equipe — com exportação em CSV/PDF.',
  },
  {
    icon: ShieldCheck,
    title: 'Seus dados, sua empresa',
    description:
      'Cada empresa tem seus próprios contatos, conversas e configurações, isolados das demais.',
  },
];

const STEPS = [
  {
    title: 'Crie sua conta',
    description: 'Cadastre sua empresa em menos de 1 minuto, sem cartão de crédito.',
  },
  {
    title: 'Conecte seu WhatsApp',
    description: 'Escaneie um QR Code — como no WhatsApp Web — e pronto.',
  },
  {
    title: 'Comece a atender automaticamente',
    description: 'Configure respostas, ative a IA e acompanhe tudo pelo painel.',
  },
];

const PLAN_PRICE = 'R$ 97,00';

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <MessageCircle size={20} />
            </div>
            <span className="text-lg font-semibold text-slate-900 dark:text-white">AutoFlux</span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              Entrar
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 pb-16 pt-16 text-center sm:pb-24 sm:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <span className="mb-4 inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
            7 dias grátis, sem cartão de crédito
          </span>

          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Automatize o atendimento do WhatsApp da sua empresa
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base text-slate-600 dark:text-slate-400 sm:text-lg">
            Responda clientes 24 horas por dia, organize conversas em um painel só e deixe a
            Inteligência Artificial ajudar sua equipe a atender mais rápido.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/register"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 sm:w-auto"
            >
              Criar minha conta grátis
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/login"
              className="flex w-full items-center justify-center rounded-lg border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900 sm:w-auto"
            >
              Já tenho conta
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="border-t border-slate-200 bg-slate-50 py-16 dark:border-slate-800 dark:bg-slate-900/40 sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
              Tudo que você precisa pra parar de perder cliente no WhatsApp
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.3, delay: (i % 3) * 0.08 }}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
                  <feature.icon size={20} />
                </div>
                <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">{feature.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="mb-12 text-center text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            Comece a usar em 3 passos
          </h2>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                className="text-center"
              >
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                  {i + 1}
                </div>
                <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">{step.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-slate-200 bg-slate-50 py-16 dark:border-slate-800 dark:bg-slate-900/40 sm:py-24">
        <div className="mx-auto max-w-md px-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl border border-brand-200 bg-white p-8 text-center shadow-sm dark:border-brand-900/50 dark:bg-slate-900"
          >
            <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
              Plano único
            </h3>
            <p className="mt-3 text-4xl font-bold text-slate-900 dark:text-white">
              {PLAN_PRICE}
              <span className="text-base font-medium text-slate-500 dark:text-slate-400">/mês</span>
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              7 dias grátis antes da primeira cobrança
            </p>

            <ul className="mt-6 space-y-3 text-left text-sm text-slate-700 dark:text-slate-300">
              {[
                'WhatsApp conectado com QR Code',
                'Atendimento com Inteligência Artificial',
                'Painel para toda a sua equipe',
                'Transmissões, catálogo e relatórios',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check size={16} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  {item}
                </li>
              ))}
            </ul>

            <Link
              to="/register"
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Começar meus 7 dias grátis
              <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-slate-500 dark:text-slate-400 sm:flex-row">
          <span>© {new Date().getFullYear()} AutoFlux Atendimento</span>
          <div className="flex items-center gap-2">
            <MessageCircle size={16} />
            Automação de WhatsApp para pequenos e médios negócios
          </div>
        </div>
      </footer>
    </div>
  );
}

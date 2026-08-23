import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  QrCode,
  Megaphone,
  Package,
  BarChart3,
  Settings,
  LogOut,
  MessageCircle,
  Shield,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/conversas', label: 'Conversas', icon: MessageSquare },
  { to: '/contatos', label: 'Contatos', icon: Users },
  { to: '/whatsapp', label: 'Conexão WhatsApp', icon: QrCode },
  { to: '/transmissoes', label: 'Transmissões', icon: Megaphone },
  { to: '/catalogo', label: 'Catálogo', icon: Package },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

// Sidebar responsivo: em telas grandes (md+) fica sempre visível, fixo
// na lateral, como antes. Em celular/tablet estreito, vira um menu que
// abre por cima do conteúdo (com um botão "hambúrguer" flutuante) e
// fecha sozinho quando o usuário navega ou toca fora dele. Como esse
// componente é importado em todas as páginas, essa mudança já deixa a
// navegação inteira do site usável em qualquer tamanho de tela.
export default function Sidebar() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isPlatformAdmin = user?.isPlatformAdmin === true;

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
    }`;

  const adminLinkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? 'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300'
        : 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40'
    }`;

  return (
    <>
      {/* Botão hambúrguer — só aparece em telas pequenas (abaixo de md) */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
        className="fixed left-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm md:hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
      >
        <Menu size={20} />
      </button>

      {/* Fundo escurecido atrás do menu aberto no mobile — toca fora pra fechar */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out dark:border-slate-800 dark:bg-slate-900 md:static md:z-auto md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-5 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <MessageCircle size={20} />
            </div>

            <span className="text-lg font-semibold text-slate-900 dark:text-white">
              AutoFlux
            </span>
          </div>

          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
            className="text-slate-400 hover:text-slate-600 md:hidden dark:hover:text-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={linkClass} onClick={() => setMobileOpen(false)}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}

          {isPlatformAdmin && (
            <NavLink to="/admin" className={adminLinkClass} onClick={() => setMobileOpen(false)}>
              <Shield size={18} />
              Administração
            </NavLink>
          )}
        </nav>

        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <div className="mb-2 px-2">
            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
              {user?.name}
            </p>
          </div>

          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}

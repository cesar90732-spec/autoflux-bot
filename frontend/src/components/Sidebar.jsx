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

export default function Sidebar() {
  const { user, logout } = useAuth();

  const isPlatformAdmin = user?.isPlatformAdmin === true;

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
          <MessageCircle size={20} />
        </div>

        <span className="text-lg font-semibold text-slate-900 dark:text-white">
          AutoFlux
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}

        {isPlatformAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                  : 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40'
              }`
            }
          >
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

          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {isPlatformAdmin
              ? 'Administrador'
              : user?.role === 'admin'
              ? 'Dono da empresa'
              : 'Funcionário'}
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
  );
}

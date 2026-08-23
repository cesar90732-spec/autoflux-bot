// src/components/ProtectedRoute.jsx
// Envolve rotas que exigem login. Enquanto a sessão está sendo
// restaurada mostra um loading; sem usuário, redireciona para /login.
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  // No plano grátis do Render o servidor "dorme" após um tempo sem uso
  // e pode levar até ~1 minuto pra responder de novo. Sem esse aviso,
  // parecia que o site tinha travado numa tela em branco/spinner mudo.
  const [showSlowHint, setShowSlowHint] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShowSlowHint(false);
      return;
    }
    const timeout = setTimeout(() => setShowSlowHint(true), 4000);
    return () => clearTimeout(timeout);
  }, [loading]);

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        {showSlowHint && (
          <p className="max-w-xs px-4 text-center text-sm text-slate-500 dark:text-slate-400">
            Ainda carregando... o servidor pode levar até 1 minuto pra acordar depois de um
            tempo sem uso.
          </p>
        )}
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// src/pages/WhatsAppConnection.jsx
// Tela de conexão do WhatsApp. Fluxo:
//   1. Usuário clica em "Conectar" -> POST /api/whatsapp/connect
//   2. A tela faz polling de GET /api/whatsapp/status a cada 3s
//   3. Quando o status vira "qr_pending", exibe o QR Code (data URL)
//   4. Quando o status vira "connected", mostra o número conectado
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { QrCode, CheckCircle2, Loader2, Unplug } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ThemeToggle from '../components/ThemeToggle';
import api from '../api/client';

const POLL_INTERVAL_MS = 3000;

export default function WhatsAppConnection() {
  const [state, setState] = useState({ status: 'disconnected', qrCode: null, phoneNumber: null });
  const [loading, setLoading] = useState(false);
  const pollRef = useRef(null);

  async function fetchStatus() {
    try {
      const { data } = await api.get('/whatsapp/status');
      setState(data);
    } catch {
      // Falha pontual de polling não precisa travar a tela — tenta de novo no próximo ciclo.
    }
  }

  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, []);

  async function handleConnect() {
    setLoading(true);
    try {
      await api.post('/whatsapp/connect');
      await fetchStatus();
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    setLoading(true);
    try {
      await api.post('/whatsapp/disconnect');
      await fetchStatus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="min-h-screen flex-1 bg-slate-50 dark:bg-slate-950">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
              Conexão WhatsApp
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Conecte o número que vai atender seus clientes automaticamente.
            </p>
          </div>
          <ThemeToggle />
        </header>

        <div className="flex justify-center p-10">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            {state.status === 'connected' && (
              <>
                <CheckCircle2 className="mx-auto mb-3 text-emerald-500" size={48} />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  WhatsApp conectado
                </h2>
                <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
                  Número: {state.phoneNumber}
                </p>
                <button
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="mx-auto flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:hover:bg-red-950/40"
                >
                  <Unplug size={16} /> Desconectar
                </button>
              </>
            )}

            {state.status === 'qr_pending' && state.qrCode && (
              <>
                <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
                  Escaneie o QR Code
                </h2>
                <img
                  src={state.qrCode}
                  alt="QR Code de conexão do WhatsApp"
                  className="mx-auto mb-4 h-56 w-56 rounded-lg border border-slate-200 dark:border-slate-700"
                />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No WhatsApp do celular: Configurações → Aparelhos conectados → Conectar
                  aparelho.
                </p>
              </>
            )}

            {(state.status === 'disconnected' || state.status === 'connecting') && (
              <>
                <QrCode className="mx-auto mb-3 text-brand-600" size={48} />
                <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">
                  Nenhum WhatsApp conectado
                </h2>
                <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
                  Clique abaixo para gerar o QR Code de conexão.
                </p>
                <button
                  onClick={handleConnect}
                  disabled={loading || state.status === 'connecting'}
                  className="mx-auto flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {(loading || state.status === 'connecting') && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  Conectar WhatsApp
                </button>
              </>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

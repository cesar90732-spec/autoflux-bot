// src/App.jsx
// Define as rotas da aplicação. Rotas além de /login, /register e
// /dashboard (contatos, conversas, whatsapp, etc.) serão adicionadas
// aqui conforme cada etapa do backend for implementada.
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import WhatsAppConnection from './pages/WhatsAppConnection';
import Catalog from './pages/Catalog';
import Broadcasts from './pages/Broadcasts';
import Configuracoes from './pages/Configuracoes';
import Conversas from './pages/Conversas';
import Contatos from './pages/Contatos';
import Relatorios from './pages/Relatorios';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/whatsapp"
        element={
          <ProtectedRoute>
            <WhatsAppConnection />
          </ProtectedRoute>
        }
      />
      <Route
        path="/catalogo"
        element={
          <ProtectedRoute>
            <Catalog />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transmissoes"
        element={
          <ProtectedRoute>
            <Broadcasts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/conversas"
        element={
          <ProtectedRoute>
            <Conversas />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contatos"
        element={
          <ProtectedRoute>
            <Contatos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/relatorios"
        element={
          <ProtectedRoute>
            <Relatorios />
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracoes"
        element={
          <ProtectedRoute>
            <Configuracoes />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
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
import Admin from './pages/Admin';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
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
        path="/admin"
        element={
          <ProtectedRoute>
            <Admin />
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

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

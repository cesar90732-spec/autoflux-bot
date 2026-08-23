#!/data/data/com.termux/files/usr/bin/bash
# aplicar-termos-uso.sh
# Adiciona aceite de Termos de Uso/Privacidade obrigatorio no cadastro.
# Rode DENTRO da pasta raiz do repo (mesma pasta do script anterior).
set -e

echo "Aplicando..."

mkdir -p "$(dirname "backend/migrations/012_terms_acceptance.sql")"
cat > "backend/migrations/012_terms_acceptance.sql" << 'AUTOFLUX_EOF'
-- 012_terms_acceptance.sql
-- Registra quando cada usuário aceitou os Termos de Uso / Política de
-- Privacidade. Guardado por usuário (não por empresa) porque quem
-- aceita é sempre uma pessoa física, e cada novo funcionário adicionado
-- depois também precisa aceitar antes de usar o painel. NULL = nunca
-- aceitou (bloqueia login em contas antigas até aceitar).
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20);
AUTOFLUX_EOF
echo "  - backend/migrations/012_terms_acceptance.sql"

mkdir -p "$(dirname "backend/src/models/user.model.js")"
cat > "backend/src/models/user.model.js" << 'AUTOFLUX_EOF'
// src/models/user.model.js
// Camada de acesso a dados para "users". Mantém todas as queries SQL
// relacionadas a usuários em um único lugar, para que controllers nunca
// escrevam SQL diretamente (facilita manutenção e testes).

const { query } = require('../config/db');

async function findByEmail(email) {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
}

async function findById(id) {
  const result = await query(
    'SELECT id, company_id, name, email, role, is_online, is_platform_admin, last_seen_at, created_at FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

const TERMS_VERSION = 'v1';

async function create({ companyId, name, email, passwordHash, role, termsAccepted }) {
  const result = await query(
    `INSERT INTO users (company_id, name, email, password_hash, role, terms_accepted_at, terms_version)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, company_id, name, email, role, created_at, terms_accepted_at`,
    [
      companyId,
      name,
      email,
      passwordHash,
      role || 'employee',
      termsAccepted ? new Date() : null,
      termsAccepted ? TERMS_VERSION : null,
    ]
  );
  return result.rows[0];
}

async function listByCompany(companyId) {
  const result = await query(
    `SELECT id, name, email, role, is_online, last_seen_at
     FROM users WHERE company_id = $1 ORDER BY name ASC`,
    [companyId]
  );
  return result.rows;
}

async function setOnlineStatus(userId, isOnline) {
  await query(
    'UPDATE users SET is_online = $1, last_seen_at = now() WHERE id = $2',
    [isOnline, userId]
  );
}

// Usado exclusivamente pelo script scripts/grant-platform-admin.js —
// nunca exposto via rota HTTP, para que essa permissão não possa ser
// autoconcedida por ninguém através do painel.
async function setPlatformAdmin(email, isPlatformAdmin) {
  const result = await query(
    'UPDATE users SET is_platform_admin = $1 WHERE email = $2 RETURNING id, name, email, is_platform_admin',
    [isPlatformAdmin, email]
  );
  return result.rows[0] || null;
}

module.exports = {
  findByEmail,
  findById,
  create,
  listByCompany,
  setOnlineStatus,
  setPlatformAdmin,
};
AUTOFLUX_EOF
echo "  - backend/src/models/user.model.js"

mkdir -p "$(dirname "backend/src/controllers/auth.controller.js")"
cat > "backend/src/controllers/auth.controller.js" << 'AUTOFLUX_EOF'
// src/controllers/auth.controller.js
// Regras de negócio de autenticação: cadastro (registra a empresa e o
// primeiro usuário como admin) e login (valida credenciais e emite JWT).

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const userModel = require('../models/user.model');
const companyModel = require('../models/company.model');
const logger = require('../utils/logger');

const SALT_ROUNDS = 10;

function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      companyId: user.company_id,
      role: user.role,
      isPlatformAdmin: Boolean(user.is_platform_admin),
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// POST /api/auth/register
// Cria uma nova empresa e o primeiro usuário (sempre "admin").
// Fluxos de convite para adicionar funcionários depois usam outra rota
// (POST /api/users), restrita a admins — ver users.controller na Etapa 3.
async function register(req, res, next) {
  try {
    const { companyName, name, email, password, billingPhone, termsAccepted } = req.body;

    if (!termsAccepted) {
      return res.status(400).json({ error: 'É necessário aceitar os Termos de Uso e a Política de Privacidade.' });
    }

    const existing = await userModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
    }

    // billingPhone é o WhatsApp para onde vai o lembrete de cobrança
    // quando o teste grátis acabar — coletado aqui pra empresa já
    // nascer pronta pra régua de cobrança automática, sem precisar de
    // um admin da plataforma configurar isso depois na mão.
    const company = await companyModel.create({ name: companyName, billingPhone, billingName: name });
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await userModel.create({
      companyId: company.id,
      name,
      email,
      passwordHash,
      role: 'admin', // quem cadastra a empresa é sempre o administrador inicial
      termsAccepted: true,
    });

    const token = generateToken(user);

    logger.info(`Nova empresa cadastrada: ${company.name} (admin: ${email})`);

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isPlatformAdmin: Boolean(user.is_platform_admin),
      },
      company: { id: company.id, name: company.name, trialEndsAt: company.trial_ends_at },
    });
  } catch (err) {
    next(err); // delega ao middleware central de tratamento de erros
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await userModel.findByEmail(email);
    if (!user) {
      // Mensagem genérica de propósito: não revela se o e-mail existe ou não,
      // reduzindo a superfície para ataques de enumeração de usuários.
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    await userModel.setOnlineStatus(user.id, true);
    const token = generateToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isPlatformAdmin: Boolean(user.is_platform_admin),
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
// Retorna os dados do usuário autenticado (usado pelo frontend para
// restaurar a sessão ao recarregar a página).
async function me(req, res, next) {
  try {
    const user = await userModel.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    const { is_platform_admin, ...rest } = user;
    return res.json({ user: { ...rest, isPlatformAdmin: Boolean(is_platform_admin) } });
  } catch (err) {
    next(err);
  }
}
// POST /api/auth/google
// Recebe o "credential" (ID token) que o botão do Google devolve no
// frontend, valida com o Google, e loga o usuário se o e-mail já
// existir no sistema. Se for a primeira vez (e-mail novo), cria a
// empresa e o usuário admin automaticamente — mesmo comportamento do
// /register, só que disparado pelo próprio login com Google, sem
// exigir senha (a conta nasce sem uma; login sempre será via Google).
async function googleLogin(req, res, next) {
  try {
    const { credential, termsAccepted } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Token do Google não informado.' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload.email;
    const googleName = payload.name || email.split('@')[0];

    let user = await userModel.findByEmail(email);
    let isNewAccount = false;

    if (!user) {
      // Conta nova via Google também precisa aceitar os termos — o
      // frontend deve mostrar o checkbox ANTES de disparar o login do
      // Google e mandar termsAccepted=true junto com o credential.
      if (!termsAccepted) {
        return res.status(400).json({ error: 'É necessário aceitar os Termos de Uso e a Política de Privacidade.' });
      }

      isNewAccount = true;

      // Conta nasce sem senha de verdade (login sempre será via Google);
      // gera um hash aleatório só pra satisfazer a coluna NOT NULL e
      // garantir que ninguém consiga entrar nela por e-mail/senha.
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, SALT_ROUNDS);

      const company = await companyModel.create({ name: `Empresa de ${googleName}` });

      user = await userModel.create({
        companyId: company.id,
        name: googleName,
        email,
        passwordHash,
        role: 'admin', // quem cria a conta é sempre o dono/admin da empresa
        termsAccepted: true,
      });

      logger.info(`Nova empresa criada via login com Google: ${company.name} (${email})`);
    }

    await userModel.setOnlineStatus(user.id, true);
    const token = generateToken(user);

    return res.status(isNewAccount ? 201 : 200).json({
      token,
      isNewAccount,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isPlatformAdmin: Boolean(user.is_platform_admin),
      },
    });
  } catch (err) {
    logger.error(`Falha no login com Google: ${err.message}`);
    return res.status(401).json({ error: 'Não foi possível validar o login com Google.' });
  }
}
module.exports = { register, login, me, googleLogin };
AUTOFLUX_EOF
echo "  - backend/src/controllers/auth.controller.js"

mkdir -p "$(dirname "backend/src/routes/auth.routes.js")"
cat > "backend/src/routes/auth.routes.js" << 'AUTOFLUX_EOF'
// src/routes/auth.routes.js
// Define os endpoints de autenticação e as regras de validação de cada um.

const { Router } = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');

const router = Router();

// Limite específico para tentativas de login/cadastro: o rate limit
// global (200 req/15min) é compartilhado com toda a API e não segura
// força bruta de senha sozinho. 10 tentativas por IP a cada 15min é
// suficiente pra um usuário real que errou a senha, mas trava um
// ataque automatizado. Não conta requisições bem-sucedidas.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
});

router.post(
  '/register',
  authLimiter,
  [
    body('companyName').trim().notEmpty().withMessage('Informe o nome da empresa.'),
    body('name').trim().notEmpty().withMessage('Informe seu nome.'),
    body('email').isEmail().withMessage('Informe um e-mail válido.').normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('A senha deve ter no mínimo 8 caracteres.'),
    body('billingPhone')
      .trim()
      .notEmpty()
      .withMessage('Informe o WhatsApp para onde vão os avisos de cobrança.')
      .isLength({ min: 10 })
      .withMessage('Informe o telefone com DDD (ex: 11987654321).'),
    body('termsAccepted')
      .custom((value) => value === true || value === 'true')
      .withMessage('É necessário aceitar os Termos de Uso e a Política de Privacidade.'),
  ],
  validate,
  authController.register
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Informe um e-mail válido.').normalizeEmail(),
    body('password').notEmpty().withMessage('Informe a senha.'),
  ],
  validate,
  authController.login
);

router.post('/google', authLimiter, authController.googleLogin);
router.get('/me', authenticate, authController.me);

module.exports = router;
AUTOFLUX_EOF
echo "  - backend/src/routes/auth.routes.js"

mkdir -p "$(dirname "frontend/src/context/AuthContext.jsx")"
cat > "frontend/src/context/AuthContext.jsx" << 'AUTOFLUX_EOF'
// src/context/AuthContext.jsx
// Estado global de autenticação. Guarda o usuário logado, expõe
// login/register/logout e restaura a sessão automaticamente ao
// recarregar a página (via GET /api/auth/me com o token salvo)
import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      const token = localStorage.getItem('autoflux_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user);
      } catch {
        localStorage.removeItem('autoflux_token');
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('autoflux_token', data.token);
    setUser(data.user);
    return data.user;
  }

async function loginWithGoogle(credential) {
    const { data } = await api.post('/auth/google', { credential });
    localStorage.setItem('autoflux_token', data.token);
    setUser(data.user);
    return data.user;
  }

  async function register({ companyName, name, email, password, billingPhone, termsAccepted }) {
    const { data } = await api.post('/auth/register', {
      companyName,
      name,
      email,
      password,
      billingPhone,
      termsAccepted,
    });
    localStorage.setItem('autoflux_token', data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem('autoflux_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return ctx;
}
AUTOFLUX_EOF
echo "  - frontend/src/context/AuthContext.jsx"

mkdir -p "$(dirname "frontend/src/pages/Register.jsx")"
cat > "frontend/src/pages/Register.jsx" << 'AUTOFLUX_EOF'
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
AUTOFLUX_EOF
echo "  - frontend/src/pages/Register.jsx"

mkdir -p "$(dirname "frontend/src/pages/Termos.jsx")"
cat > "frontend/src/pages/Termos.jsx" << 'AUTOFLUX_EOF'
// src/pages/Termos.jsx
// Termos de Uso e Política de Privacidade — página pública (sem login).
// AVISO: isto é um ponto de partida, não é assessoria jurídica. Antes de
// usar com clientes pagantes de verdade, vale revisar com um advogado
// (principalmente as cláusulas de LGPD, cobrança e responsabilidade).
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';

export default function Termos() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <MessageCircle size={20} />
          </div>
          <span className="text-lg font-semibold text-slate-900 dark:text-white">AutoFlux</span>
        </Link>

        <h1 className="mb-1 text-xl font-semibold text-slate-900 dark:text-white">
          Termos de Uso e Política de Privacidade
        </h1>
        <p className="mb-6 text-xs text-slate-400 dark:text-slate-500">
          Última atualização: agosto de 2026
        </p>

        <div className="space-y-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          <section>
            <h2 className="mb-1 font-semibold text-slate-800 dark:text-slate-200">1. O que é o AutoFlux</h2>
            <p>
              O AutoFlux é uma ferramenta de atendimento automatizado via WhatsApp. Ao criar uma conta,
              você conecta o WhatsApp da sua empresa à plataforma para automatizar respostas, organizar
              conversas e (opcionalmente) usar inteligência artificial no atendimento.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-slate-800 dark:text-slate-200">2. Quais dados coletamos</h2>
            <p>
              Coletamos os dados que você informa no cadastro (nome, e-mail, telefone, nome da empresa) e
              os dados gerados pelo uso da plataforma: mensagens trocadas com seus contatos, número de
              telefone e nome dos contatos, catálogo de produtos e histórico de conversas.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-slate-800 dark:text-slate-200">
              3. Uso de inteligência artificial
            </h2>
            <p>
              Se você ativar o atendimento por IA, o conteúdo das conversas é enviado para o provedor de
              IA configurado (ex: OpenAI, Google, Anthropic ou Groq) para gerar respostas, resumos ou
              sugestões. Esses provedores processam os dados conforme suas próprias políticas de
              privacidade. Você é responsável por avisar seus próprios clientes sobre esse uso, se
              exigido pela legislação aplicável.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-slate-800 dark:text-slate-200">4. Como usamos os dados</h2>
            <p>
              Usamos os dados exclusivamente para operar a plataforma: entregar mensagens, gerar
              relatórios, gerenciar sua conta e cobrança. Não vendemos dados de contatos ou conversas a
              terceiros.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-slate-800 dark:text-slate-200">
              5. Seus direitos (LGPD)
            </h2>
            <p>
              Você pode solicitar a qualquer momento a exportação ou exclusão dos dados da sua empresa,
              entrando em contato pelo suporte. A exclusão da conta remove permanentemente conversas,
              contatos e configurações associadas.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-slate-800 dark:text-slate-200">6. Cobrança</h2>
            <p>
              O plano é cobrado mensalmente via Pix após o período de teste gratuito. O acesso pode ser
              suspenso em caso de atraso no pagamento, mediante aviso prévio.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-slate-800 dark:text-slate-200">7. Contato</h2>
            <p>
              Dúvidas sobre estes termos ou sobre seus dados podem ser enviadas para o suporte informado
              no painel.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
AUTOFLUX_EOF
echo "  - frontend/src/pages/Termos.jsx"

mkdir -p "$(dirname "frontend/src/App.jsx")"
cat > "frontend/src/App.jsx" << 'AUTOFLUX_EOF'
import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Termos from './pages/Termos';
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
      <Route path="/termos" element={<Termos />} />

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
AUTOFLUX_EOF
echo "  - frontend/src/App.jsx"

echo ""
echo "Pronto. Agora rode:"
echo "  git add -A"
echo "  git commit -m 'feat: exige aceite dos termos de uso no cadastro'"
echo "  git push origin main"

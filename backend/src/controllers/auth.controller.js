// src/controllers/auth.controller.js
// Regras de negócio de autenticação: cadastro (registra a empresa e o
// primeiro usuário como admin) e login (valida credenciais e emite JWT).

const bcrypt = require('bcryptjs');
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
    const { companyName, name, email, password } = req.body;

    const existing = await userModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
    }

    const company = await companyModel.create({ name: companyName });
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await userModel.create({
      companyId: company.id,
      name,
      email,
      passwordHash,
      role: 'admin', // quem cadastra a empresa é sempre o administrador inicial
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
      company: { id: company.id, name: company.name },
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
// existir no sistema. Não cria empresa nova por esse fluxo.
async function googleLogin(req, res, next) {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Token do Google não informado.' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload.email;

    const user = await userModel.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        error: 'Nenhuma conta encontrada com este e-mail do Google. Cadastre sua empresa primeiro.',
      });
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
    logger.error(`Falha no login com Google: ${err.message}`);
    return res.status(401).json({ error: 'Não foi possível validar o login com Google.' });
  }
}
module.exports = { register, login, me, googleLogin };

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

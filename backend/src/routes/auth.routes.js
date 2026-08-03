// src/routes/auth.routes.js
// Define os endpoints de autenticação e as regras de validação de cada um.

const { Router } = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');

const router = Router();

router.post(
  '/register',
  [
    body('companyName').trim().notEmpty().withMessage('Informe o nome da empresa.'),
    body('name').trim().notEmpty().withMessage('Informe seu nome.'),
    body('email').isEmail().withMessage('Informe um e-mail válido.').normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('A senha deve ter no mínimo 8 caracteres.'),
  ],
  validate,
  authController.register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Informe um e-mail válido.').normalizeEmail(),
    body('password').notEmpty().withMessage('Informe a senha.'),
  ],
  validate,
  authController.login
);

router.post('/google', authController.googleLogin);
router.get('/me', authenticate, authController.me);

module.exports = router;

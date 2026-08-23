#!/data/data/com.termux/files/usr/bin/bash
# aplicar-correcoes-seguranca.sh
# Aplica as correções de segurança (IDOR entre empresas + rate limit de login)
# Rode este script DENTRO da pasta raiz do repo (autoflux-bot-main/), no Termux.
set -e

echo "Aplicando correções..."

cat > "backend/src/controllers/conversation.controller.js" << 'AUTOFLUX_EOF'
// src/controllers/conversation.controller.js
const conversationModel = require('../models/conversation.model');
const messageModel = require('../models/message.model');
const whatsappService = require('../services/whatsapp.service');

// GET /api/conversations?status=open
async function list(req, res, next) {
  try {
    const conversations = await conversationModel.listByCompany(req.user.companyId, {
      status: req.query.status,
    });
    return res.json({ conversations });
  } catch (err) {
    next(err);
  }
}

// Confere que a conversa pedida na URL (:id) realmente pertence à
// empresa do usuário logado. SEM ISSO, qualquer usuário autenticado de
// qualquer empresa poderia ler/responder/transferir conversas de outras
// empresas só adivinhando ou trocando o UUID na URL — é a checagem mais
// importante de todo o multi-tenant, então toda rota abaixo passa por
// aqui antes de tocar na conversa.
async function loadOwnedConversation(req, res) {
  const conversation = await conversationModel.findById(req.params.id, req.user.companyId);
  if (!conversation) {
    res.status(404).json({ error: 'Conversa não encontrada.' });
    return null;
  }
  return conversation;
}

// GET /api/conversations/:id/messages
async function listMessages(req, res, next) {
  try {
    const conversation = await loadOwnedConversation(req, res);
    if (!conversation) return;

    const messages = await messageModel.listByConversation(req.params.id);
    return res.json({ messages });
  } catch (err) {
    next(err);
  }
}

// POST /api/conversations/:id/reply  { text, phoneNumber, contentType?, mediaUrl? }
// Permite que um atendente humano responda manualmente pelo painel,
// com texto simples ou mídia (imagem/PDF/vídeo/áudio já enviada via
// POST /api/media/upload).
async function reply(req, res, next) {
  try {
    const conversation = await loadOwnedConversation(req, res);
    if (!conversation) return;

    const { text, phoneNumber, contentType = 'text', mediaUrl } = req.body;
    if (!phoneNumber || (contentType === 'text' && !text) || (contentType !== 'text' && !mediaUrl)) {
      return res.status(400).json({ error: 'Dados insuficientes para enviar a mensagem.' });
    }
    const jid = `${phoneNumber}@s.whatsapp.net`;

    if (contentType === 'text') {
      await whatsappService.sendTextMessage(req.user.companyId, jid, text);
    } else {
      await whatsappService.sendMediaMessage(req.user.companyId, jid, {
        contentType,
        mediaUrl,
        caption: text,
      });
    }

    const message = await messageModel.create({
      conversationId: req.params.id,
      direction: 'outbound',
      senderType: 'user',
      senderUserId: req.user.userId,
      contentType,
      content: text || null,
      mediaUrl: mediaUrl || null,
    });
    await conversationModel.touch(req.params.id);

    return res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
}

// POST /api/conversations/:id/transfer
// O atendente assume a conversa manualmente (ex: cliente pediu ajuda
// mesmo sem o bot ter transferido automaticamente).
async function transfer(req, res, next) {
  try {
    const owned = await loadOwnedConversation(req, res);
    if (!owned) return;

    const conversation = await conversationModel.transferToHuman(req.params.id, req.user.userId);
    return res.json({ conversation });
  } catch (err) {
    next(err);
  }
}

// POST /api/conversations/:id/return-to-bot
async function returnToBot(req, res, next) {
  try {
    const owned = await loadOwnedConversation(req, res);
    if (!owned) return;

    const conversation = await conversationModel.returnToBot(req.params.id);
    return res.json({ conversation });
  } catch (err) {
    next(err);
  }
}

// GET /api/conversations/search?q=texto
async function search(req, res, next) {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Informe o termo de busca (?q=).' });
    const results = await messageModel.searchByCompany(req.user.companyId, q);
    return res.json({ results });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, listMessages, reply, transfer, returnToBot, search };
AUTOFLUX_EOF
echo "  - backend/src/controllers/conversation.controller.js"

cat > "backend/src/controllers/contact.controller.js" << 'AUTOFLUX_EOF'
// src/controllers/contact.controller.js
const contactModel = require('../models/contact.model');

// GET /api/contacts?search=texto
async function list(req, res, next) {
  try {
    const contacts = await contactModel.listByCompany(req.user.companyId, {
      search: req.query.search,
    });
    return res.json({ contacts });
  } catch (err) {
    next(err);
  }
}

// POST /api/contacts/:id/tags  { tagId }
async function addTag(req, res, next) {
  try {
    const ok = await contactModel.addTag(req.user.companyId, req.params.id, req.body.tagId);
    if (!ok) return res.status(404).json({ error: 'Contato ou etiqueta não encontrados.' });
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// DELETE /api/contacts/:id/tags/:tagId
async function removeTag(req, res, next) {
  try {
    const ok = await contactModel.removeTag(req.user.companyId, req.params.id, req.params.tagId);
    if (!ok) return res.status(404).json({ error: 'Contato ou etiqueta não encontrados.' });
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, addTag, removeTag };
AUTOFLUX_EOF
echo "  - backend/src/controllers/contact.controller.js"

cat > "backend/src/models/contact.model.js" << 'AUTOFLUX_EOF'
// src/models/contact.model.js
// Contatos são os clientes que escrevem para o WhatsApp da empresa.
// "findOrCreate" é o ponto de entrada usado pelo motor de automação
// toda vez que chega uma mensagem de um número ainda não conhecido.

const { query } = require('../config/db');

async function findById(companyId, contactId) {
  const result = await query('SELECT * FROM contacts WHERE id = $1 AND company_id = $2', [
    contactId,
    companyId,
  ]);
  return result.rows[0] || null;
}

async function findOrCreate(companyId, phoneNumber, name) {
  const existing = await query(
    'SELECT * FROM contacts WHERE company_id = $1 AND phone_number = $2',
    [companyId, phoneNumber]
  );
  if (existing.rows[0]) return existing.rows[0];

  const created = await query(
    `INSERT INTO contacts (company_id, phone_number, name)
     VALUES ($1, $2, $3) RETURNING *`,
    [companyId, phoneNumber, name || phoneNumber]
  );
  return created.rows[0];
}

async function listByCompany(companyId, { search } = {}) {
  if (search) {
    const result = await query(
      `SELECT * FROM contacts WHERE company_id = $1
       AND (name ILIKE $2 OR phone_number ILIKE $2)
       ORDER BY name ASC`,
      [companyId, `%${search}%`]
    );
    return result.rows;
  }
  const result = await query(
    'SELECT * FROM contacts WHERE company_id = $1 ORDER BY name ASC',
    [companyId]
  );
  return result.rows;
}

// companyId é obrigatório aqui: o INSERT/DELETE só acontece se tanto o
// contato quanto a tag pertencerem à empresa do usuário logado (os
// subselects filtram por company_id). Sem isso, um usuário de qualquer
// empresa poderia marcar/desmarcar tags em contatos de outra empresa
// só sabendo o UUID — o controller trata "0 linhas afetadas" como 404.
async function addTag(companyId, contactId, tagId) {
  const result = await query(
    `INSERT INTO contact_tags (contact_id, tag_id)
     SELECT $2, $3
     WHERE EXISTS (SELECT 1 FROM contacts WHERE id = $2 AND company_id = $1)
       AND EXISTS (SELECT 1 FROM tags WHERE id = $3 AND company_id = $1)
     ON CONFLICT DO NOTHING
     RETURNING contact_id`,
    [companyId, contactId, tagId]
  );
  return result.rowCount > 0;
}

async function removeTag(companyId, contactId, tagId) {
  const result = await query(
    `DELETE FROM contact_tags
     WHERE contact_id = $2 AND tag_id = $3
       AND EXISTS (SELECT 1 FROM contacts WHERE id = $2 AND company_id = $1)`,
    [companyId, contactId, tagId]
  );
  return result.rowCount > 0;
}

module.exports = { findOrCreate, findById, listByCompany, addTag, removeTag };
AUTOFLUX_EOF
echo "  - backend/src/models/contact.model.js"

cat > "backend/src/controllers/broadcastList.controller.js" << 'AUTOFLUX_EOF'
// src/controllers/broadcastList.controller.js
const broadcastListModel = require('../models/broadcastList.model');
const contactModel = require('../models/contact.model');

async function list(req, res, next) {
  try {
    const lists = await broadcastListModel.listByCompany(req.user.companyId);
    return res.json({ lists });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Informe o nome da lista.' });
    const list = await broadcastListModel.create(req.user.companyId, name);
    return res.status(201).json({ list });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await broadcastListModel.remove(req.params.id, req.user.companyId);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function listContacts(req, res, next) {
  try {
    const list = await broadcastListModel.findById(req.params.id, req.user.companyId);
    if (!list) return res.status(404).json({ error: 'Lista não encontrada.' });
    const contacts = await broadcastListModel.listContacts(req.params.id);
    return res.json({ contacts });
  } catch (err) {
    next(err);
  }
}

async function addContact(req, res, next) {
  try {
    const list = await broadcastListModel.findById(req.params.id, req.user.companyId);
    if (!list) return res.status(404).json({ error: 'Lista não encontrada.' });

    // Sem checar isso, dava pra adicionar o contactId de OUTRA empresa
    // nesta lista e depois ver o nome/telefone dele via GET .../contacts.
    const contact = await contactModel.findById(req.user.companyId, req.body.contactId);
    if (!contact) return res.status(404).json({ error: 'Contato não encontrado.' });

    await broadcastListModel.addContact(req.params.id, req.body.contactId);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function removeContact(req, res, next) {
  try {
    const list = await broadcastListModel.findById(req.params.id, req.user.companyId);
    if (!list) return res.status(404).json({ error: 'Lista não encontrada.' });

    await broadcastListModel.removeContact(req.params.id, req.params.contactId);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, remove, listContacts, addContact, removeContact };
AUTOFLUX_EOF
echo "  - backend/src/controllers/broadcastList.controller.js"

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

echo ""
echo "Correções aplicadas. Agora rode:"
echo "  git add -A"
echo "  git commit -m 'fix: corrige IDOR entre empresas e adiciona rate limit no login'"
echo "  git push"
echo ""
echo "O Render faz o deploy automático assim que detectar o push (se o auto-deploy estiver ligado)."

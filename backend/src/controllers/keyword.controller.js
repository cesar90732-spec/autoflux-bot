// src/controllers/keyword.controller.js
// CRUD de palavras-chave de resposta automática, escopado sempre pela
// empresa do usuário autenticado (req.user.companyId) — nenhuma empresa
// consegue ler ou editar palavras-chave de outra.

const keywordModel = require('../models/keyword.model');

async function list(req, res, next) {
  try {
    const keywords = await keywordModel.listByCompany(req.user.companyId);
    return res.json({ keywords });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { triggerText, replyText } = req.body;
    if (!triggerText || !replyText) {
      return res.status(400).json({ error: 'Informe o texto-gatilho e a resposta.' });
    }
    const keyword = await keywordModel.create(req.user.companyId, { triggerText, replyText });
    return res.status(201).json({ keyword });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { triggerText, replyText, isActive } = req.body;
    const keyword = await keywordModel.update(req.params.id, req.user.companyId, {
      triggerText,
      replyText,
      isActive,
    });
    if (!keyword) return res.status(404).json({ error: 'Palavra-chave não encontrada.' });
    return res.json({ keyword });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await keywordModel.remove(req.params.id, req.user.companyId);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };

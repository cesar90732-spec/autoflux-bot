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

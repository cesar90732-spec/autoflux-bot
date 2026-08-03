// src/controllers/flow.controller.js
// CRUD de fluxos de conversa (menus). Ver comentário no topo de
// flow.model.js para o formato esperado do campo "steps".

const flowModel = require('../models/flow.model');

async function list(req, res, next) {
  try {
    const flows = await flowModel.listByCompany(req.user.companyId);
    return res.json({ flows });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { name, triggerKeyword, steps } = req.body;
    if (!name || !triggerKeyword || !steps?.start) {
      return res
        .status(400)
        .json({ error: 'Informe nome, palavra-chave de gatilho e ao menos o step "start".' });
    }
    const flow = await flowModel.create(req.user.companyId, { name, triggerKeyword, steps });
    return res.status(201).json({ flow });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { name, triggerKeyword, steps, isActive } = req.body;
    const flow = await flowModel.update(req.params.id, req.user.companyId, {
      name,
      triggerKeyword,
      steps,
      isActive,
    });
    if (!flow) return res.status(404).json({ error: 'Fluxo não encontrado.' });
    return res.json({ flow });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await flowModel.remove(req.params.id, req.user.companyId);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };

// src/controllers/broadcastList.controller.js
const broadcastListModel = require('../models/broadcastList.model');

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
    await broadcastListModel.addContact(req.params.id, req.body.contactId);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function removeContact(req, res, next) {
  try {
    await broadcastListModel.removeContact(req.params.id, req.params.contactId);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, remove, listContacts, addContact, removeContact };

// src/controllers/product.controller.js
const productModel = require('../models/product.model');

async function list(req, res, next) {
  try {
    const products = await productModel.listByCompany(req.user.companyId);
    return res.json({ products });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { name, description, priceCents, imageUrl } = req.body;
    if (!name) return res.status(400).json({ error: 'Informe o nome do produto.' });
    const product = await productModel.create(req.user.companyId, {
      name,
      description,
      priceCents,
      imageUrl,
    });
    return res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { name, description, priceCents, imageUrl, isActive } = req.body;
    const product = await productModel.update(req.params.id, req.user.companyId, {
      name,
      description,
      priceCents,
      imageUrl,
      isActive,
    });
    if (!product) return res.status(404).json({ error: 'Produto não encontrado.' });
    return res.json({ product });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await productModel.remove(req.params.id, req.user.companyId);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };

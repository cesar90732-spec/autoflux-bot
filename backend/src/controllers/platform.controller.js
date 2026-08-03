// src/controllers/platform.controller.js
const platformModel = require('../models/platform.model');

async function listCompanies(req, res, next) {
  try {
    const companies = await platformModel.listCompanies();
    return res.json(companies);
  } catch (err) {
    next(err);
  }
}

module.exports = { listCompanies };

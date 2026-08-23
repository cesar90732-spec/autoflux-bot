// src/controllers/company.controller.js
// Ações que a própria empresa faz sobre a sua conta (não confundir com
// platform.controller.js, que é visão do admin da plataforma sobre
// TODAS as empresas). Por enquanto só o pedido de exclusão de dados
// (LGPD) — pode crescer com outras ações de "minha conta" depois.

const companyModel = require('../models/company.model');

// POST /api/companies/me/request-deletion
// Só admin da empresa pode pedir (ver company.routes.js). Não apaga
// nada na hora — só marca o pedido para o admin da plataforma revisar.
async function requestDeletion(req, res, next) {
  try {
    const company = await companyModel.requestDataDeletion(req.user.companyId);
    return res.json({
      message: 'Pedido de exclusão registrado. Nossa equipe vai processar e confirmar em breve.',
      company,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/companies/me/cancel-deletion
// Desiste do pedido (ex: empresa mudou de ideia antes de ser processado).
async function cancelDeletion(req, res, next) {
  try {
    const company = await companyModel.cancelDataDeletionRequest(req.user.companyId);
    return res.json({ message: 'Pedido de exclusão cancelado.', company });
  } catch (err) {
    next(err);
  }
}

module.exports = { requestDeletion, cancelDeletion };

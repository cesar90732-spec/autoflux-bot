// src/controllers/whatsapp.controller.js
// Endpoints que o frontend usa para conectar o WhatsApp da empresa:
// iniciar conexão, buscar o QR Code atual (polling) e desconectar.

const whatsappService = require('../services/whatsapp.service');

// POST /api/whatsapp/connect
async function connect(req, res, next) {
  try {
    const state = await whatsappService.startConnection(req.user.companyId);
    return res.json({ status: state.status });
  } catch (err) {
    next(err);
  }
}

// GET /api/whatsapp/status
// O frontend faz polling deste endpoint (a cada poucos segundos) para
// saber quando o QR Code mudou de "qr_pending" para "connected".
async function status(req, res, next) {
  try {
    const state = whatsappService.getStatus(req.user.companyId);
    const qrDataUrl =
      state.status === 'qr_pending' ? whatsappService.getQrCode(req.user.companyId) : null;
    return res.json({ ...state, qrCode: qrDataUrl });
  } catch (err) {
    next(err);
  }
}

// POST /api/whatsapp/disconnect
async function disconnect(req, res, next) {
  try {
    await whatsappService.disconnectCompany(req.user.companyId);
    return res.json({ status: 'disconnected' });
  } catch (err) {
    next(err);
  }
}

module.exports = { connect, status, disconnect };

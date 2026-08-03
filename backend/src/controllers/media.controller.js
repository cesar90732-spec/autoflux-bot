// src/controllers/media.controller.js
// Endpoint genérico de upload, usado pelo catálogo de produtos, pelo
// envio manual em conversas e pelas campanhas de transmissão. Devolve
// a URL pública do arquivo para ser salva no banco (products.image_url,
// messages.media_url, scheduled_messages.media_url, etc.).

const { resolveContentType } = require('../config/upload');

// POST /api/media/upload  (multipart/form-data, campo "file")
async function uploadMedia(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }
    const contentType = resolveContentType(req.file.mimetype);
    const url = `/uploads/${req.file.filename}`;

    return res.status(201).json({
      url,
      contentType,
      originalName: req.file.originalname,
      sizeBytes: req.file.size,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadMedia };

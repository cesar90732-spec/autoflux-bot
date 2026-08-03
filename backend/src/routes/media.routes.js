// src/routes/media.routes.js
const { Router } = require('express');
const { upload } = require('../config/upload');
const mediaController = require('../controllers/media.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

// O multer chama next(err) em caso de arquivo inválido/grande demais;
// esse erro cai no middleware central de erro (errorHandler.js) via
// "next" repassado automaticamente pelo Express quando o handler é async.
router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, mediaController.uploadMedia);

module.exports = router;

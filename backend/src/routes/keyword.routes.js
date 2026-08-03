// src/routes/keyword.routes.js
const { Router } = require('express');
const keywordController = require('../controllers/keyword.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/', keywordController.list);
router.post('/', keywordController.create);
router.put('/:id', keywordController.update);
router.delete('/:id', keywordController.remove);

module.exports = router;

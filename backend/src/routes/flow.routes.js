// src/routes/flow.routes.js
const { Router } = require('express');
const flowController = require('../controllers/flow.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/', flowController.list);
router.post('/', flowController.create);
router.put('/:id', flowController.update);
router.delete('/:id', flowController.remove);

module.exports = router;

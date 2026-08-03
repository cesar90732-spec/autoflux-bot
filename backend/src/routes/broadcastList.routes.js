// src/routes/broadcastList.routes.js
const { Router } = require('express');
const broadcastListController = require('../controllers/broadcastList.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/', broadcastListController.list);
router.post('/', broadcastListController.create);
router.delete('/:id', broadcastListController.remove);
router.get('/:id/contacts', broadcastListController.listContacts);
router.post('/:id/contacts', broadcastListController.addContact);
router.delete('/:id/contacts/:contactId', broadcastListController.removeContact);

module.exports = router;

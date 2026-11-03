const router = require('express').Router();
const controller = require('../controllers/sales.controller');
router.get('/', controller.listar);
router.post('/', controller.crear);
router.get('/:id', controller.obtener);
router.patch('/:id/anular', controller.anular);
module.exports = router;

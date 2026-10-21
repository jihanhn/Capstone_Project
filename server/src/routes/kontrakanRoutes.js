const express = require('express');
const router = express.Router();
const kontrakanController = require('../controllers/kontrakanController');

router.get('/', kontrakanController.getAllUnits);
router.post('/', kontrakanController.createUnit);
router.put('/:kode', kontrakanController.updateUnit);
router.delete('/:kode', kontrakanController.deleteUnit);

module.exports = router;

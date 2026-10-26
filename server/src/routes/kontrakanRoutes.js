const express = require('express');
const router = express.Router();
const kontrakanController = require('../controllers/kontrakanController');

router.get('/', kontrakanController.getAllUnits);
router.get('/next-id', kontrakanController.getNextId);
router.post('/', kontrakanController.createUnit);
router.get('/:kode/riwayat-harga', kontrakanController.getRiwayatHarga);
router.put('/:kode', kontrakanController.updateUnit);
router.delete('/:kode', kontrakanController.deleteUnit);

module.exports = router;

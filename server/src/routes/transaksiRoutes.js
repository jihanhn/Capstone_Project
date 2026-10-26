const express = require('express');
const router = express.Router();
const transaksiController = require('../controllers/transaksiController');

router.get('/arus-kas', transaksiController.getArusKasMasuk);
router.get('/', transaksiController.getAllTransaksi);
router.post('/', transaksiController.createTransaksi);
router.put('/:id', transaksiController.updateTransaksi);
router.delete('/pembayaran/:idPembayaran', transaksiController.deletePembayaran);
router.delete('/:id', transaksiController.deleteTransaksi);

module.exports = router;
const express = require('express');
const router = express.Router();
const biayaController = require('../controllers/biayaController');

router.get('/', biayaController.getAllBiaya);
router.post('/', biayaController.createBiaya);
router.delete('/:id', biayaController.deleteBiaya);

module.exports = router;
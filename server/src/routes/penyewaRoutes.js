const express = require('express');
const router = express.Router();
const penyewaController = require('../controllers/penyewaController');

router.get('/next-id', penyewaController.getNextId);
router.get('/', penyewaController.getAllPenyewa);
router.post('/', penyewaController.createPenyewa);
router.put('/:id', penyewaController.updatePenyewa);
router.delete('/:id', penyewaController.deletePenyewa);

module.exports = router;
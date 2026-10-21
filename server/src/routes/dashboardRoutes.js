const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// GET /api/dashboard/stats?periode=YYYY-MM
router.get('/stats', dashboardController.getStats);

// GET /api/dashboard/trend?tahun=YYYY
router.get('/trend', dashboardController.getTrend);

// GET /api/dashboard/vacancy-loss (Early Warning Kerugian Kamar Kosong)
router.get('/vacancy-loss', dashboardController.getVacancyLoss);

// GET /api/dashboard/early-warning?periode=YYYY-MM (Early Warning Risiko Tunggakan)
router.get('/early-warning', dashboardController.getEarlyWarning);

module.exports = router;
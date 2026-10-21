const dashboardService = require('../services/dashboardService');

/**
 * Controller untuk Dashboard Eksekutif & EWS
 */
const getStats = async (req, res) => {
  try {
    const stats = await dashboardService.getDashboardStats(req.query.periode);
    res.json(stats);
  } catch (err) {
    console.error('Error stats:', err);
    res.status(500).json({ error: 'Gagal mengambil ringkasan KPI dashboard' });
  }
};

const getTrend = async (req, res) => {
  try {
    const trend = await dashboardService.getFinancialTrend(req.query.tahun);
    res.json(trend);
  } catch (err) {
    console.error('Error trend:', err);
    res.status(500).json({ error: 'Gagal mengambil data tren keuangan' });
  }
};

const getVacancyLoss = async (req, res) => {
  try {
    const vacancy = await dashboardService.getVacancyLoss();
    res.json(vacancy);
  } catch (err) {
    console.error('Error vacancy-loss:', err);
    res.status(500).json({ error: 'Gagal mengambil analisis kerugian unit kosong' });
  }
};

const getEarlyWarning = async (req, res) => {
  try {
    const warnings = await dashboardService.getEarlyWarnings(req.query.periode, req.query.tahun);
    res.json(warnings);
  } catch (err) {
    console.error('Error early warning:', err);
    res.status(500).json({ error: 'Gagal mengambil data peringatan dini risiko' });
  }
};

module.exports = {
  getStats,
  getTrend,
  getVacancyLoss,
  getEarlyWarning
};

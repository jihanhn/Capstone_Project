require('dotenv').config();
const express = require('express');
const cors = require('cors');

const dashboardRoutes = require('./routes/dashboardRoutes');
const kontrakanRoutes = require('./routes/kontrakanRoutes');
const penyewaRoutes = require('./routes/penyewaRoutes');
const transaksiRoutes = require('./routes/transaksiRoutes');
const exportRoutes = require('./routes/exportRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
const healthHandler = (req, res) => {
  const hasEnv = Boolean(process.env.POSTGRES_URL || process.env.DATABASE_URL);
  res.json({
    status: 'online',
    system: 'Sistem Business Intelligence Pengelolaan Risiko Finansial Kontrakan Buti',
    database_configured: hasEnv,
    timestamp: new Date().toISOString()
  });
};
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// Routing API (mendukung awalan /api dan langsung /xxx untuk Vercel Serverless)
app.use('/api/dashboard', dashboardRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/api/kontrakan', kontrakanRoutes);
app.use('/kontrakan', kontrakanRoutes);
app.use('/api/penyewa', penyewaRoutes);
app.use('/penyewa', penyewaRoutes);
app.use('/api/transaksi', transaksiRoutes);
app.use('/transaksi', transaksiRoutes);
app.use('/api/export', exportRoutes);
app.use('/export', exportRoutes);

module.exports = app;

//ok
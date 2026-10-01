require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDbSchema } = require('./database/db');

const dashboardRoutes = require('./routes/dashboardRoutes');
const kontrakanRoutes = require('./routes/kontrakanRoutes');
const penyewaRoutes = require('./routes/penyewaRoutes');
const transaksiRoutes = require('./routes/transaksiRoutes');
const exportRoutes = require('./routes/exportRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Health check endpoint
const healthHandler = (req, res) => {
  res.json({
    status: 'online',
    system: 'Sistem Business Intelligence Pengelolaan Risiko Finansial Kontrakan Buti',
    timestamp: new Date().toISOString()
  });
};
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// Jika client sudah di-build, sajikan file statis
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res) => {
  // Jika bukan request API, alihkan ke index.html client (jika ada)
  if (!req.path.startsWith('/api')) {
    const indexPath = path.join(clientDistPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        res.json({ message: 'Backend API Kontrakan Buti berjalan. Buka frontend di port dev Vite.' });
      }
    });
  }
});

// Jalankan Server lokal jika bukan di serverless environment
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  initDbSchema().then(() => {
    app.listen(PORT, () => {
      console.log(`Server BI Kontrakan Buti aktif pada port ${PORT}`);
    });
  }).catch(err => {
    console.error('Inisialisasi database gagal:', err);
  });
} else {
  // Di Vercel, pastikan skema diinisialisasi
initDbSchema().catch(err => console.error('Gagal inisialisasi:', err));
}

module.exports = app;
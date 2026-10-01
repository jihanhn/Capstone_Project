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

// Routing API
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/kontrakan', kontrakanRoutes);
app.use('/api/penyewa', penyewaRoutes);
app.use('/api/transaksi', transaksiRoutes);
app.use('/api/export', exportRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Sistem Business Intelligence Pengelolaan Risiko Finansial Kontrakan Buti',
    timestamp: new Date().toISOString()
  });
});

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

// Jalankan Server
initDbSchema().then(() => {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` Server BI Kontrakan Buti aktif pada port ${PORT}`);
    console.log(` API Endpoint: http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
  });
}).catch(err => {
  console.error('Inisialisasi database gagal:', err);
});

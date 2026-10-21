const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const possibleEnvPaths = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../../../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'Kontrakan/.env'),
  path.resolve(process.cwd(), 'Kontrakan/server/.env'),
  path.resolve(process.cwd(), 'server/.env')
];
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

const express = require('express');
const cors = require('cors');
const { initDbSchema } = require('./database/db');

const dashboardRoutes = require('./routes/dashboardRoutes');
const kontrakanRoutes = require('./routes/kontrakanRoutes');
const penyewaRoutes = require('./routes/penyewaRoutes');
const transaksiRoutes = require('./routes/transaksiRoutes');
const exportRoutes = require('./routes/exportRoutes');
// TAMBAHAN: Rute Biaya
const biayaRoutes = require('./routes/biayaRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
// TAMBAHAN: Rute Biaya
app.use('/api/biaya', biayaRoutes);
app.use('/biaya', biayaRoutes);

const healthHandler = (req, res) => {
  res.json({
    status: 'online',
    system: 'Sistem Business Intelligence Pengelolaan Risiko Finansial Kontrakan Buti',
    timestamp: new Date().toISOString()
  });
};
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    const indexPath = path.join(clientDistPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        res.json({ message: 'Backend API Kontrakan Buti berjalan. Buka frontend di port dev Vite.' });
      }
    });
  }
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  initDbSchema().then(() => {
    app.listen(PORT, () => {
      console.log(`Server BI Kontrakan Buti aktif pada port ${PORT}`);
    });
  }).catch(err => {
    console.error('Inisialisasi database gagal:', err);
  });
} else {
  initDbSchema().catch(err => console.error('Gagal inisialisasi:', err));
}

module.exports = app;
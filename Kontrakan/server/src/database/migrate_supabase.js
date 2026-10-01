const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

// Zero-dependency .env parser jika dotenv belum terpasang
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const dbPath = path.resolve(__dirname, '../../kontrakan_buti.db');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rilrbfwqujsxpvtzdxik.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

async function migrateViaRest() {
  console.log('--- Migrasi Data dari SQLite ke Supabase REST API ---');
  console.log('Database lokal:', dbPath);
  console.log('Supabase URL:', SUPABASE_URL);

  const sqlite = new DatabaseSync(dbPath);

  const kontrakan = sqlite.prepare('SELECT * FROM tbl_kontrakan').all();
  const penyewa = sqlite.prepare('SELECT * FROM tbl_penyewa').all();
  const riwayat = sqlite.prepare('SELECT * FROM tbl_riwayat_harga').all();
  const transaksi = sqlite.prepare('SELECT * FROM tbl_transaksi_pembayaran').all();

  console.log(`Data lokal ditemukan:
  - tbl_kontrakan: ${kontrakan.length}
  - tbl_penyewa: ${penyewa.length}
  - tbl_riwayat_harga: ${riwayat.length}
  - tbl_transaksi_pembayaran: ${transaksi.length}`);

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
  };

  // 1. tbl_kontrakan
  console.log('Mengirim tbl_kontrakan...');
  let res = await fetch(`${SUPABASE_URL}/rest/v1/tbl_kontrakan`, {
    method: 'POST',
    headers,
    body: JSON.stringify(kontrakan)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gagal migrasi tbl_kontrakan: [${res.status}] ${err}`);
  }
  console.log('✓ tbl_kontrakan berhasil!');

  // 2. tbl_penyewa
  console.log('Mengirim tbl_penyewa...');
  res = await fetch(`${SUPABASE_URL}/rest/v1/tbl_penyewa`, {
    method: 'POST',
    headers,
    body: JSON.stringify(penyewa)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gagal migrasi tbl_penyewa: [${res.status}] ${err}`);
  }
  console.log('✓ tbl_penyewa berhasil!');

  // 3. tbl_riwayat_harga
  console.log('Mengirim tbl_riwayat_harga...');
  res = await fetch(`${SUPABASE_URL}/rest/v1/tbl_riwayat_harga`, {
    method: 'POST',
    headers,
    body: JSON.stringify(riwayat)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gagal migrasi tbl_riwayat_harga: [${res.status}] ${err}`);
  }
  console.log('✓ tbl_riwayat_harga berhasil!');

  // 4. tbl_transaksi_pembayaran (batching per 50 rows)
  console.log('Mengirim tbl_transaksi_pembayaran...');
  const batchSize = 50;
  for (let i = 0; i < transaksi.length; i += batchSize) {
    const chunk = transaksi.slice(i, i + batchSize);
    res = await fetch(`${SUPABASE_URL}/rest/v1/tbl_transaksi_pembayaran`, {
      method: 'POST',
      headers,
      body: JSON.stringify(chunk)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gagal migrasi tbl_transaksi_pembayaran baris ${i + 1}-${i + chunk.length}: [${res.status}] ${err}`);
    }
  }
  console.log('✓ tbl_transaksi_pembayaran berhasil!');

  console.log('\n🎉 SELURUH DATA BERHASIL DIMIGRASIKAN KE SUPABASE!');
}

migrateViaRest().catch(err => {
  console.error('\n❌ Migrasi Gagal:', err.message);
  process.exit(1);
});

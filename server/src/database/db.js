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

const { Pool, types } = require('pg');

types.setTypeParser(1700, val => (val === null ? null : parseFloat(val)));
types.setTypeParser(20, val => (val === null ? null : parseInt(val, 10)));
types.setTypeParser(1082, val => val);

const verifiedSupabaseUrl = 'postgresql://postgres.rilrbfwqujsxpvtzdxik:JihanH2165DB@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true';
const envUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
const connectionString = (envUrl && envUrl.includes('JihanH2165DB')) ? envUrl : verifiedSupabaseUrl;

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10,
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 5000
});

pool.on('connect', () => {
  // Client terkoneksi ke pooler
});

pool.on('error', (err) => {
  // Error pada idle client ditangani otomatis oleh pool dan queryWithRetry
  if (err.message && (err.message.includes('Connection terminated') || err.message.includes('timeout') || err.message.includes('ECONNRESET'))) {
    console.warn('ℹ️ Supabase idle connection di-reset oleh server pooler (auto-reconnect aktif).');
  } else {
    console.error('❌ Database error:', err.message);
  }
});

const convertQuery = (sql) => {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
};

const queryWithRetry = async (sql, params = [], maxRetries = 3) => {
  const converted = convertQuery(sql);
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await pool.query(converted, params);
    } catch (err) {
      lastError = err;
      const isConnectionIssue =
        !err.code ||
        err.message?.includes('Connection terminated') ||
        err.message?.includes('timeout') ||
        err.message?.includes('ECONNRESET') ||
        err.message?.includes('closed') ||
        ['57P01', '08006', '08003', '08000', '08001', '08004'].includes(err.code);

      if (isConnectionIssue && attempt < maxRetries) {
        console.warn(`⚠️ Koneksi database terputus (${err.message}), mencoba ulang otomatis (${attempt}/${maxRetries})...`);
        await new Promise(r => setTimeout(r, attempt * 500));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
};

const db = {
  runAsync: async (sql, params = []) => {
    const res = await queryWithRetry(sql, params);
    return res;
  },
  getAsync: async (sql, params = []) => {
    const res = await queryWithRetry(sql, params);
    return res.rows[0];
  },
  allAsync: async (sql, params = []) => {
    const res = await queryWithRetry(sql, params);
    return res.rows || [];
  }
};

const initDbSchema = async () => {
  try {
    await queryWithRetry('SELECT 1');
    console.log('✅ Koneksi aktif ke Supabase PostgreSQL diverifikasi.');

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS tbl_kontrakan (
        kode_kontrakan TEXT PRIMARY KEY,
        nama_kontrakan TEXT NOT NULL,
        harga_saat_ini NUMERIC NOT NULL,
        status_unit TEXT NOT NULL CHECK(status_unit IN ('Terisi', 'Kosong'))
      )
    `);

    // PERUBAHAN: Tambah tgl_keluar_aktual, status_sewa, dan relasi kode_kontrakan
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS tbl_penyewa (
        id_penyewa TEXT PRIMARY KEY,
        nama_penyewa TEXT NOT NULL,
        no_hp TEXT NOT NULL,
        asal_ktp TEXT,
        tgl_mulai_sewa DATE NOT NULL,
        tgl_selesai_sewa DATE,
        tgl_keluar_aktual DATE,
        status_sewa TEXT DEFAULT 'Aktif',
        kode_kontrakan TEXT REFERENCES tbl_kontrakan(kode_kontrakan) ON DELETE SET NULL
      )
    `);

    // TABEL BARU: Untuk menghitung pengeluaran & laba bersih
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS tbl_pengeluaran_maintenance (
        id_pengeluaran SERIAL PRIMARY KEY,
        kode_kontrakan TEXT REFERENCES tbl_kontrakan(kode_kontrakan) ON DELETE SET NULL,
        tanggal_pengeluaran DATE NOT NULL,
        tahun INT NOT NULL,
        kategori TEXT NOT NULL,
        deskripsi TEXT NOT NULL,
        biaya NUMERIC NOT NULL DEFAULT 0,
        sumber_dana TEXT,
        keterangan TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS tbl_riwayat_harga (
        id_riwayat SERIAL PRIMARY KEY,
        kode_kontrakan TEXT NOT NULL,
        harga_lama NUMERIC NOT NULL,
        harga_baru NUMERIC NOT NULL,
        tgl_berlaku DATE NOT NULL,
        FOREIGN KEY (kode_kontrakan) REFERENCES tbl_kontrakan(kode_kontrakan) ON DELETE CASCADE
      )
    `);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS tbl_transaksi_pembayaran (
        id_transaksi SERIAL PRIMARY KEY,
        kode_kontrakan TEXT NOT NULL,
        id_penyewa TEXT NOT NULL,
        periode_bulan_tahun TEXT NOT NULL,
        status_pembayaran TEXT NOT NULL DEFAULT 'Belum Lunas',
        tgl_lunas DATE,
        cicilan_1_rp NUMERIC DEFAULT 0,
        cicilan_2_rp NUMERIC DEFAULT 0,
        total_terbayar NUMERIC NOT NULL DEFAULT 0,
        harga_sewa_periode NUMERIC NOT NULL,
        catatan TEXT,
        UNIQUE(kode_kontrakan, periode_bulan_tahun),
        FOREIGN KEY (kode_kontrakan) REFERENCES tbl_kontrakan(kode_kontrakan) ON DELETE CASCADE,
        FOREIGN KEY (id_penyewa) REFERENCES tbl_penyewa(id_penyewa) ON DELETE CASCADE
      )
    `);

    // TABEL BARU: One-to-Many Partial Payments (Invoice-based riwayat transaksi)
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS tbl_riwayat_pembayaran (
        id_pembayaran SERIAL PRIMARY KEY,
        id_transaksi INT NOT NULL,
        nominal_bayar NUMERIC NOT NULL,
        tanggal_bayar DATE NOT NULL DEFAULT CURRENT_DATE,
        catatan TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (id_transaksi) REFERENCES tbl_transaksi_pembayaran(id_transaksi) ON DELETE CASCADE
      )
    `);

    // Migrasi data cicilan lama ke tbl_riwayat_pembayaran jika tabel riwayat masih kosong
    try {
      const countRiwayat = await db.getAsync('SELECT COUNT(*) as count FROM tbl_riwayat_pembayaran');
      if (parseInt(countRiwayat?.count || 0) === 0) {
        await db.runAsync(`
          INSERT INTO tbl_riwayat_pembayaran (id_transaksi, nominal_bayar, tanggal_bayar, catatan)
          SELECT id_transaksi, total_terbayar, COALESCE(tgl_lunas, CURRENT_DATE), 'Pembayaran awal'
          FROM tbl_transaksi_pembayaran
          WHERE total_terbayar > 0
        `);
      }
    } catch (migErr) {
      console.warn('Migrasi riwayat pembayaran:', migErr.message);
    }

    // VIEW BARU: Mengatasi bug unit terbaca terisi oleh penyewa lama
    await db.runAsync(`
      CREATE OR REPLACE VIEW v_status_unit_terkini AS
      SELECT 
          k.kode_kontrakan,
          k.nama_kontrakan,
          k.harga_saat_ini,
          CASE 
              WHEN p.id_penyewa IS NOT NULL THEN 'Terisi'
              ELSE 'Kosong'
          END AS status_realtime,
          p.id_penyewa,
          p.nama_penyewa,
          p.tgl_mulai_sewa,
          p.tgl_selesai_sewa
      FROM tbl_kontrakan k
      LEFT JOIN tbl_penyewa p ON k.kode_kontrakan = p.kode_kontrakan 
          AND p.status_sewa = 'Aktif'
          AND (p.tgl_keluar_aktual IS NULL OR p.tgl_keluar_aktual >= CURRENT_DATE)
    `);

    await queryWithRetry(`
      SELECT setval('tbl_riwayat_harga_id_riwayat_seq', GREATEST(COALESCE((SELECT MAX(id_riwayat) FROM tbl_riwayat_harga), 1), 1));
      SELECT setval('tbl_transaksi_pembayaran_id_transaksi_seq', GREATEST(COALESCE((SELECT MAX(id_transaksi) FROM tbl_transaksi_pembayaran), 1), 1));
      SELECT setval('tbl_pengeluaran_maintenance_id_pengeluaran_seq', GREATEST(COALESCE((SELECT MAX(id_pengeluaran) FROM tbl_pengeluaran_maintenance), 1), 1));
      CREATE SEQUENCE IF NOT EXISTS tbl_riwayat_pembayaran_id_pembayaran_seq;
      SELECT setval('tbl_riwayat_pembayaran_id_pembayaran_seq', GREATEST(COALESCE((SELECT MAX(id_pembayaran) FROM tbl_riwayat_pembayaran), 1), 1));
    `);

    console.log('✅ Skema tabel database PostgreSQL Supabase siap dan lengkap.');
  } catch (err) {
    console.error('❌ Gagal inisialisasi skema Supabase:', err.message);
    throw err;
  }
};

module.exports = { db, initDbSchema };
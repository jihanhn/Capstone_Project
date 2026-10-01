require('dotenv').config();
const { Pool, types } = require('pg');

// Parse PostgreSQL NUMERIC (OID 1700) dan BIGINT (OID 20) sebagai Number
types.setTypeParser(1700, val => (val === null ? null : parseFloat(val)));
types.setTypeParser(20, val => (val === null ? null : parseInt(val, 10)));

// Mengambil URL koneksi otomatis dari Vercel/Supabase
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false // Diperlukan untuk koneksi aman ke Supabase
  }
});

pool.on('connect', () => {
  console.log('Berhasil terhubung ke database PostgreSQL Supabase!');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
});

// Helper pintar untuk mengubah format parameter SQLite (?) menjadi PostgreSQL ($1, $2)
const convertQuery = (sql) => {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
};

// Helper Promise wrappers agar file routes Anda tidak perlu diubah sama sekali
const db = {
  runAsync: async (sql, params = []) => {
    const res = await pool.query(convertQuery(sql), params);
    return res;
  },
  getAsync: async (sql, params = []) => {
    const res = await pool.query(convertQuery(sql), params);
    return res.rows[0]; // Ambil baris pertama
  },
  allAsync: async (sql, params = []) => {
    const res = await pool.query(convertQuery(sql), params);
    return res.rows; // Ambil seluruh baris
  }
};

// Inisialisasi skema tabel dengan dialek PostgreSQL
const initDbSchema = async () => {
  try {
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS tbl_kontrakan (
        kode_kontrakan TEXT PRIMARY KEY,
        nama_kontrakan TEXT NOT NULL,
        harga_saat_ini NUMERIC NOT NULL,
        status_unit TEXT NOT NULL CHECK(status_unit IN ('Terisi', 'Kosong'))
      )
    `);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS tbl_penyewa (
        id_penyewa TEXT PRIMARY KEY,
        nama_penyewa TEXT NOT NULL,
        no_hp TEXT NOT NULL,
        asal_ktp TEXT,
        tgl_mulai_sewa DATE NOT NULL,
        tgl_selesai_sewa DATE
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
        status_pembayaran TEXT NOT NULL CHECK(status_pembayaran IN ('Lunas', 'Cicil', 'Belum Lunas')),
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

    console.log('Skema database PostgreSQL Supabase berhasil dibuat/diverifikasi.');
  } catch (err) {
    console.error('Gagal membuat skema:', err);
  }
};

module.exports = {
  db,
  initDbSchema
};
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../kontrakan_buti.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Gagal membuka koneksi database SQLite:', err.message);
  } else {
    console.log('Terhubung ke database SQLite Kontrakan Buti di:', dbPath);
  }
});

// Aktifkan Foreign Keys
db.run('PRAGMA foreign_keys = ON;');

// Helper Promise wrappers untuk kemudahan async/await
db.runAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

db.getAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

db.allAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Inisialisasi skema tabel berdasarkan DESIGN.md
const initDbSchema = async () => {
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS tbl_kontrakan (
      kode_kontrakan TEXT PRIMARY KEY,
      nama_kontrakan TEXT NOT NULL,
      harga_saat_ini REAL NOT NULL,
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
      id_riwayat INTEGER PRIMARY KEY AUTOINCREMENT,
      kode_kontrakan TEXT NOT NULL,
      harga_lama REAL NOT NULL,
      harga_baru REAL NOT NULL,
      tgl_berlaku DATE NOT NULL,
      FOREIGN KEY (kode_kontrakan) REFERENCES tbl_kontrakan(kode_kontrakan) ON DELETE CASCADE
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS tbl_transaksi_pembayaran (
      id_transaksi INTEGER PRIMARY KEY AUTOINCREMENT,
      kode_kontrakan TEXT NOT NULL,
      id_penyewa TEXT NOT NULL,
      periode_bulan_tahun TEXT NOT NULL, -- Format YYYY-MM
      status_pembayaran TEXT NOT NULL CHECK(status_pembayaran IN ('Lunas', 'Cicil', 'Belum Lunas')),
      tgl_lunas DATE,
      cicilan_1_rp REAL DEFAULT 0,
      cicilan_2_rp REAL DEFAULT 0,
      total_terbayar REAL NOT NULL DEFAULT 0,
      harga_sewa_periode REAL NOT NULL,
      catatan TEXT,
      UNIQUE(kode_kontrakan, periode_bulan_tahun),
      FOREIGN KEY (kode_kontrakan) REFERENCES tbl_kontrakan(kode_kontrakan) ON DELETE CASCADE,
      FOREIGN KEY (id_penyewa) REFERENCES tbl_penyewa(id_penyewa) ON DELETE CASCADE
    )
  `);

  console.log('Skema database berhasil diverifikasi/dibuat.');
};

module.exports = {
  db,
  initDbSchema
};

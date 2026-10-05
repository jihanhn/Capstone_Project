const { db, initDbSchema } = require('./db');

async function seedData() {
  await initDbSchema();

  console.log('Membersihkan data lama untuk seeding fresh data...');
  await db.runAsync('DELETE FROM tbl_transaksi_pembayaran');
  await db.runAsync('DELETE FROM tbl_riwayat_harga');
  await db.runAsync('DELETE FROM tbl_penyewa');
  await db.runAsync('DELETE FROM tbl_kontrakan');

  console.log('Menyuntikkan Master Data Unit Kontrakan...');
  const unitList = [
    { kode: 'K1', nama: 'Unit 01 (Lantai 1 Depan)', harga: 1200000, status: 'Terisi' },
    { kode: 'K2', nama: 'Unit 02 (Lantai 1 Tengah)', harga: 1100000, status: 'Terisi' },
    { kode: 'K3', nama: 'Unit 03 (Lantai 1 Belakang)', harga: 1000000, status: 'Terisi' },
    { kode: 'K4', nama: 'Unit 04 (Lantai 2 Depan - Balkon)', harga: 1350000, status: 'Terisi' },
    { kode: 'K5', nama: 'Unit 05 (Lantai 2 Tengah)', harga: 1200000, status: 'Kosong' },
    { kode: 'K6', nama: 'Unit 06 (Lantai 2 Belakang)', harga: 1150000, status: 'Terisi' },
    { kode: 'K1A', nama: 'Paviliun 1A (Studio Luas)', harga: 1500000, status: 'Terisi' },
    { kode: 'K2A', nama: 'Paviliun 2A (Studio Hemat)', harga: 950000, status: 'Terisi' }
  ];

  for (const u of unitList) {
    await db.runAsync(
      'INSERT INTO tbl_kontrakan (kode_kontrakan, nama_kontrakan, harga_saat_ini, status_unit) VALUES (?, ?, ?, ?)',
      [u.kode, u.nama, u.harga, u.status]
    );
  }

  console.log('Menyuntikkan Master Data Penyewa...');
  const penyewaList = [
    { id: 'P001', nama: 'Budi Santoso', hp: '081234567890', ktp: 'Bandung', mulai: '2023-01-10', selesai: '2026-12-31' },
    { id: 'P002', nama: 'Siti Aminah', hp: '081398765432', ktp: 'Cimahi', mulai: '2023-03-01', selesai: '2026-12-31' },
    { id: 'P003', nama: 'Rudi Hermawan', hp: '085712349988', ktp: 'Garut', mulai: '2023-06-15', selesai: '2026-12-31' },
    { id: 'P004', nama: 'Agus Pratama', hp: '082155667788', ktp: 'Tasikmalaya', mulai: '2024-01-05', selesai: '2026-12-31' },
    { id: 'P005', nama: 'Dewi Lestari', hp: '081900112233', ktp: 'Sumedang', mulai: '2023-08-01', selesai: '2026-12-31' },
    { id: 'P006', nama: 'Fajar Nugraha', hp: '087822334455', ktp: 'Subang', mulai: '2024-02-01', selesai: '2026-12-31' },
    { id: 'P007', nama: 'Hendri Gunawan', hp: '089677889900', ktp: 'Bogor', mulai: '2024-05-10', selesai: '2026-12-31' }
  ];

  for (const p of penyewaList) {
    await db.runAsync(
      'INSERT INTO tbl_penyewa (id_penyewa, nama_penyewa, no_hp, asal_ktp, tgl_mulai_sewa, tgl_selesai_sewa) VALUES (?, ?, ?, ?, ?, ?)',
      [p.id, p.nama, p.hp, p.ktp, p.mulai, p.selesai]
    );
  }

  console.log('Menyuntikkan Riwayat Penyesuaian Tarif...');
  const riwayatList = [
    { kode: 'K1', lama: 1000000, baru: 1200000, tgl: '2024-01-01' },
    { kode: 'K4', lama: 1200000, baru: 1350000, tgl: '2024-01-01' },
    { kode: 'K1A', lama: 1350000, baru: 1500000, tgl: '2024-06-01' }
  ];

  for (const r of riwayatList) {
    await db.runAsync(
      'INSERT INTO tbl_riwayat_harga (kode_kontrakan, harga_lama, harga_baru, tgl_berlaku) VALUES (?, ?, ?, ?)',
      [r.kode, r.lama, r.baru, r.tgl]
    );
  }

  console.log('Menyuntikkan Transaksi Historis Multi-Tahun (2024 s/d 2026)...');
  // Mapping unit ke penyewa
  const tenantMap = {
    'K1': 'P001',
    'K2': 'P002',
    'K3': 'P003',
    'K4': 'P004',
    'K6': 'P005',
    'K1A': 'P006',
    'K2A': 'P007'
  };

  const hargaMap = {
    'K1': 1200000,
    'K2': 1100000,
    'K3': 1000000,
    'K4': 1350000,
    'K6': 1150000,
    'K1A': 1500000,
    'K2A': 950000
  };

  // Generate data bulanan dari 2024-01 hingga 2026-09
  const transactions = [];

  const startYear = 2024;
  const endYear = 2026;
  const endMonth = 9; // Sampai September 2026

  for (let year = startYear; year <= endYear; year++) {
    const maxM = (year === endYear) ? endMonth : 12;
    for (let month = 1; month <= maxM; month++) {
      const monthStr = month.toString().padStart(2, '0');
      const periode = `${year}-${monthStr}`;

      for (const [kode, idPenyewa] of Object.entries(tenantMap)) {
        const harga = hargaMap[kode];

        // Skenario variasi pembayaran untuk menguji model risiko:
        // 1. Rudi Hermawan (P003 - K3): Sering menunggak / High Risk
        // 2. Agus Pratama (P004 - K4): Sering bayar cicil 2x / Medium Risk
        // 3. Fajar Nugraha (P006 - K1A): Pernah terlambat 10 hari / Medium Risk
        // 4. Budi Santoso (P001 - K1), Siti Aminah (P002 - K2), dll: Disiplin bayar tepat waktu / Low Risk

        let status = 'Lunas';
        let tglLunas = `${periode}-04`; // Tepat waktu (sebelum tgl 5)
        let c1 = harga;
        let c2 = 0;
        let total = harga;
        let catatan = 'Pembayaran lancar';

        if (idPenyewa === 'P003') {
          // Rudi: di bulan-bulan belakangan (misal 2026-07, 2026-08, 2026-09) mulai menunggak parah
          if (year === 2026 && month >= 7) {
            status = 'Belum Lunas';
            tglLunas = null;
            c1 = 0;
            c2 = 0;
            total = 0;
            catatan = 'Menunggak lebih dari 1 bulan, belum ada pembayaran';
          } else if (month % 3 === 0) {
            status = 'Cicil';
            tglLunas = null;
            c1 = harga / 2;
            c2 = 0;
            total = c1;
            catatan = 'Baru bayar separuh, menunggak sisa';
          } else {
            status = 'Lunas';
            tglLunas = `${periode}-16`; // Terlambat 11 hari (L=3)
            c1 = harga;
            total = harga;
            catatan = 'Lunas setelah ditegur';
          }
        } else if (idPenyewa === 'P004') {
          // Agus: rajin cicil 2 kali
          if (month % 2 === 0) {
            status = 'Lunas';
            tglLunas = `${periode}-14`; // Cicilan kedua tgl 14
            c1 = 700000;
            c2 = 650000;
            total = 1350000;
            catatan = 'Lunas dengan 2 kali cicilan';
          } else {
            status = 'Lunas';
            tglLunas = `${periode}-05`;
            c1 = harga;
            total = harga;
            catatan = 'Lunas tepat waktu';
          }
        } else if (idPenyewa === 'P006' && year === 2026 && month === 9) {
          // Fajar di bulan berjalan: baru cicilan 1
          status = 'Cicil';
          tglLunas = null;
          c1 = 1000000;
          c2 = 0;
          total = 1000000;
          catatan = 'Cicilan pertama masuk, menunggu pelunasan sisa';
        }

        transactions.push({
          kode,
          penyewa: idPenyewa,
          periode,
          status,
          tglLunas,
          c1,
          c2,
          total,
          harga,
          catatan
        });
      }
    }
  }

  const insertStmt = `
    INSERT INTO tbl_transaksi_pembayaran 
    (kode_kontrakan, id_penyewa, periode_bulan_tahun, status_pembayaran, tgl_lunas, cicilan_1_rp, cicilan_2_rp, total_terbayar, harga_sewa_periode, catatan)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  for (const t of transactions) {
    await db.runAsync(insertStmt, [
      t.kode,
      t.penyewa,
      t.periode,
      t.status,
      t.tglLunas,
      t.c1,
      t.c2,
      t.total,
      t.harga,
      t.catatan
    ]);
  }

  console.log(`Seeding selesai! Total ${transactions.length} baris transaksi berhasil dimasukkan.`);
  process.exit(0);
}

seedData().catch(err => {
  console.error('Error saat seeding database:', err);
  process.exit(1);
});

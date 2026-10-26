const { db } = require('../database/db');
const { calculateUnitVacancy } = require('../utils/vacancyCalculator');

const getAllUnits = async (req, res) => {
  try {
    const units = await db.allAsync(`
      SELECT v.*, 
        k.tgl_kosong_sejak as tgl_kosong_master,
        COALESCE(
          v.nama_penyewa, 
          (SELECT p.nama_penyewa FROM tbl_transaksi_pembayaran t 
           JOIN tbl_penyewa p ON t.id_penyewa = p.id_penyewa 
           WHERE t.kode_kontrakan = v.kode_kontrakan 
           ORDER BY t.periode_bulan_tahun DESC LIMIT 1),
          (SELECT p2.nama_penyewa FROM tbl_penyewa p2
           WHERE p2.kode_kontrakan = v.kode_kontrakan
           ORDER BY p2.tgl_mulai_sewa DESC LIMIT 1)
        ) as penyewa_terakhir
      FROM v_status_unit_terkini v
      JOIN tbl_kontrakan k ON v.kode_kontrakan = k.kode_kontrakan
      ORDER BY v.kode_kontrakan ASC
    `);

    // Kalkulasi total kapasitas sewa penuh untuk persentase beban loss
    const totalSemuaUnit = await db.getAsync(`SELECT SUM(harga_saat_ini) as total FROM tbl_kontrakan`);
    const totalKapasitas = parseFloat(totalSemuaUnit?.total) || 1;

    // Kalkulasi vacancy details jika unit terdeteksi Kosong
    const formattedUnits = await Promise.all(units.map(async (u) => {
      const status_unit = u.status_realtime;
      let vacancyDetails = {};

      if (status_unit === 'Kosong') {
        const lastTx = await db.getAsync(`
          SELECT t.periode_bulan_tahun, p.nama_penyewa
          FROM tbl_transaksi_pembayaran t
          LEFT JOIN tbl_penyewa p ON t.id_penyewa = p.id_penyewa
          WHERE t.kode_kontrakan = ?
          ORDER BY t.periode_bulan_tahun DESC
          LIMIT 1
        `, [u.kode_kontrakan]);

        const lastPenyewa = await db.getAsync(`
          SELECT p.*
          FROM tbl_penyewa p
          WHERE p.kode_kontrakan = ?
          ORDER BY p.tgl_mulai_sewa DESC
          LIMIT 1
        `, [u.kode_kontrakan]);

        vacancyDetails = calculateUnitVacancy({
          unit: u,
          lastTx,
          lastPenyewa,
          totalKapasitas
        });
      }

      return {
        ...u,
        status_unit,
        ...vacancyDetails,
        penyewa_terakhir: vacancyDetails.penyewa_terakhir || u.penyewa_terakhir || null
      };
    }));
    
    res.json(formattedUnits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Helper untuk auto-generate Kode Unit/Properti berdasarkan pola penomoran unit terakhir
const getNextKontrakanId = async (customPrefix = null) => {
  const rows = await db.allAsync('SELECT kode_kontrakan FROM tbl_kontrakan ORDER BY kode_kontrakan ASC');
  
  if (!rows || rows.length === 0) {
    return {
      nextId: 'L1-DLM-01',
      prefix: 'L1-DLM-',
      lastNumber: 0,
      nextNumber: 1
    };
  }

  const existingSet = new Set(rows.map(r => (r.kode_kontrakan ? r.kode_kontrakan.toUpperCase().trim() : '')));
  
  let bestPrefix = customPrefix || 'L1-DLM-';
  let maxNum = 0;
  let padLen = 2;

  // Analisis pola dari kode yang sudah ada
  for (const r of rows) {
    const code = (r.kode_kontrakan || '').trim();
    const match = code.match(/^(.*?)(\d+)$/);
    if (match) {
      const prefix = match[1];
      const digits = match[2];
      const num = parseInt(digits, 10);
      if (!isNaN(num)) {
        if (!customPrefix) {
          if (num > maxNum) {
            maxNum = num;
            bestPrefix = prefix;
            padLen = Math.max(digits.length, 2);
          }
        } else if (prefix.toUpperCase() === customPrefix.toUpperCase()) {
          if (num > maxNum) {
            maxNum = num;
            padLen = Math.max(digits.length, 2);
          }
        }
      }
    }
  }

  if (maxNum === 0 && !customPrefix) {
    bestPrefix = 'L1-DLM-';
    maxNum = rows.length;
    padLen = 2;
  }

  let nextNum = maxNum + 1;
  let candidate = `${bestPrefix}${String(nextNum).padStart(padLen, '0')}`;

  // Pastikan bebas konflik / duplikasi
  while (existingSet.has(candidate.toUpperCase())) {
    nextNum++;
    candidate = `${bestPrefix}${String(nextNum).padStart(padLen, '0')}`;
  }

  return {
    nextId: candidate,
    prefix: bestPrefix,
    lastNumber: maxNum,
    nextNumber: nextNum
  };
};

const getNextId = async (req, res) => {
  try {
    const { prefix } = req.query;
    const result = await getNextKontrakanId(prefix);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createUnit = async (req, res) => {
  try {
    let { kode_kontrakan, nama_kontrakan, harga_saat_ini, status_unit, tgl_kosong_sejak } = req.body;
    
    // Auto-generate kode jika tidak diisi atau kosong
    if (!kode_kontrakan || String(kode_kontrakan).trim() === '') {
      const gen = await getNextKontrakanId();
      kode_kontrakan = gen.nextId;
    } else {
      kode_kontrakan = String(kode_kontrakan).toUpperCase().trim();
    }

    if (!nama_kontrakan || !harga_saat_ini) {
      return res.status(400).json({ error: 'Nama unit dan harga kontrakan wajib diisi' });
    }

    const cleanTglKosong = (status_unit === 'Kosong')
      ? (tgl_kosong_sejak && String(tgl_kosong_sejak).trim() !== '' ? tgl_kosong_sejak : new Date().toISOString().split('T')[0])
      : null;

    await db.runAsync(
      'INSERT INTO tbl_kontrakan (kode_kontrakan, nama_kontrakan, harga_saat_ini, status_unit, tgl_kosong_sejak) VALUES (?, ?, ?, ?, ?)',
      [kode_kontrakan, nama_kontrakan.trim(), Number(harga_saat_ini), status_unit || 'Kosong', cleanTglKosong]
    );

    res.status(201).json({ message: 'Unit kontrakan berhasil ditambahkan', kode_kontrakan });
  } catch (err) {
    if (err.message.includes('UNIQUE') || err.message.includes('duplicate')) {
      return res.status(400).json({ error: 'Kode kontrakan sudah ada, gunakan kode lain' });
    }
    res.status(500).json({ error: err.message });
  }
};

const updateUnit = async (req, res) => {
  try {
    const { kode } = req.params;
    const { nama_kontrakan, harga_saat_ini, status_unit, berlaku_mulai, tgl_kosong_sejak, tipe_perbaikan, kosongkan_penyewa } = req.body;

    const currentUnit = await db.getAsync('SELECT * FROM tbl_kontrakan WHERE kode_kontrakan = ?', [kode]);
    if (!currentUnit) {
      return res.status(404).json({ error: 'Unit kontrakan tidak ditemukan' });
    }

    if (Number(harga_saat_ini) !== Number(currentUnit.harga_saat_ini)) {
      let tglBerlaku;
      if (berlaku_mulai && String(berlaku_mulai).trim() !== '') {
        const trimmed = String(berlaku_mulai).trim();
        tglBerlaku = trimmed.length === 7 ? `${trimmed}-01` : trimmed;
      } else {
        tglBerlaku = new Date().toISOString().split('T')[0];
      }

      await db.runAsync(
        'INSERT INTO tbl_riwayat_harga (kode_kontrakan, harga_lama, harga_baru, tgl_berlaku) VALUES (?, ?, ?, ?)',
        [kode, currentUnit.harga_saat_ini, Number(harga_saat_ini), tglBerlaku]
      );
    }

    // Cek apakah ada penyewa aktif yang menghuni unit ini
    const activeTenant = await db.getAsync(`
      SELECT * FROM tbl_penyewa 
      WHERE kode_kontrakan = ? 
        AND status_sewa = 'Aktif' 
        AND (tgl_keluar_aktual IS NULL OR tgl_keluar_aktual > CURRENT_DATE)
      LIMIT 1
    `, [kode]);

    let finalStatusUnit = status_unit;
    let cleanTglKosong = null;

    if (status_unit === 'Kosong') {
      if (tgl_kosong_sejak && String(tgl_kosong_sejak).trim() !== '') {
        cleanTglKosong = tgl_kosong_sejak;
      } else if (currentUnit.tgl_kosong_sejak) {
        cleanTglKosong = currentUnit.tgl_kosong_sejak;
      } else {
        cleanTglKosong = new Date().toISOString().split('T')[0];
      }

      // Jika diset ke Kosong, keluarkan penyewa yang masih aktif di unit ini & ubah status_sewa ke 'Tidak Aktif'
      if (activeTenant) {
        await db.runAsync(
          'UPDATE tbl_penyewa SET kode_kontrakan = NULL, status_sewa = \'Tidak Aktif\', tgl_keluar_aktual = COALESCE(tgl_keluar_aktual, ?) WHERE kode_kontrakan = ?',
          [cleanTglKosong, kode]
        );
      }
    } else if (status_unit === 'Dalam Perbaikan') {
      finalStatusUnit = 'Dalam Perbaikan';
      cleanTglKosong = null;

      // Bedakan Perbaikan Berat (kamar dikosongkan) vs Perbaikan Ringan (penyewa tetap tinggal)
      if (tipe_perbaikan === 'berat' || kosongkan_penyewa === true) {
        if (activeTenant) {
          const tglKeluar = tgl_kosong_sejak && String(tgl_kosong_sejak).trim() !== '' 
            ? tgl_kosong_sejak 
            : new Date().toISOString().split('T')[0];
          await db.runAsync(
            'UPDATE tbl_penyewa SET kode_kontrakan = NULL, status_sewa = \'Tidak Aktif\', tgl_keluar_aktual = COALESCE(tgl_keluar_aktual, ?) WHERE kode_kontrakan = ?',
            [tglKeluar, kode]
          );
        }
      }
      // Jika perbaikan ringan: penyewa TETAP ADA dan TIDAK DIKELUARKAN.
    } else if (status_unit === 'Terisi') {
      // Mengembalikan unit dari 'Dalam Perbaikan' ke 'Terisi'
      finalStatusUnit = 'Terisi';
      cleanTglKosong = null;
    }

    await db.runAsync(
      'UPDATE tbl_kontrakan SET nama_kontrakan = ?, harga_saat_ini = ?, status_unit = ?, tgl_kosong_sejak = ? WHERE kode_kontrakan = ?',
      [nama_kontrakan, Number(harga_saat_ini), finalStatusUnit, cleanTglKosong, kode]
    );

    res.json({ message: 'Unit kontrakan berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getRiwayatHarga = async (req, res) => {
  try {
    const { kode } = req.params;
    const history = await db.allAsync(
      'SELECT * FROM tbl_riwayat_harga WHERE kode_kontrakan = ? ORDER BY tgl_berlaku DESC, id_riwayat DESC',
      [kode]
    );
    res.json(history || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteUnit = async (req, res) => {
  try {
    const { kode } = req.params;
    await db.runAsync('DELETE FROM tbl_kontrakan WHERE kode_kontrakan = ?', [kode]);
    res.json({ message: 'Unit kontrakan berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllUnits,
  getNextId,
  createUnit,
  updateUnit,
  getRiwayatHarga,
  deleteUnit
};


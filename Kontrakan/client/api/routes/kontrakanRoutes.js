const express = require('express');
const router = express.Router();
const { db } = require('../database/db');

// GET all unit kontrakan
router.get('/', async (req, res) => {
  try {
    const units = await db.allAsync(`
      SELECT k.*, 
        (SELECT p.nama_penyewa FROM tbl_transaksi_pembayaran t 
         JOIN tbl_penyewa p ON t.id_penyewa = p.id_penyewa 
         WHERE t.kode_kontrakan = k.kode_kontrakan 
         ORDER BY t.periode_bulan_tahun DESC LIMIT 1) as penyewa_terakhir
      FROM tbl_kontrakan k
      ORDER BY k.kode_kontrakan ASC
    `);
    res.json(units);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new unit kontrakan
router.post('/', async (req, res) => {
  try {
    const { kode_kontrakan, nama_kontrakan, harga_saat_ini, status_unit } = req.body;
    if (!kode_kontrakan || !nama_kontrakan || !harga_saat_ini) {
      return res.status(400).json({ error: 'Kode, nama, dan harga kontrakan wajib diisi' });
    }

    await db.runAsync(
      'INSERT INTO tbl_kontrakan (kode_kontrakan, nama_kontrakan, harga_saat_ini, status_unit) VALUES (?, ?, ?, ?)',
      [kode_kontrakan.toUpperCase().trim(), nama_kontrakan.trim(), Number(harga_saat_ini), status_unit || 'Kosong']
    );

    res.status(201).json({ message: 'Unit kontrakan berhasil ditambahkan' });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Kode kontrakan sudah ada, gunakan kode lain' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT update unit kontrakan (catat riwayat harga jika berubah)
router.put('/:kode', async (req, res) => {
  try {
    const { kode } = req.params;
    const { nama_kontrakan, harga_saat_ini, status_unit } = req.body;

    const currentUnit = await db.getAsync('SELECT * FROM tbl_kontrakan WHERE kode_kontrakan = ?', [kode]);
    if (!currentUnit) {
      return res.status(404).json({ error: 'Unit kontrakan tidak ditemukan' });
    }

    // Jika harga berubah, rekam ke tbl_riwayat_harga
    if (Number(harga_saat_ini) !== Number(currentUnit.harga_saat_ini)) {
      const today = new Date().toISOString().split('T')[0];
      await db.runAsync(
        'INSERT INTO tbl_riwayat_harga (kode_kontrakan, harga_lama, harga_baru, tgl_berlaku) VALUES (?, ?, ?, ?)',
        [kode, currentUnit.harga_saat_ini, Number(harga_saat_ini), today]
      );
    }

    await db.runAsync(
      'UPDATE tbl_kontrakan SET nama_kontrakan = ?, harga_saat_ini = ?, status_unit = ? WHERE kode_kontrakan = ?',
      [nama_kontrakan, Number(harga_saat_ini), status_unit, kode]
    );

    res.json({ message: 'Unit kontrakan berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE unit kontrakan
router.delete('/:kode', async (req, res) => {
  try {
    const { kode } = req.params;
    await db.runAsync('DELETE FROM tbl_kontrakan WHERE kode_kontrakan = ?', [kode]);
    res.json({ message: 'Unit kontrakan berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

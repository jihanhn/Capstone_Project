const express = require('express');
const router = express.Router();
const { db } = require('../database/db');

// GET all penyewa
router.get('/', async (req, res) => {
  try {
    const penyewa = await db.allAsync(`
      SELECT p.*,
        (SELECT k.nama_kontrakan FROM tbl_transaksi_pembayaran t 
         JOIN tbl_kontrakan k ON t.kode_kontrakan = k.kode_kontrakan 
         WHERE t.id_penyewa = p.id_penyewa 
         ORDER BY t.periode_bulan_tahun DESC LIMIT 1) as unit_sekarang,
        (SELECT t.kode_kontrakan FROM tbl_transaksi_pembayaran t 
         WHERE t.id_penyewa = p.id_penyewa 
         ORDER BY t.periode_bulan_tahun DESC LIMIT 1) as kode_unit_sekarang
      FROM tbl_penyewa p
      ORDER BY p.id_penyewa ASC
    `);
    res.json(penyewa);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new penyewa
router.post('/', async (req, res) => {
  try {
    const { id_penyewa, nama_penyewa, no_hp, asal_ktp, tgl_mulai_sewa, tgl_selesai_sewa } = req.body;
    if (!id_penyewa || !nama_penyewa || !no_hp || !tgl_mulai_sewa) {
      return res.status(400).json({ error: 'ID, nama, no HP, dan tanggal mulai sewa wajib diisi' });
    }

    await db.runAsync(
      'INSERT INTO tbl_penyewa (id_penyewa, nama_penyewa, no_hp, asal_ktp, tgl_mulai_sewa, tgl_selesai_sewa) VALUES (?, ?, ?, ?, ?, ?)',
      [id_penyewa.toUpperCase().trim(), nama_penyewa.trim(), no_hp.trim(), asal_ktp ? asal_ktp.trim() : null, tgl_mulai_sewa, tgl_selesai_sewa || null]
    );

    res.status(201).json({ message: 'Penyewa berhasil ditambahkan' });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'ID Penyewa sudah terdaftar, gunakan ID lain' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT update penyewa
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_penyewa, no_hp, asal_ktp, tgl_mulai_sewa, tgl_selesai_sewa } = req.body;

    await db.runAsync(
      'UPDATE tbl_penyewa SET nama_penyewa = ?, no_hp = ?, asal_ktp = ?, tgl_mulai_sewa = ?, tgl_selesai_sewa = ? WHERE id_penyewa = ?',
      [nama_penyewa, no_hp, asal_ktp, tgl_mulai_sewa, tgl_selesai_sewa, id]
    );

    res.json({ message: 'Data penyewa berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE penyewa
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.runAsync('DELETE FROM tbl_penyewa WHERE id_penyewa = ?', [id]);
    res.json({ message: 'Data penyewa berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

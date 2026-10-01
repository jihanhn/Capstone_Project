const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { computeRiskScore } = require('../services/riskEngine');

// GET all transaksi dengan filter
router.get('/', async (req, res) => {
  try {
    const { periode, kode_kontrakan, status_pembayaran } = req.query;

    let sql = `
      SELECT t.*, k.nama_kontrakan, p.nama_penyewa, p.no_hp, p.asal_ktp
      FROM tbl_transaksi_pembayaran t
      JOIN tbl_kontrakan k ON t.kode_kontrakan = k.kode_kontrakan
      JOIN tbl_penyewa p ON t.id_penyewa = p.id_penyewa
      WHERE 1=1
    `;
    const params = [];

    if (periode) {
      sql += ' AND t.periode_bulan_tahun = ?';
      params.push(periode);
    }
    if (kode_kontrakan) {
      sql += ' AND t.kode_kontrakan = ?';
      params.push(kode_kontrakan);
    }
    if (status_pembayaran) {
      sql += ' AND t.status_pembayaran = ?';
      params.push(status_pembayaran);
    }

    sql += ' ORDER BY t.periode_bulan_tahun DESC, t.kode_kontrakan ASC';

    const rows = await db.allAsync(sql, params);

    // Hitung risk score per transaksi
    const enriched = rows.map(t => {
      const risk = computeRiskScore({
        periode: t.periode_bulan_tahun,
        tglLunas: t.tgl_lunas,
        statusPembayaran: t.status_pembayaran,
        cicilan1: t.cicilan_1_rp,
        cicilan2: t.cicilan_2_rp,
        totalTerbayar: t.total_terbayar,
        hargaSewa: t.harga_sewa_periode
      });

      return {
        ...t,
        sisa_tagihan: Math.max(0, t.harga_sewa_periode - t.total_terbayar),
        riskScore: risk.score,
        kategoriRisiko: risk.kategori,
        badgeColor: risk.badgeColor,
        rekomendasi: risk.rekomendasi,
        breakdown: risk.breakdown
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST buat transaksi baru (dengan proteksi duplikasi)
router.post('/', async (req, res) => {
  try {
    const {
      kode_kontrakan,
      id_penyewa,
      periode_bulan_tahun,
      status_pembayaran,
      tgl_lunas,
      cicilan_1_rp = 0,
      cicilan_2_rp = 0,
      catatan
    } = req.body;

    if (!kode_kontrakan || !id_penyewa || !periode_bulan_tahun || !status_pembayaran) {
      return res.status(400).json({ error: 'Unit kontrakan, penyewa, periode bulan, dan status pembayaran wajib diisi' });
    }

    // Cek apakah sudah ada transaksi pada unit dan periode yang sama (PRD Section 4 - Data Integrity)
    const existing = await db.getAsync(
      'SELECT id_transaksi FROM tbl_transaksi_pembayaran WHERE kode_kontrakan = ? AND periode_bulan_tahun = ?',
      [kode_kontrakan, periode_bulan_tahun]
    );
    if (existing) {
      return res.status(400).json({
        error: `Transaksi untuk unit ${kode_kontrakan} pada periode ${periode_bulan_tahun} sudah terdaftar!`
      });
    }

    // Ambil harga sewa unit saat ini
    const unit = await db.getAsync('SELECT harga_saat_ini FROM tbl_kontrakan WHERE kode_kontrakan = ?', [kode_kontrakan]);
    if (!unit) {
      return res.status(404).json({ error: 'Unit kontrakan tidak ditemukan' });
    }

    const harga_sewa_periode = unit.harga_saat_ini;
    const c1 = Number(cicilan_1_rp) || 0;
    const c2 = Number(cicilan_2_rp) || 0;
    const total_terbayar = c1 + c2;

    const result = await db.runAsync(`
      INSERT INTO tbl_transaksi_pembayaran
      (kode_kontrakan, id_penyewa, periode_bulan_tahun, status_pembayaran, tgl_lunas, cicilan_1_rp, cicilan_2_rp, total_terbayar, harga_sewa_periode, catatan)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      kode_kontrakan,
      id_penyewa,
      periode_bulan_tahun,
      status_pembayaran,
      tgl_lunas || null,
      c1,
      c2,
      total_terbayar,
      harga_sewa_periode,
      catatan || null
    ]);

    // Update unit status menjadi 'Terisi'
    await db.runAsync("UPDATE tbl_kontrakan SET status_unit = 'Terisi' WHERE kode_kontrakan = ?", [kode_kontrakan]);

    res.status(201).json({
      message: 'Transaksi pembayaran berhasil dicatat',
      id_transaksi: result.lastID
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update transaksi pembayaran (misal pembayaran cicilan ke-2 atau perubahan status)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status_pembayaran,
      tgl_lunas,
      cicilan_1_rp = 0,
      cicilan_2_rp = 0,
      catatan
    } = req.body;

    const c1 = Number(cicilan_1_rp) || 0;
    const c2 = Number(cicilan_2_rp) || 0;
    const total_terbayar = c1 + c2;

    await db.runAsync(`
      UPDATE tbl_transaksi_pembayaran
      SET status_pembayaran = ?,
          tgl_lunas = ?,
          cicilan_1_rp = ?,
          cicilan_2_rp = ?,
          total_terbayar = ?,
          catatan = ?
      WHERE id_transaksi = ?
    `, [
      status_pembayaran,
      tgl_lunas || null,
      c1,
      c2,
      total_terbayar,
      catatan || null,
      id
    ]);

    res.json({ message: 'Data transaksi berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE transaksi
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.runAsync('DELETE FROM tbl_transaksi_pembayaran WHERE id_transaksi = ?', [id]);
    res.json({ message: 'Transaksi berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

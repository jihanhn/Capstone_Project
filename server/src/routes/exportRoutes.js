const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { computeRiskScore } = require('../services/riskEngine');

// GET /api/export/csv?periode=&tahun=
router.get('/csv', async (req, res) => {
  try {
    const { periode, tahun } = req.query;

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
    } else if (tahun) {
      sql += ' AND t.periode_bulan_tahun LIKE ?';
      params.push(`${tahun}-%`);
    }

    sql += ' ORDER BY t.periode_bulan_tahun DESC, t.kode_kontrakan ASC';

    const rows = await db.allAsync(sql, params);

    // Siapkan baris CSV
    const headers = [
      'ID Transaksi',
      'Periode',
      'Kode Unit',
      'Nama Kontrakan',
      'ID Penyewa',
      'Nama Penyewa',
      'No HP',
      'Tarif Sewa (Rp)',
      'Cicilan 1 (Rp)',
      'Cicilan 2 (Rp)',
      'Total Terbayar (Rp)',
      'Sisa Tagihan (Rp)',
      'Status Pembayaran',
      'Tanggal Lunas',
      'Risk Score',
      'Kategori Risiko',
      'Rekomendasi Tindakan',
      'Catatan'
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const csvLines = [headers.join(',')];

    rows.forEach(t => {
      const risk = computeRiskScore({
        periode: t.periode_bulan_tahun,
        tglLunas: t.tgl_lunas,
        statusPembayaran: t.status_pembayaran,
        cicilan1: t.cicilan_1_rp,
        cicilan2: t.cicilan_2_rp,
        totalTerbayar: t.total_terbayar,
        hargaSewa: t.harga_sewa_periode
      });

      const sisa = Math.max(0, t.harga_sewa_periode - t.total_terbayar);

      const row = [
        t.id_transaksi,
        escapeCsv(t.periode_bulan_tahun),
        escapeCsv(t.kode_kontrakan),
        escapeCsv(t.nama_kontrakan),
        escapeCsv(t.id_penyewa),
        escapeCsv(t.nama_penyewa),
        escapeCsv(t.no_hp),
        t.harga_sewa_periode,
        t.cicilan_1_rp || 0,
        t.cicilan_2_rp || 0,
        t.total_terbayar || 0,
        sisa,
        escapeCsv(t.status_pembayaran),
        escapeCsv(t.tgl_lunas || '-'),
        risk.score,
        escapeCsv(risk.kategori),
        escapeCsv(risk.rekomendasi),
        escapeCsv(t.catatan || '-')
      ];

      csvLines.push(row.join(','));
    });

    const csvContent = csvLines.join('\r\n');
    const filename = `Laporan_BI_Kontrakan_${periode || tahun || 'Semua'}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csvContent); // Tambahkan BOM UTF-8 agar rapi dibuka di Excel
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

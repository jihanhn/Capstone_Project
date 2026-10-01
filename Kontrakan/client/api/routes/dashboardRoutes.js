const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { computeRiskScore } = require('../services/riskEngine');

// GET /api/dashboard/stats?periode=YYYY-MM
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    const defaultPeriode = `${currentYear}-${currentMonth}`;

    const periode = req.query.periode || defaultPeriode;

    // 1. Total Unit & Okupansi
    const totalUnitRow = await db.getAsync('SELECT COUNT(*) as total FROM tbl_kontrakan');
    const terisiUnitRow = await db.getAsync("SELECT COUNT(*) as terisi FROM tbl_kontrakan WHERE status_unit = 'Terisi'");
    const totalUnit = totalUnitRow.total || 0;
    const unitTerisi = terisiUnitRow.terisi || 0;
    const occupancyRate = totalUnit > 0 ? ((unitTerisi / totalUnit) * 100).toFixed(1) : 0;

    // 2. Transaksi pada periode tersebut
    const transaksiList = await db.allAsync(`
      SELECT t.*, k.nama_kontrakan, p.nama_penyewa, p.no_hp
      FROM tbl_transaksi_pembayaran t
      LEFT JOIN tbl_kontrakan k ON t.kode_kontrakan = k.kode_kontrakan
      LEFT JOIN tbl_penyewa p ON t.id_penyewa = p.id_penyewa
      WHERE t.periode_bulan_tahun = ?
    `, [periode]);

    // 3. Potensi Pendapatan: harga unit terisi saat ini
    const potensiRow = await db.getAsync(`
      SELECT SUM(harga_saat_ini) as total_potensi 
      FROM tbl_kontrakan 
      WHERE status_unit = 'Terisi'
    `);
    const totalPotensi = potensiRow.total_potensi || 0;

    // 4. Realisasi Pendapatan: total uang yang sudah masuk pada periode ini
    let totalRealisasi = 0;
    let highRiskCount = 0;
    let mediumRiskCount = 0;
    let lowRiskCount = 0;

    transaksiList.forEach(t => {
      totalRealisasi += (t.total_terbayar || 0);
      const risk = computeRiskScore({
        periode: t.periode_bulan_tahun,
        tglLunas: t.tgl_lunas,
        statusPembayaran: t.status_pembayaran,
        cicilan1: t.cicilan_1_rp,
        cicilan2: t.cicilan_2_rp,
        totalTerbayar: t.total_terbayar,
        hargaSewa: t.harga_sewa_periode
      });
      if (risk.kategori === 'High') highRiskCount++;
      else if (risk.kategori === 'Medium') mediumRiskCount++;
      else lowRiskCount++;
    });

    const gapFinansial = Math.max(0, totalPotensi - totalRealisasi);

    res.json({
      periode,
      totalUnit,
      unitTerisi,
      unitKosong: totalUnit - unitTerisi,
      occupancyRate: Number(occupancyRate),
      totalPotensi,
      totalRealisasi,
      gapFinansial,
      highRiskCount,
      mediumRiskCount,
      lowRiskCount
    });
  } catch (err) {
    console.error('Error stats:', err);
    res.status(500).json({ error: 'Gagal mengambil statistik dashboard' });
  }
});

// GET /api/dashboard/trend?tahun=YYYY
router.get('/trend', async (req, res) => {
  try {
    const today = new Date();
    const tahun = req.query.tahun || today.getFullYear().toString();

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    // Ambil semua transaksi tahun tersebut
    const rows = await db.allAsync(`
      SELECT periode_bulan_tahun, SUM(total_terbayar) as realisasi, SUM(harga_sewa_periode) as potensi
      FROM tbl_transaksi_pembayaran
      WHERE periode_bulan_tahun LIKE ?
      GROUP BY periode_bulan_tahun
      ORDER BY periode_bulan_tahun ASC
    `, [`${tahun}-%`]);

    const trendMap = {};
    rows.forEach(r => {
      trendMap[r.periode_bulan_tahun] = {
        realisasi: r.realisasi || 0,
        potensi: r.potensi || 0
      };
    });

    const trendData = [];
    for (let m = 1; m <= 12; m++) {
      const monthStr = m.toString().padStart(2, '0');
      const periode = `${tahun}-${monthStr}`;
      const item = trendMap[periode] || { realisasi: 0, potensi: 0 };
      const gap = Math.max(0, item.potensi - item.realisasi);

      trendData.push({
        periode,
        bulanSingkat: monthNames[m - 1].slice(0, 3),
        bulanLengkap: monthNames[m - 1],
        potensi: item.potensi,
        realisasi: item.realisasi,
        gap
      });
    }

    res.json({ tahun, data: trendData });
  } catch (err) {
    console.error('Error trend:', err);
    res.status(500).json({ error: 'Gagal mengambil data tren pendapatan' });
  }
});

// GET /api/dashboard/risk-distribution?periode=YYYY-MM
router.get('/risk-distribution', async (req, res) => {
  try {
    const today = new Date();
    const defaultPeriode = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const periode = req.query.periode || defaultPeriode;

    const rows = await db.allAsync(`
      SELECT t.*, k.nama_kontrakan, p.nama_penyewa
      FROM tbl_transaksi_pembayaran t
      LEFT JOIN tbl_kontrakan k ON t.kode_kontrakan = k.kode_kontrakan
      LEFT JOIN tbl_penyewa p ON t.id_penyewa = p.id_penyewa
      WHERE t.periode_bulan_tahun = ?
    `, [periode]);

    let low = 0;
    let medium = 0;
    let high = 0;

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
      if (risk.kategori === 'Low') low++;
      else if (risk.kategori === 'Medium') medium++;
      else if (risk.kategori === 'High') high++;
    });

    const total = low + medium + high;

    res.json({
      periode,
      total,
      distribution: [
        { name: 'Low Risk', count: low, percentage: total > 0 ? Math.round((low / total) * 100) : 0, color: '#10B981' },
        { name: 'Medium Risk', count: medium, percentage: total > 0 ? Math.round((medium / total) * 100) : 0, color: '#F59E0B' },
        { name: 'High Risk', count: high, percentage: total > 0 ? Math.round((high / total) * 100) : 0, color: '#EF4444' }
      ]
    });
  } catch (err) {
    console.error('Error risk distribution:', err);
    res.status(500).json({ error: 'Gagal mengambil distribusi risiko' });
  }
});

// GET /api/dashboard/early-warning?periode=YYYY-MM
router.get('/early-warning', async (req, res) => {
  try {
    const today = new Date();
    const defaultPeriode = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const periode = req.query.periode || defaultPeriode;

    const rows = await db.allAsync(`
      SELECT t.*, k.nama_kontrakan, p.nama_penyewa, p.no_hp, p.asal_ktp
      FROM tbl_transaksi_pembayaran t
      JOIN tbl_kontrakan k ON t.kode_kontrakan = k.kode_kontrakan
      JOIN tbl_penyewa p ON t.id_penyewa = p.id_penyewa
      WHERE t.periode_bulan_tahun = ?
    `, [periode]);

    const warnings = [];

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

      // Masukkan kategori High dan Medium ke Early Warning System
      if (risk.kategori === 'High' || risk.kategori === 'Medium') {
        warnings.push({
          id_transaksi: t.id_transaksi,
          kode_kontrakan: t.kode_kontrakan,
          nama_kontrakan: t.nama_kontrakan,
          id_penyewa: t.id_penyewa,
          nama_penyewa: t.nama_penyewa,
          no_hp: t.no_hp,
          asal_ktp: t.asal_ktp,
          periode: t.periode_bulan_tahun,
          status_pembayaran: t.status_pembayaran,
          harga_sewa_periode: t.harga_sewa_periode,
          total_terbayar: t.total_terbayar,
          sisa_tagihan: Math.max(0, t.harga_sewa_periode - t.total_terbayar),
          tgl_lunas: t.tgl_lunas,
          riskScore: risk.score,
          kategori: risk.kategori,
          badgeColor: risk.badgeColor,
          rekomendasi: risk.rekomendasi,
          breakdown: risk.breakdown,
          catatan: t.catatan
        });
      }
    });

    // Urutkan dari skor tertinggi ke terendah
    warnings.sort((a, b) => b.riskScore - a.riskScore);

    res.json({
      periode,
      totalWarning: warnings.length,
      warnings
    });
  } catch (err) {
    console.error('Error early warning:', err);
    res.status(500).json({ error: 'Gagal mengambil data early warning' });
  }
});

module.exports = router;

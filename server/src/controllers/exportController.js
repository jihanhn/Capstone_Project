const { db } = require('../database/db');
const { computeRiskScore } = require('../services/riskEngine');

const exportCsv = async (req, res) => {
  try {
    const { periode, tahun, basis, type } = req.query;

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    // JIKA BASIS KAS (ARUS KAS MASUK / MUTASI REKENING BANK)
    if (basis === 'kas' || type === 'kas' || type === 'arus-kas') {
      let sql = `
        SELECT 
          r.id_pembayaran,
          r.id_transaksi,
          r.nominal_bayar,
          r.tanggal_bayar,
          r.metode_pembayaran,
          r.catatan as catatan_bayar,
          t.periode_bulan_tahun as untuk_periode_tagihan,
          t.kode_kontrakan,
          k.nama_kontrakan,
          p.id_penyewa,
          p.nama_penyewa,
          p.no_hp
        FROM tbl_riwayat_pembayaran r
        JOIN tbl_transaksi_pembayaran t ON r.id_transaksi = t.id_transaksi
        JOIN tbl_kontrakan k ON t.kode_kontrakan = k.kode_kontrakan
        JOIN tbl_penyewa p ON t.id_penyewa = p.id_penyewa
        WHERE 1=1
      `;
      const params = [];
      if (periode) {
        sql += " AND (TO_CHAR(r.tanggal_bayar, 'YYYY-MM') = ? OR r.tanggal_bayar::TEXT LIKE ?)";
        params.push(periode, `${periode}%`);
      } else if (tahun) {
        sql += " AND (TO_CHAR(r.tanggal_bayar, 'YYYY') = ? OR r.tanggal_bayar::TEXT LIKE ?)";
        params.push(tahun, `${tahun}%`);
      }
      sql += " ORDER BY r.tanggal_bayar DESC, r.id_pembayaran DESC";

      const rows = await db.allAsync(sql, params);

      const headers = [
        'ID Pembayaran',
        'Tanggal Uang Masuk',
        'Nominal Masuk (Rp)',
        'Metode Pembayaran / Rekening',
        'Kode Unit',
        'Nama Kontrakan',
        'ID Penyewa',
        'Nama Penyewa',
        'Untuk Tagihan Periode',
        'Keterangan / Catatan'
      ];

      const csvLines = [headers.join(',')];
      rows.forEach(r => {
        csvLines.push([
          r.id_pembayaran,
          escapeCsv(r.tanggal_bayar),
          r.nominal_bayar,
          escapeCsv(r.metode_pembayaran || 'Transfer Bank'),
          escapeCsv(r.kode_kontrakan),
          escapeCsv(r.nama_kontrakan),
          escapeCsv(r.id_penyewa),
          escapeCsv(r.nama_penyewa),
          escapeCsv(r.untuk_periode_tagihan),
          escapeCsv(r.catatan_bayar || '-')
        ].join(','));
      });

      const csvContent = csvLines.join('\r\n');
      const filename = `Laporan_Mutasi_Arus_Kas_${periode || tahun || 'Semua'}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send('\uFEFF' + csvContent);
    }

    // JIKA BASIS AKRUAL (REKAPITULASI TAGIHAN SEWA & PIUTANG)
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
      'Metode Pembayaran',
      'Tanggal Lunas',
      'Risk Score',
      'Kategori Risiko',
      'Rekomendasi Tindakan',
      'Catatan'
    ];


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
        escapeCsv(t.metode_pembayaran || 'Transfer Bank'),
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
    res.send('\uFEFF' + csvContent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  exportCsv
};

const { db } = require('../database/db');
const { computeRiskScore } = require('../services/riskEngine');

const getAllTransaksi = async (req, res) => {
  try {
    const { periode, kode_kontrakan, status_pembayaran, id_penyewa } = req.query;

    let sql = `
      SELECT t.*, k.nama_kontrakan, p.nama_penyewa, p.no_hp, p.asal_ktp, p.tgl_mulai_sewa
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
    if (id_penyewa) {
      sql += ' AND t.id_penyewa = ?';
      params.push(id_penyewa);
    }

    sql += ' ORDER BY t.periode_bulan_tahun DESC, t.kode_kontrakan ASC';

    const rows = await db.allAsync(sql, params);

    // Ambil seluruh riwayat transaksi / pembayaran untuk tagihan-tagihan ini
    const allRiwayat = await db.allAsync(`
      SELECT id_pembayaran, id_transaksi, nominal_bayar, tanggal_bayar, catatan, created_at
      FROM tbl_riwayat_pembayaran
      ORDER BY tanggal_bayar ASC, id_pembayaran ASC
    `);

    const riwayatByTrx = {};
    allRiwayat.forEach(r => {
      if (!riwayatByTrx[r.id_transaksi]) riwayatByTrx[r.id_transaksi] = [];
      riwayatByTrx[r.id_transaksi].push({
        id_pembayaran: r.id_pembayaran,
        id_tagihan: r.id_transaksi,
        id_transaksi: r.id_transaksi,
        nominal_bayar: parseFloat(r.nominal_bayar) || 0,
        tanggal_bayar: r.tanggal_bayar,
        catatan: r.catatan,
        created_at: r.created_at
      });
    });

    const enriched = rows.map(t => {
      const riwayat_transaksi = riwayatByTrx[t.id_transaksi] || [];
      // Nilai Total Terbayar didapat dari fungsi reduce() dari nominal_bayar di riwayat_transaksi
      const total_terbayar = riwayat_transaksi.reduce((sum, r) => sum + r.nominal_bayar, 0);
      const harga_sewa = parseFloat(t.harga_sewa_periode) || 0;
      // Rumus Sisa Tunggakan = Tarif Sewa - Total Terbayar
      const sisa_tagihan = Math.max(0, harga_sewa - total_terbayar);
      // Status Pembayaran: JIKA Total Terbayar >= Tarif Sewa -> 'Lunas', JIKA kurang -> 'Belum Lunas'
      const isLunas = total_terbayar >= harga_sewa;
      const computedStatus = isLunas ? 'Lunas' : 'Belum Lunas';

      // Tanggal bayar terakhir
      const lastPayment = riwayat_transaksi.length > 0
        ? [...riwayat_transaksi].sort((a, b) => new Date(b.tanggal_bayar) - new Date(a.tanggal_bayar))[0].tanggal_bayar
        : t.tgl_lunas;

      // Strict Rule: Jatuh tempo statis dari tgl_mulai_sewa penyewa
      const risk = computeRiskScore({
        periode: t.periode_bulan_tahun,
        tglLunas: isLunas ? lastPayment : null,
        tglMulaiSewa: t.tgl_mulai_sewa,
        statusPembayaran: computedStatus,
        totalTerbayar: total_terbayar,
        hargaSewa: harga_sewa
      });

      return {
        ...t,
        id_tagihan: t.id_transaksi,
        total_terbayar,
        sisa_tagihan,
        status_pembayaran: computedStatus,
        tgl_lunas: isLunas ? lastPayment : null,
        tgl_bayar_terakhir: lastPayment,
        riwayat_transaksi,
        riskScore: risk.score,
        kategoriRisiko: risk.kategori,
        badgeColor: risk.badgeColor,
        rekomendasi: risk.rekomendasi,
        breakdown: risk.breakdown
      };
    });

    const filtered = status_pembayaran
      ? enriched.filter(t => t.status_pembayaran.toLowerCase() === status_pembayaran.toLowerCase())
      : enriched;

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createTransaksi = async (req, res) => {
  try {
    const {
      id_tagihan,
      nominal_bayar,
      tanggal_bayar = new Date().toISOString().split('T')[0],
      catatan,
      kode_kontrakan,
      id_penyewa,
      periode_bulan_tahun
    } = req.body;

    const nominal = parseFloat(nominal_bayar);
    if (!nominal || nominal <= 0) {
      return res.status(400).json({ error: 'Nominal pembayaran harus lebih besar dari 0' });
    }

    let targetIdTransaksi = id_tagihan ? parseInt(id_tagihan, 10) : null;
    let invoice = null;

    if (targetIdTransaksi) {
      invoice = await db.getAsync(`
        SELECT t.*, p.nama_penyewa
        FROM tbl_transaksi_pembayaran t
        JOIN tbl_penyewa p ON t.id_penyewa = p.id_penyewa
        WHERE t.id_transaksi = ?
      `, [targetIdTransaksi]);

      if (!invoice) {
        return res.status(404).json({ error: 'Tagihan tidak ditemukan' });
      }
    } else {
      if (!kode_kontrakan || !id_penyewa || !periode_bulan_tahun) {
        return res.status(400).json({ error: 'Pilih tagihan atau lengkapi penyewa, unit, dan periode' });
      }

      // Validasi unit penyewa
      const penyewa = await db.getAsync('SELECT kode_kontrakan, nama_penyewa FROM tbl_penyewa WHERE id_penyewa = ?', [id_penyewa]);
      if (!penyewa) {
        return res.status(404).json({ error: 'Data penyewa tidak ditemukan' });
      }
      if (penyewa.kode_kontrakan && penyewa.kode_kontrakan !== kode_kontrakan) {
        return res.status(400).json({
          error: `Penyewa ${penyewa.nama_penyewa} hanya dapat membayar unit yang ditempatinya (${penyewa.kode_kontrakan})`
        });
      }

      // Cek apakah tagihan untuk unit & periode ini sudah ada
      const existing = await db.getAsync(
        'SELECT * FROM tbl_transaksi_pembayaran WHERE kode_kontrakan = ? AND periode_bulan_tahun = ?',
        [kode_kontrakan, periode_bulan_tahun]
      );

      if (existing) {
        targetIdTransaksi = existing.id_transaksi;
        invoice = existing;
      } else {
        const unit = await db.getAsync('SELECT harga_saat_ini FROM tbl_kontrakan WHERE kode_kontrakan = ?', [kode_kontrakan]);
        if (!unit) {
          return res.status(404).json({ error: 'Unit kontrakan tidak ditemukan' });
        }

        const harga_sewa = parseFloat(unit.harga_saat_ini) || 0;
        const insertTrx = await db.runAsync(`
          INSERT INTO tbl_transaksi_pembayaran
          (kode_kontrakan, id_penyewa, periode_bulan_tahun, status_pembayaran, total_terbayar, harga_sewa_periode, catatan)
          VALUES (?, ?, ?, 'Belum Lunas', 0, ?, ?)
          RETURNING id_transaksi
        `, [kode_kontrakan, id_penyewa, periode_bulan_tahun, harga_sewa, catatan || null]);

        targetIdTransaksi = insertTrx.rows ? insertTrx.rows[0]?.id_transaksi : insertTrx.lastID;
        invoice = {
          id_transaksi: targetIdTransaksi,
          harga_sewa_periode: harga_sewa
        };
      }
    }

    const cleanTglBayar = tanggal_bayar && String(tanggal_bayar).trim() !== ''
      ? tanggal_bayar
      : new Date().toISOString().split('T')[0];

    // Simpan data pembayaran ke tbl_riwayat_pembayaran (One-to-Many)
    await db.runAsync(`
      INSERT INTO tbl_riwayat_pembayaran (id_transaksi, nominal_bayar, tanggal_bayar, catatan)
      VALUES (?, ?, ?, ?)
    `, [targetIdTransaksi, nominal, cleanTglBayar, catatan || 'Cicilan pembayaran']);

    // Hitung ulang total terbayar menggunakan SUM riwayat_transaksi
    const sumRow = await db.getAsync(`
      SELECT COALESCE(SUM(nominal_bayar), 0) as total,
             MAX(tanggal_bayar) as latest_tgl
      FROM tbl_riwayat_pembayaran
      WHERE id_transaksi = ?
    `, [targetIdTransaksi]);

    const totalTerbayar = parseFloat(sumRow?.total) || 0;
    const hargaSewa = parseFloat(invoice.harga_sewa_periode) || 0;
    const isLunas = totalTerbayar >= hargaSewa;
    const statusPembayaran = isLunas ? 'Lunas' : 'Belum Lunas';
    const tglLunas = isLunas ? (sumRow?.latest_tgl || cleanTglBayar) : null;

    await db.runAsync(`
      UPDATE tbl_transaksi_pembayaran
      SET total_terbayar = ?, status_pembayaran = ?, tgl_lunas = ?
      WHERE id_transaksi = ?
    `, [totalTerbayar, statusPembayaran, tglLunas, targetIdTransaksi]);

    res.status(201).json({
      message: `Pembayaran sebesar Rp ${nominal.toLocaleString('id-ID')} berhasil dicatat!`,
      id_transaksi: targetIdTransaksi,
      id_tagihan: targetIdTransaksi,
      total_terbayar: totalTerbayar,
      status_pembayaran: statusPembayaran
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deletePembayaran = async (req, res) => {
  try {
    const { idPembayaran } = req.params;
    const payment = await db.getAsync('SELECT * FROM tbl_riwayat_pembayaran WHERE id_pembayaran = ?', [idPembayaran]);
    if (!payment) {
      return res.status(404).json({ error: 'Data pembayaran tidak ditemukan' });
    }

    await db.runAsync('DELETE FROM tbl_riwayat_pembayaran WHERE id_pembayaran = ?', [idPembayaran]);

    const sumRow = await db.getAsync(`
      SELECT COALESCE(SUM(nominal_bayar), 0) as total,
             MAX(tanggal_bayar) as latest_tgl
      FROM tbl_riwayat_pembayaran
      WHERE id_transaksi = ?
    `, [payment.id_transaksi]);

    const invoice = await db.getAsync('SELECT harga_sewa_periode FROM tbl_transaksi_pembayaran WHERE id_transaksi = ?', [payment.id_transaksi]);
    const totalTerbayar = parseFloat(sumRow?.total) || 0;
    const hargaSewa = parseFloat(invoice?.harga_sewa_periode) || 0;
    const isLunas = totalTerbayar >= hargaSewa;
    const statusPembayaran = isLunas ? 'Lunas' : 'Belum Lunas';
    const tglLunas = isLunas ? sumRow?.latest_tgl : null;

    await db.runAsync(`
      UPDATE tbl_transaksi_pembayaran
      SET total_terbayar = ?, status_pembayaran = ?, tgl_lunas = ?
      WHERE id_transaksi = ?
    `, [totalTerbayar, statusPembayaran, tglLunas, payment.id_transaksi]);

    res.json({ message: 'Riwayat pembayaran berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateTransaksi = async (req, res) => {
  try {
    const { id } = req.params;
    const { catatan } = req.body;
    await db.runAsync(`
      UPDATE tbl_transaksi_pembayaran
      SET catatan = ?
      WHERE id_transaksi = ?
    `, [catatan || null, id]);
    res.json({ message: 'Catatan tagihan berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteTransaksi = async (req, res) => {
  try {
    const { id } = req.params;
    await db.runAsync('DELETE FROM tbl_transaksi_pembayaran WHERE id_transaksi = ?', [id]);
    res.json({ message: 'Tagihan dan seluruh riwayat pembayarannya berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllTransaksi,
  createTransaksi,
  updateTransaksi,
  deleteTransaksi,
  deletePembayaran
};

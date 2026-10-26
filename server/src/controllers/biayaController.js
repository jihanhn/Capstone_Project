const { db } = require('../database/db');

const getAllBiaya = async (req, res) => {
  try {
    const { tahun, bulan, periode, kategori, kode_kontrakan, status_pengerjaan } = req.query;

    let sql = `
      SELECT p.*, k.nama_kontrakan, k.status_unit as status_unit_kontrakan
      FROM tbl_pengeluaran_maintenance p
      LEFT JOIN tbl_kontrakan k ON p.kode_kontrakan = k.kode_kontrakan
      WHERE 1=1
    `;
    const params = [];

    if (tahun) {
      sql += ' AND p.tahun = ?';
      params.push(tahun);
    }
    if (bulan) {
      sql += " AND TO_CHAR(p.tanggal_pengeluaran, 'MM') = ?";
      params.push(String(bulan).padStart(2, '0'));
    }
    if (periode) {
      sql += " AND TO_CHAR(p.tanggal_pengeluaran, 'YYYY-MM') = ?";
      params.push(periode);
    }
    if (kategori) {
      sql += ' AND p.kategori = ?';
      params.push(kategori);
    }
    if (kode_kontrakan) {
      sql += ' AND p.kode_kontrakan = ?';
      params.push(kode_kontrakan);
    }
    if (status_pengerjaan) {
      sql += ' AND p.status_pengerjaan = ?';
      params.push(status_pengerjaan);
    }

    sql += ' ORDER BY p.tanggal_pengeluaran DESC, p.id_pengeluaran DESC';

    const rows = await db.allAsync(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createBiaya = async (req, res) => {
  try {
    const {
      kode_kontrakan,
      tanggal_pengeluaran,
      kategori,
      deskripsi,
      biaya,
      sumber_dana,
      keterangan,
      status_pengerjaan
    } = req.body;

    if (!tanggal_pengeluaran || !kategori || !deskripsi || biaya === undefined) {
      return res.status(400).json({ error: 'Tanggal, kategori, deskripsi, dan biaya wajib diisi' });
    }

    const tahun = new Date(tanggal_pengeluaran).getFullYear();
    const finalStatus = status_pengerjaan && ['Sedang Dikerjakan', 'Selesai'].includes(status_pengerjaan)
      ? status_pengerjaan
      : (kategori === 'Perbaikan Gedung/Fasilitas' ? 'Sedang Dikerjakan' : 'Selesai');
    
    const tglSelesai = finalStatus === 'Selesai' ? tanggal_pengeluaran : null;

    const result = await db.runAsync(`
      INSERT INTO tbl_pengeluaran_maintenance 
      (kode_kontrakan, tanggal_pengeluaran, tahun, kategori, deskripsi, biaya, sumber_dana, keterangan, status_pengerjaan, tanggal_selesai)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      kode_kontrakan || null,
      tanggal_pengeluaran,
      tahun,
      kategori,
      deskripsi,
      Number(biaya),
      sumber_dana || null,
      keterangan || null,
      finalStatus,
      tglSelesai
    ]);

    // INTEGRASI DENGAN STATUS UNIT:
    // Jika ada unit terkait dan status 'Sedang Dikerjakan':
    if (kode_kontrakan && finalStatus === 'Sedang Dikerjakan') {
      const unit = await db.getAsync('SELECT * FROM tbl_kontrakan WHERE kode_kontrakan = ?', [kode_kontrakan]);
      if (unit && unit.status_unit === 'Kosong') {
        // Otomatis ubah status unit menjadi Dalam Perbaikan (bebas dari Vacancy Loss EWS)
        await db.runAsync(
          'UPDATE tbl_kontrakan SET status_unit = \'Dalam Perbaikan\', tgl_kosong_sejak = NULL WHERE kode_kontrakan = ?',
          [kode_kontrakan]
        );
      }
    }

    res.status(201).json({
      message: 'Pengeluaran berhasil dicatat',
      id_pengeluaran: result.lastID || null,
      status_pengerjaan: finalStatus
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateStatusPengerjaan = async (req, res) => {
  try {
    const { id } = req.params;
    const { status_pengerjaan } = req.body;

    if (!['Sedang Dikerjakan', 'Selesai'].includes(status_pengerjaan)) {
      return res.status(400).json({ error: 'Status pengerjaan harus "Sedang Dikerjakan" atau "Selesai"' });
    }

    const current = await db.getAsync('SELECT * FROM tbl_pengeluaran_maintenance WHERE id_pengeluaran = ?', [id]);
    if (!current) {
      return res.status(404).json({ error: 'Catatan pengeluaran tidak ditemukan' });
    }

    const tglSelesai = status_pengerjaan === 'Selesai' ? new Date().toISOString().split('T')[0] : null;

    await db.runAsync(`
      UPDATE tbl_pengeluaran_maintenance 
      SET status_pengerjaan = ?, tanggal_selesai = ?
      WHERE id_pengeluaran = ?
    `, [status_pengerjaan, tglSelesai, id]);

    // INTEGRASI SINKRONISASI STATUS UNIT KONTRAKAN:
    if (current.kode_kontrakan) {
      const kode = current.kode_kontrakan;

      if (status_pengerjaan === 'Sedang Dikerjakan') {
        // Jika pekerjaan kembali dikerjakan: pastikan unit tidak berstatus Kosong (bebas Vacancy Loss)
        const unit = await db.getAsync('SELECT * FROM tbl_kontrakan WHERE kode_kontrakan = ?', [kode]);
        if (unit && unit.status_unit === 'Kosong') {
          await db.runAsync(
            'UPDATE tbl_kontrakan SET status_unit = \'Dalam Perbaikan\', tgl_kosong_sejak = NULL WHERE kode_kontrakan = ?',
            [kode]
          );
        }
      } else if (status_pengerjaan === 'Selesai') {
        // Cek apakah masih ada pekerjaan pemeliharaan lain yang 'Sedang Dikerjakan' di unit ini
        const otherActive = await db.getAsync(`
          SELECT id_pengeluaran FROM tbl_pengeluaran_maintenance 
          WHERE kode_kontrakan = ? AND id_pengeluaran != ? AND status_pengerjaan = 'Sedang Dikerjakan'
          LIMIT 1
        `, [kode, id]);

        if (!otherActive) {
          // Tidak ada pekerjaan aktif lagi: sinkronkan status unit sesuai ada/tidaknya penyewa
          const activeTenant = await db.getAsync(`
            SELECT id_penyewa FROM tbl_penyewa 
            WHERE kode_kontrakan = ? AND status_sewa = 'Aktif' 
              AND (tgl_keluar_aktual IS NULL OR tgl_keluar_aktual > CURRENT_DATE)
            LIMIT 1
          `, [kode]);

          if (activeTenant) {
            await db.runAsync(
              'UPDATE tbl_kontrakan SET status_unit = \'Terisi\', tgl_kosong_sejak = NULL WHERE kode_kontrakan = ?',
              [kode]
            );
          } else {
            // Kamar siap huni kembali, mulai dipantau EWS Vacancy Loss sejak hari ini
            await db.runAsync(
              'UPDATE tbl_kontrakan SET status_unit = \'Kosong\', tgl_kosong_sejak = CURRENT_DATE WHERE kode_kontrakan = ?',
              [kode]
            );
          }
        }
      }
    }

    res.json({
      message: `Status pengerjaan berhasil diperbarui menjadi ${status_pengerjaan}`,
      status_pengerjaan,
      tanggal_selesai: tglSelesai
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteBiaya = async (req, res) => {
  try {
    const { id } = req.params;
    const current = await db.getAsync('SELECT * FROM tbl_pengeluaran_maintenance WHERE id_pengeluaran = ?', [id]);

    await db.runAsync('DELETE FROM tbl_pengeluaran_maintenance WHERE id_pengeluaran = ?', [id]);

    // Jika item yang dihapus berstatus 'Sedang Dikerjakan', evaluasi apakah unit perlu dinormalkan
    if (current && current.kode_kontrakan && current.status_pengerjaan === 'Sedang Dikerjakan') {
      const kode = current.kode_kontrakan;
      const otherActive = await db.getAsync(`
        SELECT id_pengeluaran FROM tbl_pengeluaran_maintenance 
        WHERE kode_kontrakan = ? AND status_pengerjaan = 'Sedang Dikerjakan'
        LIMIT 1
      `, [kode]);

      if (!otherActive) {
        const activeTenant = await db.getAsync(`
          SELECT id_penyewa FROM tbl_penyewa 
          WHERE kode_kontrakan = ? AND status_sewa = 'Aktif' 
            AND (tgl_keluar_aktual IS NULL OR tgl_keluar_aktual > CURRENT_DATE)
          LIMIT 1
        `, [kode]);

        if (activeTenant) {
          await db.runAsync(
            'UPDATE tbl_kontrakan SET status_unit = \'Terisi\', tgl_kosong_sejak = NULL WHERE kode_kontrakan = ?',
            [kode]
          );
        } else {
          await db.runAsync(
            'UPDATE tbl_kontrakan SET status_unit = \'Kosong\', tgl_kosong_sejak = CURRENT_DATE WHERE kode_kontrakan = ?',
            [kode]
          );
        }
      }
    }

    res.json({ message: 'Data pengeluaran berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllBiaya,
  createBiaya,
  updateStatusPengerjaan,
  deleteBiaya
};

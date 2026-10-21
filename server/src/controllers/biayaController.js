const { db } = require('../database/db');

const getAllBiaya = async (req, res) => {
  try {
    const { tahun, kategori, kode_kontrakan } = req.query;

    let sql = `
      SELECT p.*, k.nama_kontrakan 
      FROM tbl_pengeluaran_maintenance p
      LEFT JOIN tbl_kontrakan k ON p.kode_kontrakan = k.kode_kontrakan
      WHERE 1=1
    `;
    const params = [];

    if (tahun) {
      sql += ' AND p.tahun = ?';
      params.push(tahun);
    }
    if (kategori) {
      sql += ' AND p.kategori = ?';
      params.push(kategori);
    }
    if (kode_kontrakan) {
      sql += ' AND p.kode_kontrakan = ?';
      params.push(kode_kontrakan);
    }

    sql += ' ORDER BY p.tanggal_pengeluaran DESC';

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
      keterangan
    } = req.body;

    if (!tanggal_pengeluaran || !kategori || !deskripsi || biaya === undefined) {
      return res.status(400).json({ error: 'Tanggal, kategori, deskripsi, dan biaya wajib diisi' });
    }

    const tahun = new Date(tanggal_pengeluaran).getFullYear();

    const result = await db.runAsync(`
      INSERT INTO tbl_pengeluaran_maintenance 
      (kode_kontrakan, tanggal_pengeluaran, tahun, kategori, deskripsi, biaya, sumber_dana, keterangan)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      kode_kontrakan || null,
      tanggal_pengeluaran,
      tahun,
      kategori,
      deskripsi,
      Number(biaya),
      sumber_dana || null,
      keterangan || null
    ]);

    res.status(201).json({
      message: 'Pengeluaran berhasil dicatat',
      id_pengeluaran: result.lastID || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteBiaya = async (req, res) => {
  try {
    const { id } = req.params;
    await db.runAsync('DELETE FROM tbl_pengeluaran_maintenance WHERE id_pengeluaran = ?', [id]);
    res.json({ message: 'Data pengeluaran berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllBiaya,
  createBiaya,
  deleteBiaya
};

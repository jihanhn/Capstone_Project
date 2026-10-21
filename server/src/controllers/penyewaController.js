const { db } = require('../database/db');

const getAllPenyewa = async (req, res) => {
  try {
    const penyewa = await db.allAsync(`
      SELECT p.*,
        p.kode_kontrakan as kode_unit_sekarang,
        CASE 
          WHEN p.tgl_selesai_sewa IS NOT NULL AND p.tgl_selesai_sewa < CURRENT_DATE THEN 'Tidak Aktif'
          ELSE 'Aktif'
        END as status_berjalan
      FROM tbl_penyewa p
      ORDER BY p.id_penyewa ASC
    `);
    res.json(penyewa);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createPenyewa = async (req, res) => {
  try {
    const { id_penyewa, nama_penyewa, no_hp, asal_ktp, tgl_mulai_sewa, tgl_selesai_sewa, kode_kontrakan } = req.body;
    if (!id_penyewa || !nama_penyewa || !no_hp || !tgl_mulai_sewa) {
      return res.status(400).json({ error: 'ID, nama, no HP, dan tanggal mulai sewa wajib diisi' });
    }

    const cleanTglSelesai = tgl_selesai_sewa && String(tgl_selesai_sewa).trim() !== '' ? tgl_selesai_sewa : null;
    const cleanKodeUnit = kode_kontrakan && String(kode_kontrakan).trim() !== '' ? kode_kontrakan : null;

    await db.runAsync(
      'INSERT INTO tbl_penyewa (id_penyewa, nama_penyewa, no_hp, asal_ktp, tgl_mulai_sewa, tgl_selesai_sewa, kode_kontrakan) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id_penyewa.toUpperCase().trim(), nama_penyewa.trim(), no_hp.trim(), asal_ktp ? asal_ktp.trim() : null, tgl_mulai_sewa, cleanTglSelesai, cleanKodeUnit]
    );

    res.status(201).json({ message: 'Penyewa berhasil ditambahkan' });
  } catch (err) {
    if (err.message.includes('UNIQUE') || err.message.includes('duplicate')) {
      return res.status(400).json({ error: 'ID Penyewa sudah terdaftar, gunakan ID lain' });
    }
    res.status(500).json({ error: err.message });
  }
};

const updatePenyewa = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_penyewa, no_hp, asal_ktp, tgl_mulai_sewa, tgl_selesai_sewa, kode_kontrakan } = req.body;

    const cleanTglSelesai = tgl_selesai_sewa && String(tgl_selesai_sewa).trim() !== '' ? tgl_selesai_sewa : null;
    const cleanAsalKtp = asal_ktp && String(asal_ktp).trim() !== '' ? asal_ktp.trim() : null;
    let cleanKodeUnit = kode_kontrakan && String(kode_kontrakan).trim() !== '' ? kode_kontrakan : null;

    if (cleanTglSelesai) {
      const tglSelesaiDate = new Date(cleanTglSelesai);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (tglSelesaiDate < today) {
        cleanKodeUnit = null;
      }
    }

    await db.runAsync(
      'UPDATE tbl_penyewa SET nama_penyewa = ?, no_hp = ?, asal_ktp = ?, tgl_mulai_sewa = ?, tgl_selesai_sewa = ?, kode_kontrakan = ? WHERE id_penyewa = ?',
      [
        nama_penyewa ? String(nama_penyewa).trim() : '',
        no_hp ? String(no_hp).trim() : '',
        cleanAsalKtp,
        tgl_mulai_sewa,
        cleanTglSelesai,
        cleanKodeUnit,
        id
      ]
    );

    res.json({ message: 'Data penyewa berhasil diperbarui dan disinkronkan' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deletePenyewa = async (req, res) => {
  try {
    const { id } = req.params;
    await db.runAsync('DELETE FROM tbl_penyewa WHERE id_penyewa = ?', [id]);
    res.json({ message: 'Data penyewa berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllPenyewa,
  createPenyewa,
  updatePenyewa,
  deletePenyewa
};

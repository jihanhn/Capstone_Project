const { db } = require('../database/db');

const getAllPenyewa = async (req, res) => {
  try {
    const penyewa = await db.allAsync(`
      SELECT p.*,
        p.kode_kontrakan as kode_unit_sekarang,
        k.nama_kontrakan,
        k.harga_saat_ini as harga_sewa_bulan,
        CASE 
          WHEN p.status_sewa = 'Tidak Aktif' THEN 'Tidak Aktif'
          WHEN p.tgl_keluar_aktual IS NOT NULL AND p.tgl_keluar_aktual <= CURRENT_DATE THEN 'Tidak Aktif'
          WHEN p.tgl_selesai_sewa IS NOT NULL AND p.tgl_selesai_sewa < CURRENT_DATE THEN 'Tidak Aktif'
          WHEN p.kode_kontrakan IS NULL AND p.status_sewa != 'Aktif' THEN 'Tidak Aktif'
          ELSE 'Aktif'
        END as status_berjalan
      FROM tbl_penyewa p
      LEFT JOIN tbl_kontrakan k ON p.kode_kontrakan = k.kode_kontrakan
      ORDER BY p.id_penyewa ASC
    `);
    res.json(penyewa);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Helper untuk auto-generate ID Penyewa berurutan dengan format standar P001, P002, dst.
const getNextPenyewaId = async () => {
  const rows = await db.allAsync('SELECT id_penyewa FROM tbl_penyewa');
  let maxNum = 0;
  for (const r of rows) {
    if (!r.id_penyewa) continue;
    // Cek pattern P001, P016, PYW-001, atau angka berapapun
    const match = r.id_penyewa.match(/^P(?:YW-?)?(\d+)$/i) || r.id_penyewa.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  let nextNum = maxNum + 1;
  let candidateId = `P${String(nextNum).padStart(3, '0')}`;

  const existingIds = new Set(rows.map(r => (r.id_penyewa ? String(r.id_penyewa).toUpperCase().trim() : '')));
  while (existingIds.has(candidateId.toUpperCase())) {
    nextNum++;
    candidateId = `P${String(nextNum).padStart(3, '0')}`;
  }

  return candidateId;
};

const getNextId = async (req, res) => {
  try {
    const nextId = await getNextPenyewaId();
    res.json({ nextId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createPenyewa = async (req, res) => {
  try {
    let { id_penyewa, nama_penyewa, no_hp, asal_ktp, tgl_mulai_sewa, tgl_selesai_sewa, kode_kontrakan } = req.body;
    if (!nama_penyewa || !no_hp || !tgl_mulai_sewa) {
      return res.status(400).json({ error: 'Nama, no HP, dan tanggal mulai sewa wajib diisi' });
    }

    // Auto-generate ID standar jika tidak diisi, kosong, atau placeholder
    if (
      !id_penyewa || 
      String(id_penyewa).trim() === '' || 
      String(id_penyewa).trim().toUpperCase() === 'AUTO' ||
      String(id_penyewa).trim().toUpperCase().startsWith('MEMUAT')
    ) {
      id_penyewa = await getNextPenyewaId();
    } else {
      id_penyewa = id_penyewa.toUpperCase().trim();
    }

    const cleanTglSelesai = tgl_selesai_sewa && String(tgl_selesai_sewa).trim() !== '' ? tgl_selesai_sewa : null;
    const cleanKodeUnit = kode_kontrakan && String(kode_kontrakan).trim() !== '' ? kode_kontrakan : null;

    await db.runAsync(
      'INSERT INTO tbl_penyewa (id_penyewa, nama_penyewa, no_hp, asal_ktp, tgl_mulai_sewa, tgl_selesai_sewa, kode_kontrakan, status_sewa, tgl_keluar_aktual) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id_penyewa, nama_penyewa.trim(), no_hp.trim(), asal_ktp ? asal_ktp.trim() : null, tgl_mulai_sewa, cleanTglSelesai, cleanKodeUnit, 'Aktif', null]
    );

    // SINKRONISASI KE TBL_KONTRAKAN:
    if (cleanKodeUnit) {
      await db.runAsync(`
        UPDATE tbl_kontrakan 
        SET status_unit = CASE WHEN status_unit = 'Dalam Perbaikan' THEN 'Dalam Perbaikan' ELSE 'Terisi' END,
            tgl_kosong_sejak = NULL
        WHERE kode_kontrakan = ?
      `, [cleanKodeUnit]);
    }

    res.status(201).json({ message: 'Penyewa berhasil ditambahkan', id_penyewa });
  } catch (err) {
    if (err.message.includes('UNIQUE') || err.message.includes('duplicate')) {
      return res.status(400).json({ error: 'ID Penyewa sudah terdaftar, silakan coba lagi' });
    }
    res.status(500).json({ error: err.message });
  }
};

const updatePenyewa = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_penyewa, no_hp, asal_ktp, tgl_mulai_sewa, tgl_selesai_sewa, kode_kontrakan } = req.body;

    const oldPenyewa = await db.getAsync('SELECT * FROM tbl_penyewa WHERE id_penyewa = ?', [id]);
    if (!oldPenyewa) {
      return res.status(404).json({ error: 'Data penyewa tidak ditemukan' });
    }

    const cleanTglSelesai = tgl_selesai_sewa && String(tgl_selesai_sewa).trim() !== '' ? tgl_selesai_sewa : null;
    const cleanAsalKtp = asal_ktp && String(asal_ktp).trim() !== '' ? asal_ktp.trim() : null;
    let cleanKodeUnit = kode_kontrakan && String(kode_kontrakan).trim() !== '' ? kode_kontrakan : null;
    let statusSewa = 'Aktif';
    let cleanTglKeluar = null;

    if (cleanTglSelesai) {
      const tglSelesaiDate = new Date(cleanTglSelesai);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (tglSelesaiDate < today) {
        cleanKodeUnit = null;
        statusSewa = 'Tidak Aktif';
        cleanTglKeluar = cleanTglSelesai;
      }
    }

    if (!cleanKodeUnit) {
      // Jika tidak menempati unit dan sebelumnya tidak aktif atau dikeluarkan
      statusSewa = 'Tidak Aktif';
      cleanTglKeluar = oldPenyewa.tgl_keluar_aktual || new Date().toISOString().split('T')[0];
    } else {
      // Jika diberikan unit yang valid dan tanggal sewa aktif
      statusSewa = 'Aktif';
      cleanTglKeluar = null;
    }

    await db.runAsync(
      'UPDATE tbl_penyewa SET nama_penyewa = ?, no_hp = ?, asal_ktp = ?, tgl_mulai_sewa = ?, tgl_selesai_sewa = ?, kode_kontrakan = ?, status_sewa = ?, tgl_keluar_aktual = ? WHERE id_penyewa = ?',
      [
        nama_penyewa ? String(nama_penyewa).trim() : '',
        no_hp ? String(no_hp).trim() : '',
        cleanAsalKtp,
        tgl_mulai_sewa,
        cleanTglSelesai,
        cleanKodeUnit,
        statusSewa,
        cleanTglKeluar,
        id
      ]
    );

    // SINKRONISASI KE TBL_KONTRAKAN:
    // 1. Jika unit lama berbeda dengan unit baru, atau unit lama dilepas
    const oldKode = oldPenyewa.kode_kontrakan;
    if (oldKode && oldKode !== cleanKodeUnit) {
      const otherTenant = await db.getAsync(`
        SELECT id_penyewa FROM tbl_penyewa 
        WHERE kode_kontrakan = ? AND id_penyewa != ? AND status_sewa = 'Aktif'
        LIMIT 1
      `, [oldKode, id]);

      if (!otherTenant) {
        await db.runAsync(`
          UPDATE tbl_kontrakan 
          SET status_unit = 'Kosong', tgl_kosong_sejak = CURRENT_DATE 
          WHERE kode_kontrakan = ? AND status_unit != 'Dalam Perbaikan'
        `, [oldKode]);
      }
    }

    // 2. Unit baru yang ditempati
    if (cleanKodeUnit) {
      await db.runAsync(`
        UPDATE tbl_kontrakan 
        SET status_unit = CASE WHEN status_unit = 'Dalam Perbaikan' THEN 'Dalam Perbaikan' ELSE 'Terisi' END,
            tgl_kosong_sejak = NULL
        WHERE kode_kontrakan = ?
      `, [cleanKodeUnit]);
    }

    res.json({ message: 'Data penyewa berhasil diperbarui dan disinkronkan' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deletePenyewa = async (req, res) => {
  try {
    const { id } = req.params;
    const oldPenyewa = await db.getAsync('SELECT kode_kontrakan FROM tbl_penyewa WHERE id_penyewa = ?', [id]);

    await db.runAsync('DELETE FROM tbl_penyewa WHERE id_penyewa = ?', [id]);

    // Jika penyewa menempati unit dan tidak ada penyewa lain, kosongkan unit tersebut
    if (oldPenyewa?.kode_kontrakan) {
      const otherTenant = await db.getAsync(`
        SELECT id_penyewa FROM tbl_penyewa 
        WHERE kode_kontrakan = ? AND status_sewa = 'Aktif'
        LIMIT 1
      `, [oldPenyewa.kode_kontrakan]);

      if (!otherTenant) {
        await db.runAsync(`
          UPDATE tbl_kontrakan 
          SET status_unit = 'Kosong', tgl_kosong_sejak = CURRENT_DATE 
          WHERE kode_kontrakan = ? AND status_unit != 'Dalam Perbaikan'
        `, [oldPenyewa.kode_kontrakan]);
      }
    }

    res.json({ message: 'Data penyewa berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllPenyewa,
  getNextId,
  createPenyewa,
  updatePenyewa,
  deletePenyewa
};

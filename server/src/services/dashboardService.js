const { db } = require('../database/db');
const { computeRiskScore } = require('./riskEngine');
const { calculateUnitVacancy } = require('../utils/vacancyCalculator');

/**
 * Service untuk kalkulasi metrik ringkasan KPI dashboard
 */
const getDashboardStats = async (periodeParam) => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
  const periode = periodeParam || `${currentYear}-${currentMonth}`;
  const year = periode.split('-')[0];
  const month = periode.split('-')[1];

  // 1. Total Unit & Okupansi
  const totalUnitRow = await db.getAsync('SELECT COUNT(*) as total FROM v_status_unit_terkini');
  const terisiUnitRow = await db.getAsync("SELECT COUNT(*) as terisi FROM v_status_unit_terkini WHERE status_realtime = 'Terisi'");
  const totalUnit = totalUnitRow?.total || 0;
  const unitTerisi = terisiUnitRow?.terisi || 0;
  const occupancyRate = totalUnit > 0 ? ((unitTerisi / totalUnit) * 100).toFixed(1) : 0;

  // 2. Transaksi periode ini (Basis Akrual / Hak Tagihan)
  const transaksiList = await db.allAsync(`
    SELECT t.*, k.nama_kontrakan, p.nama_penyewa, p.no_hp, p.tgl_mulai_sewa
    FROM tbl_transaksi_pembayaran t
    JOIN tbl_kontrakan k ON t.kode_kontrakan = k.kode_kontrakan
    JOIN tbl_penyewa p ON t.id_penyewa = p.id_penyewa
    WHERE t.periode_bulan_tahun = ?
  `, [periode]);

  // Realisasi Kas Masuk Fisik yang benar-benar masuk pada bulan periode ini (Basis Kas)
  const kasRow = await db.getAsync(`
    SELECT COALESCE(SUM(nominal_bayar), 0) as total_kas_masuk
    FROM tbl_riwayat_pembayaran
    WHERE TO_CHAR(tanggal_bayar, 'YYYY-MM') = ? OR tanggal_bayar::TEXT LIKE ?
  `, [periode, `${periode}%`]);
  const totalPenerimaan = parseFloat(kasRow?.total_kas_masuk) || 0;

  // Total Potensi Tagihan periode ini
  const totalPotensi = transaksiList.reduce((acc, t) => acc + (parseFloat(t.harga_sewa_periode) || 0), 0);

  // Tunggakan periode ini (potensi tagihan dikurangi uang yang sudah diterima pada/sebelum periode tersebut)
  let terbayarUntukPeriodeIni = 0;
  for (const t of transaksiList) {
    const rRow = await db.getAsync(`
      SELECT COALESCE(SUM(nominal_bayar), 0) as paid_in_period
      FROM tbl_riwayat_pembayaran
      WHERE id_transaksi = ?
        AND (TO_CHAR(tanggal_bayar, 'YYYY-MM') <= ? OR tanggal_bayar::TEXT <= ?)
    `, [t.id_transaksi, periode, `${periode}-31`]);
    terbayarUntukPeriodeIni += (parseFloat(rRow?.paid_in_period) || 0);
  }
  const tunggakanBulanIni = Math.max(0, totalPotensi - terbayarUntukPeriodeIni);

  // 3. Early Warning Scores untuk transaksi periode ini
  const warnings = [];
  for (const t of transaksiList) {
    const rRow = await db.getAsync(`
      SELECT COALESCE(SUM(nominal_bayar), 0) as paid_in_period
      FROM tbl_riwayat_pembayaran
      WHERE id_transaksi = ?
        AND (TO_CHAR(tanggal_bayar, 'YYYY-MM') <= ? OR tanggal_bayar::TEXT <= ?)
    `, [t.id_transaksi, periode, `${periode}-31`]);

    const paidInPeriod = parseFloat(rRow?.paid_in_period) || 0;
    const sisaInPeriod = Math.max(0, (parseFloat(t.harga_sewa_periode) || 0) - paidInPeriod);
    const tglLunasEffective = sisaInPeriod <= 0 ? t.tgl_lunas : null;

    const risk = computeRiskScore({
      periode: t.periode_bulan_tahun || periode,
      tglLunas: tglLunasEffective,
      tglMulaiSewa: t.tgl_mulai_sewa,
      statusPembayaran: sisaInPeriod <= 0 ? 'Lunas' : (paidInPeriod > 0 ? 'Cicil' : 'Belum Lunas'),
      cicilan1: t.cicilan_1_rp,
      cicilan2: t.cicilan_2_rp,
      totalTerbayar: paidInPeriod,
      hargaSewa: t.harga_sewa_periode
    });

    warnings.push({
      ...t,
      total_terbayar: paidInPeriod,
      sisa_tagihan: sisaInPeriod,
      riskScore: risk.riskScore || risk.score,
      dueDay: risk.breakdown?.dueDay || 5,
      ...risk
    });
  }

  const highRiskCount = warnings.filter(w => w.kategori === 'High').length;
  const medRiskCount = warnings.filter(w => w.kategori === 'Medium').length;
  const lowRiskCount = warnings.filter(w => w.kategori === 'Low').length;

  return {
    periode,
    totalUnit,
    unitTerisi,
    unitKosong: totalUnit - unitTerisi,
    occupancyRate: `${occupancyRate}%`,
    totalPenerimaan,
    totalPotensi,
    tunggakanBulanIni,
    riskSummary: {
      high: highRiskCount,
      medium: medRiskCount,
      low: lowRiskCount,
      totalCases: highRiskCount + medRiskCount
    }
  };
};

/**
 * Service untuk kalkulasi tren 12 bulan (Potensi Penuh, Realisasi Kas Masuk, Biaya, Laba Bersih)
 */
const getFinancialTrend = async (tahunParam) => {
  const today = new Date();
  const tahun = tahunParam || today.getFullYear().toString();

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Kapasitas sewa penuh jika semua unit 100% terisi
  const totalSemuaUnit = await db.getAsync(`SELECT SUM(harga_saat_ini) as total_kapasitas FROM tbl_kontrakan`);
  const kapasitasPenuhPerBulan = parseFloat(totalSemuaUnit?.total_kapasitas) || 0;

  // 1. Realisasi Penerimaan Kas Riil (Basis Kas) per bulan uang diterima
  const kasRows = await db.allAsync(`
    SELECT 
      TO_CHAR(tanggal_bayar, 'YYYY-MM') as periode,
      SUM(nominal_bayar) as realisasi_kas
    FROM tbl_riwayat_pembayaran
    WHERE TO_CHAR(tanggal_bayar, 'YYYY') = ? OR tanggal_bayar::TEXT LIKE ?
    GROUP BY TO_CHAR(tanggal_bayar, 'YYYY-MM')
  `, [tahun, `${tahun}%`]);

  // 2. Potensi Tagihan Sewa (Basis Akrual) per periode tagihan
  const potensiRows = await db.allAsync(`
    SELECT 
      periode_bulan_tahun as periode,
      SUM(harga_sewa_periode) as transaksi_potensi
    FROM tbl_transaksi_pembayaran
    WHERE periode_bulan_tahun LIKE ?
    GROUP BY periode_bulan_tahun
  `, [`${tahun}-%`]);

  // 3. Pembayaran yang diterima pada/sebelum bulan tagihan untuk tagihan bulan tersebut
  const paidInMonthRows = await db.allAsync(`
    SELECT 
      t.periode_bulan_tahun as periode,
      COALESCE(SUM(r.nominal_bayar), 0) as terbayar_di_periode
    FROM tbl_transaksi_pembayaran t
    JOIN tbl_riwayat_pembayaran r ON t.id_transaksi = r.id_transaksi
    WHERE t.periode_bulan_tahun LIKE ?
      AND (TO_CHAR(r.tanggal_bayar, 'YYYY-MM') <= t.periode_bulan_tahun OR r.tanggal_bayar::TEXT <= (t.periode_bulan_tahun || '-31'))
    GROUP BY t.periode_bulan_tahun
  `, [`${tahun}-%`]);

  // 4. Biaya pemeliharaan
  const biayaRows = await db.allAsync(`
    SELECT TO_CHAR(tanggal_pengeluaran, 'MM') as bulan, SUM(biaya) as total_biaya
    FROM tbl_pengeluaran_maintenance
    WHERE tahun = ?
    GROUP BY TO_CHAR(tanggal_pengeluaran, 'MM')
  `, [tahun]);

  const kasMap = {};
  kasRows.forEach(r => { kasMap[r.periode] = parseFloat(r.realisasi_kas) || 0; });

  const potensiMap = {};
  potensiRows.forEach(r => { potensiMap[r.periode] = parseFloat(r.transaksi_potensi) || 0; });

  const paidInMonthMap = {};
  paidInMonthRows.forEach(r => { paidInMonthMap[r.periode] = parseFloat(r.terbayar_di_periode) || 0; });

  const biayaMap = {};
  biayaRows.forEach(r => {
    const periode = `${tahun}-${r.bulan}`;
    biayaMap[periode] = parseFloat(r.total_biaya) || 0;
  });

  const trendData = [];
  for (let m = 1; m <= 12; m++) {
    const monthStr = m.toString().padStart(2, '0');
    const periode = `${tahun}-${monthStr}`;

    const transaksiPotensi = potensiMap[periode] || 0;
    const potensi = kapasitasPenuhPerBulan;
    const realisasi = kasMap[periode] || 0; // Uang riil yang fisik masuk kas di bulan ini
    const terbayarDiBulan = paidInMonthMap[periode] || 0;
    const tunggakan = Math.max(0, transaksiPotensi - terbayarDiBulan); // Tunggakan tagihan bulan ini yang belum masuk kas
    const biaya = biayaMap[periode] || 0;
    const labaBersih = realisasi - biaya;
    const gap = Math.max(0, potensi - realisasi);

    trendData.push({
      periode,
      bulanSingkat: monthNames[m - 1].slice(0, 3),
      bulanLengkap: monthNames[m - 1],
      potensi,
      transaksiPotensi,
      realisasi,
      tunggakan,
      biaya,
      labaBersih,
      gap
    });
  }

  return { 
    tahun, 
    kapasitasPenuhPerBulan,
    data: trendData 
  };
};

/**
 * Service untuk kalkulasi EWS Vacancy Loss (Kamar Kosong)
 */
const getVacancyLoss = async () => {
  const emptyUnits = await db.allAsync(`
    SELECT 
      k.kode_kontrakan, 
      k.nama_kontrakan, 
      k.harga_saat_ini,
      k.status_realtime
    FROM v_status_unit_terkini k
    WHERE k.status_realtime = 'Kosong'
    ORDER BY k.harga_saat_ini DESC
  `);

  const perbaikanUnits = await db.allAsync(`
    SELECT 
      k.kode_kontrakan, 
      k.nama_kontrakan, 
      k.harga_saat_ini,
      k.status_realtime,
      k.status_detail,
      k.nama_penyewa,
      m.deskripsi as deskripsi_pemeliharaan,
      m.biaya as biaya_pemeliharaan,
      m.tanggal_pengeluaran as tanggal_mulai_pengerjaan
    FROM v_status_unit_terkini k
    LEFT JOIN tbl_pengeluaran_maintenance m ON k.kode_kontrakan = m.kode_kontrakan 
      AND m.status_pengerjaan = 'Sedang Dikerjakan'
    WHERE k.status_realtime = 'Dalam Perbaikan'
    ORDER BY k.kode_kontrakan ASC
  `);

  const totalSemuaUnit = await db.getAsync(`SELECT SUM(harga_saat_ini) as total, COUNT(*) as total_unit FROM tbl_kontrakan`);
  const totalKapasitas = parseFloat(totalSemuaUnit?.total) || 1;
  const totalSemuaKamar = parseInt(totalSemuaUnit?.total_unit, 10) || 1;

  const totalKerugianBulanan = emptyUnits.reduce((sum, u) => sum + (parseFloat(u.harga_saat_ini) || 0), 0);

  const vacancyList = await Promise.all(emptyUnits.map(async (u) => {
    const lastTx = await db.getAsync(`
      SELECT t.periode_bulan_tahun, p.nama_penyewa
      FROM tbl_transaksi_pembayaran t
      LEFT JOIN tbl_penyewa p ON t.id_penyewa = p.id_penyewa
      WHERE t.kode_kontrakan = ?
      ORDER BY t.periode_bulan_tahun DESC
      LIMIT 1
    `, [u.kode_kontrakan]);

    const lastPenyewa = await db.getAsync(`
      SELECT p.*
      FROM tbl_penyewa p
      WHERE p.kode_kontrakan = ?
      ORDER BY p.tgl_mulai_sewa DESC
      LIMIT 1
    `, [u.kode_kontrakan]);

    const vac = calculateUnitVacancy({
      unit: u,
      lastTx,
      lastPenyewa,
      totalKapasitas,
      totalKerugianBulanan
    });

    return {
      kode_kontrakan: u.kode_kontrakan,
      nama_kontrakan: u.nama_kontrakan,
      ...vac,
      penyewa_terakhir: vac.penyewa_terakhir || 'Belum ada penyewa'
    };
  }));

  const totalKerugianAkumulasi = vacancyList.reduce((sum, u) => sum + (u.total_kerugian_akumulasi || 0), 0);
  const totalDurasiKosong = vacancyList.reduce((sum, u) => sum + (u.durasi_kosong_hari || 0), 0);
  const rataRataDurasiKosong = vacancyList.length > 0 ? Math.round(totalDurasiKosong / vacancyList.length) : 0;
  const persenPotensiHilangTotal = totalKapasitas > 0 ? Math.round((totalKerugianBulanan / totalKapasitas) * 100) : 0;

  return {
    total_unit_kosong: emptyUnits.length,
    total_unit_perbaikan: perbaikanUnits.length,
    total_semua_unit: totalSemuaKamar,
    total_kerugian_bulanan: totalKerugianBulanan,
    total_kerugian_akumulasi: totalKerugianAkumulasi,
    persen_potensi_hilang: persenPotensiHilangTotal,
    rata_rata_durasi_kosong: rataRataDurasiKosong,
    total_durasi_kosong: totalDurasiKosong,
    vacancyList,
    perbaikanList: perbaikanUnits
  };
};

/**
 * Service untuk EWS Tunggakan & Risiko Finansial Penyewa
 */
const getEarlyWarnings = async (periodeParam, tahunParam) => {
  let whereClause = '';
  let params = [];

  if (periodeParam && String(periodeParam).trim() !== '') {
    whereClause = 'WHERE t.periode_bulan_tahun = ?';
    params = [periodeParam.trim()];
  } else if (tahunParam && String(tahunParam).trim() !== '') {
    whereClause = 'WHERE t.periode_bulan_tahun LIKE ?';
    params = [`${tahunParam.trim()}-%`];
  }

  const query = `
    SELECT t.*, k.nama_kontrakan, p.nama_penyewa, p.no_hp, p.tgl_mulai_sewa
    FROM tbl_transaksi_pembayaran t
    JOIN tbl_kontrakan k ON t.kode_kontrakan = k.kode_kontrakan
    JOIN tbl_penyewa p ON t.id_penyewa = p.id_penyewa
    ${whereClause}
    ORDER BY t.periode_bulan_tahun DESC
  `;
  const transRows = await db.allAsync(query, params);

  const isMonthFiltered = Boolean(periodeParam && String(periodeParam).trim() !== '');
  const warnings = [];

  for (const t of transRows) {
    let terbayar = parseFloat(t.total_terbayar) || 0;
    let sisa = Math.max(0, (parseFloat(t.harga_sewa_periode) || 0) - terbayar);
    let statusPembayaran = t.status_pembayaran;
    let tglLunasEffective = t.tgl_lunas;
    let catatanPelunasan = null;

    if (isMonthFiltered) {
      // Jika difilter per bulan spesifik, hitung status dan sisa tagihan pada bulan tersebut
      const rRow = await db.getAsync(`
        SELECT 
          COALESCE(SUM(CASE WHEN (TO_CHAR(tanggal_bayar, 'YYYY-MM') <= ? OR tanggal_bayar::TEXT <= ?) THEN nominal_bayar ELSE 0 END), 0) as paid_in_period,
          COALESCE(SUM(CASE WHEN NOT (TO_CHAR(tanggal_bayar, 'YYYY-MM') <= ? OR tanggal_bayar::TEXT <= ?) THEN nominal_bayar ELSE 0 END), 0) as paid_after_period,
          MAX(CASE WHEN NOT (TO_CHAR(tanggal_bayar, 'YYYY-MM') <= ? OR tanggal_bayar::TEXT <= ?) THEN tanggal_bayar ELSE NULL END) as latest_after_date
        FROM tbl_riwayat_pembayaran
        WHERE id_transaksi = ?
      `, [periodeParam, `${periodeParam}-31`, periodeParam, `${periodeParam}-31`, periodeParam, `${periodeParam}-31`, t.id_transaksi]);

      const paidInPeriod = parseFloat(rRow?.paid_in_period) || 0;
      const paidAfterPeriod = parseFloat(rRow?.paid_after_period) || 0;
      const latestAfterDate = rRow?.latest_after_date;

      terbayar = paidInPeriod;
      sisa = Math.max(0, (parseFloat(t.harga_sewa_periode) || 0) - paidInPeriod);

      if (sisa > 0) {
        statusPembayaran = paidInPeriod > 0 ? 'Cicil' : 'Belum Lunas';
        tglLunasEffective = null;
        if (paidAfterPeriod >= sisa) {
          const tglStr = latestAfterDate ? String(latestAfterDate).split('T')[0] : 'bulan berikutnya';
          catatanPelunasan = `Sisa tagihan Rp ${sisa.toLocaleString('id-ID')} dilunasi pada tanggal ${tglStr} (masuk arus kas bulan berikutnya).`;
        }
      }
    }

    const risk = computeRiskScore({
      periode: t.periode_bulan_tahun,
      tglLunas: tglLunasEffective,
      tglMulaiSewa: t.tgl_mulai_sewa,
      statusPembayaran,
      cicilan1: t.cicilan_1_rp,
      cicilan2: t.cicilan_2_rp,
      totalTerbayar: terbayar,
      hargaSewa: t.harga_sewa_periode
    });

    if (risk.kategori === 'High' || risk.kategori === 'Medium' || sisa > 0) {
      warnings.push({
        id_transaksi: t.id_transaksi,
        kode_kontrakan: t.kode_kontrakan,
        nama_kontrakan: t.nama_kontrakan,
        id_penyewa: t.id_penyewa,
        nama_penyewa: t.nama_penyewa,
        no_hp: t.no_hp,
        periode: t.periode_bulan_tahun,
        total_terbayar: terbayar,
        harga_sewa_periode: parseFloat(t.harga_sewa_periode) || 0,
        sisa_tagihan: sisa,
        status_pembayaran: statusPembayaran,
        tgl_lunas: t.tgl_lunas,
        catatan_pelunasan: catatanPelunasan,
        tgl_mulai_sewa: t.tgl_mulai_sewa,
        dueDay: risk.breakdown?.dueDay || 5,
        riskScore: risk.riskScore || risk.score,
        ...risk
      });
    }
  }

  warnings.sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));

  return {
    periode: periodeParam || tahunParam || 'Semua Periode',
    total_warnings: warnings.length,
    warnings
  };
};

module.exports = {
  getDashboardStats,
  getFinancialTrend,
  getVacancyLoss,
  getEarlyWarnings
};

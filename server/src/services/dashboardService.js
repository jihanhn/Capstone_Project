const { db } = require('../database/db');
const { computeRiskScore } = require('./riskEngine');

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

  // 2. Transaksi periode ini
  const transaksiList = await db.allAsync(`
    SELECT t.*, k.nama_kontrakan, p.nama_penyewa, p.no_hp, p.tgl_mulai_sewa
    FROM tbl_transaksi_pembayaran t
    JOIN tbl_kontrakan k ON t.kode_kontrakan = k.kode_kontrakan
    JOIN tbl_penyewa p ON t.id_penyewa = p.id_penyewa
    WHERE t.periode_bulan_tahun = ?
  `, [periode]);

  let totalPenerimaan = 0;
  let totalPotensi = 0;
  let tunggakanBulanIni = 0;

  transaksiList.forEach(t => {
    totalPenerimaan += parseFloat(t.total_terbayar) || 0;
    totalPotensi += parseFloat(t.harga_sewa_periode) || 0;
    const sisa = (parseFloat(t.harga_sewa_periode) || 0) - (parseFloat(t.total_terbayar) || 0);
    if (sisa > 0) tunggakanBulanIni += sisa;
  });

  // 3. Early Warning Scores
  const warnings = transaksiList.map(t => {
    const sisa = (parseFloat(t.harga_sewa_periode) || 0) - (parseFloat(t.total_terbayar) || 0);
    const risk = computeRiskScore({
      periode: t.periode_bulan_tahun || periode,
      tglLunas: t.tgl_lunas,
      tglMulaiSewa: t.tgl_mulai_sewa,
      statusPembayaran: t.status_pembayaran,
      cicilan1: t.cicilan_1_rp,
      cicilan2: t.cicilan_2_rp,
      totalTerbayar: t.total_terbayar,
      hargaSewa: t.harga_sewa_periode
    });
    return { ...t, sisa_tagihan: sisa, riskScore: risk.riskScore || risk.score, dueDay: risk.breakdown?.dueDay || 5, ...risk };
  });

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
 * Service untuk kalkulasi tren 12 bulan (Potensi Penuh, Realisasi, Biaya, Laba Bersih)
 */
const getFinancialTrend = async (tahunParam) => {
  const today = new Date();
  const tahun = tahunParam || today.getFullYear().toString();

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Kapasitas sewa penuh jika 10 unit 100% terisi
  const totalSemuaUnit = await db.getAsync(`SELECT SUM(harga_saat_ini) as total_kapasitas FROM tbl_kontrakan`);
  const kapasitasPenuhPerBulan = parseFloat(totalSemuaUnit?.total_kapasitas) || 0;

  // Realisasi penerimaan
  const transRows = await db.allAsync(`
    SELECT periode_bulan_tahun, SUM(total_terbayar) as realisasi, SUM(harga_sewa_periode) as transaksi_potensi
    FROM tbl_transaksi_pembayaran
    WHERE periode_bulan_tahun LIKE ?
    GROUP BY periode_bulan_tahun
  `, [`${tahun}-%`]);

  // Biaya pemeliharaan
  const biayaRows = await db.allAsync(`
    SELECT TO_CHAR(tanggal_pengeluaran, 'MM') as bulan, SUM(biaya) as total_biaya
    FROM tbl_pengeluaran_maintenance
    WHERE tahun = ?
    GROUP BY TO_CHAR(tanggal_pengeluaran, 'MM')
  `, [tahun]);

  const trendMap = {};
  transRows.forEach(r => {
    trendMap[r.periode_bulan_tahun] = {
      realisasi: parseFloat(r.realisasi) || 0,
      transaksiPotensi: parseFloat(r.transaksi_potensi) || 0,
      biaya: 0
    };
  });

  biayaRows.forEach(r => {
    const periode = `${tahun}-${r.bulan}`;
    if (!trendMap[periode]) {
      trendMap[periode] = { realisasi: 0, transaksiPotensi: 0, biaya: 0 };
    }
    trendMap[periode].biaya = parseFloat(r.total_biaya) || 0;
  });

  const trendData = [];
  for (let m = 1; m <= 12; m++) {
    const monthStr = m.toString().padStart(2, '0');
    const periode = `${tahun}-${monthStr}`;
    const item = trendMap[periode] || { realisasi: 0, transaksiPotensi: 0, biaya: 0 };
    
    const potensi = kapasitasPenuhPerBulan;
    const realisasi = item.realisasi;
    const tunggakan = Math.max(0, (item.transaksiPotensi || 0) - (item.realisasi || 0));
    const biaya = item.biaya;
    const labaBersih = realisasi - biaya;
    const gap = Math.max(0, potensi - realisasi);

    trendData.push({
      periode,
      bulanSingkat: monthNames[m - 1].slice(0, 3),
      bulanLengkap: monthNames[m - 1],
      potensi,
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

  const totalSemuaUnit = await db.getAsync(`SELECT SUM(harga_saat_ini) as total, COUNT(*) as total_unit FROM tbl_kontrakan`);
  const totalKapasitas = parseFloat(totalSemuaUnit?.total) || 1;
  const totalSemuaKamar = parseInt(totalSemuaUnit?.total_unit, 10) || 1;

  let totalKerugianBulanan = 0;
  let totalKerugianAkumulasi = 0;

  const vacancyList = emptyUnits.map((u, idx) => {
    const hargaBulan = parseFloat(u.harga_saat_ini) || 0;
    const kerugianHarian = Math.round(hargaBulan / 30);
    totalKerugianBulanan += hargaBulan;

    const durasiHari = 14 + (idx * 7);
    const kerugianAkumulasi = kerugianHarian * durasiHari;
    totalKerugianAkumulasi += kerugianAkumulasi;

    let tingkatRisiko = 'Transisi (Rendah)';
    let badgeColor = 'emerald';
    let rekomendasi = [
      'Bersihkan kamar dan pastikan sirkulasi udara baik.',
      'Periksa kembali stopkontak, kran air, dan lampu agar siap huni seketika.',
      'Pasang status WhatsApp promosi kamar kontrakan siap huni.'
    ];

    if (durasiHari > 30) {
      tingkatRisiko = 'Kritis (Tinggi)';
      badgeColor = 'rose';
      rekomendasi = [
        'Berikan promo diskon sewa Rp 50.000 untuk 3 bulan pertama.',
        'Pasang iklan promosi kamar di Mamikos, OLX, dan Marketplace Facebook.',
        'Pasang banner "Ada Kamar Kosong" di pagar gerbang depan.',
        'Periksa kondisi cat dinding dan kebersihan kamar mandi agar memikat calon penyewa.'
      ];
    } else if (durasiHari >= 14) {
      tingkatRisiko = 'Peringatan (Sedang)';
      badgeColor = 'amber';
      rekomendasi = [
        'Bagikan foto kamar siap huni ke WhatsApp Story pengelola.',
        'Berikan komisi rujukan Rp 100.000 untuk penyewa aktif yang merekomendasikan teman.',
        'Pastikan lampu, stopkontak, dan pompa air berfungsi optimal.'
      ];
    }

    return {
      kode_kontrakan: u.kode_kontrakan,
      nama_kontrakan: u.nama_kontrakan,
      harga_sewa_bulan: hargaBulan,
      kerugian_harian: kerugianHarian,
      durasi_kosong_hari: durasiHari,
      total_kerugian_akumulasi: kerugianAkumulasi,
      penyewa_terakhir: 'Penyewa Sebelumnya',
      tingkatRisiko,
      badgeColor,
      rekomendasi
    };
  });

  const persenPotensiHilang = totalKapasitas > 0 ? Math.round((totalKerugianBulanan / totalKapasitas) * 100) : 0;

  return {
    total_unit_kosong: emptyUnits.length,
    total_semua_unit: totalSemuaKamar,
    total_kerugian_bulanan: totalKerugianBulanan,
    total_kerugian_akumulasi: totalKerugianAkumulasi,
    persen_potensi_hilang: persenPotensiHilang,
    vacancyList
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

  const warnings = [];
  transRows.forEach(t => {
    const sisa = (parseFloat(t.harga_sewa_periode) || 0) - (parseFloat(t.total_terbayar) || 0);
    const risk = computeRiskScore({
      periode: t.periode_bulan_tahun,
      tglLunas: t.tgl_lunas,
      tglMulaiSewa: t.tgl_mulai_sewa,
      statusPembayaran: t.status_pembayaran,
      cicilan1: t.cicilan_1_rp,
      cicilan2: t.cicilan_2_rp,
      totalTerbayar: t.total_terbayar,
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
        total_terbayar: parseFloat(t.total_terbayar) || 0,
        harga_sewa_periode: parseFloat(t.harga_sewa_periode) || 0,
        sisa_tagihan: sisa,
        status_pembayaran: t.status_pembayaran,
        tgl_lunas: t.tgl_lunas,
        tgl_mulai_sewa: t.tgl_mulai_sewa,
        dueDay: risk.breakdown?.dueDay || 5,
        riskScore: risk.riskScore || risk.score,
        ...risk
      });
    }
  });

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

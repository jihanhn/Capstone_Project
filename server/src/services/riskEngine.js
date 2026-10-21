/**
 * Risk Engine & Financial Calculation Service
 * Berdasarkan spesifikasi DESIGN.md Bagian 2
 */

function getDueDayFromTglMulai(tglMulaiSewa, fallback = 5) {
  if (!tglMulaiSewa) return fallback;
  const str = String(tglMulaiSewa).split('T')[0];
  const parts = str.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[2], 10);
    if (!isNaN(day) && day >= 1 && day <= 31) return day;
  }
  const d = new Date(tglMulaiSewa);
  const day = d.getDate();
  return (!isNaN(day) && day >= 1 && day <= 31) ? day : fallback;
}

function calculatePaymentLag(periode, tglLunas, tglMulaiSewa = null) {
  if (!periode) return 0;
  const [yearStr, monthStr] = String(periode).split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;

  // Tanggal jatuh tempo dihitung berdasarkan tanggal masuk penyewa
  const dueDay = getDueDayFromTglMulai(tglMulaiSewa, 5);
  const maxDaysInMonth = new Date(year, month + 1, 0).getDate();
  const effectiveDueDay = Math.min(dueDay, maxDaysInMonth);

  // Tanggal jatuh tempo pada bulan periode tersebut
  const dueDate = new Date(year, month, effectiveDueDay);

  let payDate;
  if (tglLunas) {
    const pStr = String(tglLunas).split('T')[0];
    const pParts = pStr.split('-');
    if (pParts.length === 3) {
      payDate = new Date(parseInt(pParts[0], 10), parseInt(pParts[1], 10) - 1, parseInt(pParts[2], 10));
    } else {
      payDate = new Date(tglLunas);
    }
  } else {
    // Jika belum lunas, hitung keterlambatan terhadap hari ini
    const today = new Date();
    payDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }

  const diffMs = payDate.getTime() - dueDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

function getLagWeight(lagDays) {
  if (lagDays <= 0) return 0;
  if (lagDays <= 7) return 1;
  return 3;
}

function getInstallmentWeight(statusPembayaran, cicilan1, cicilan2) {
  if (statusPembayaran === 'Cicil' || (cicilan2 && cicilan2 > 0)) {
    return 2;
  }
  return 0;
}

function getArrearsWeight(statusPembayaran, lagDays, unpaidAmount) {
  if (statusPembayaran === 'Belum Lunas' && (lagDays > 30 || unpaidAmount > 0)) {
    return 5;
  }
  if (statusPembayaran === 'Cicil' && lagDays > 30) {
    return 5;
  }
  return 0;
}

function computeRiskScore(paramsOrTglLunas, ...rest) {
  let params = {};
  if (paramsOrTglLunas && typeof paramsOrTglLunas === 'object' && !(paramsOrTglLunas instanceof Date)) {
    params = paramsOrTglLunas;
  } else {
    // Positional call fallback: (tglLunas, statusPembayaran, unpaid, hargaSewa, periode, cicilan1, cicilan2, tglMulaiSewa)
    const [statusPembayaran, unpaidAmount, hargaSewa, periode, cicilan1, cicilan2, tglMulaiSewa] = rest;
    params = {
      periode: periode,
      tglLunas: paramsOrTglLunas,
      tglMulaiSewa,
      statusPembayaran,
      totalTerbayar: (parseFloat(hargaSewa) || 0) - (parseFloat(unpaidAmount) || 0),
      hargaSewa: parseFloat(hargaSewa) || 0,
      cicilan1: parseFloat(cicilan1) || 0,
      cicilan2: parseFloat(cicilan2) || 0
    };
  }

  const {
    periode,
    tglLunas,
    tglMulaiSewa,
    statusPembayaran,
    cicilan1 = 0,
    cicilan2 = 0,
    totalTerbayar = 0,
    hargaSewa = 0
  } = params;

  const dueDay = getDueDayFromTglMulai(tglMulaiSewa, 5);
  const lagDays = calculatePaymentLag(periode, tglLunas, tglMulaiSewa);
  const unpaid = Math.max(0, (parseFloat(hargaSewa) || 0) - (parseFloat(totalTerbayar) || 0));

  const L = getLagWeight(lagDays);
  const C = getInstallmentWeight(statusPembayaran, cicilan1, cicilan2);
  const T = unpaid > 0 ? getArrearsWeight(statusPembayaran, lagDays, unpaid) : 0;

  const totalScore = L + C + T;

  let kategori = 'Low';
  let badgeColor = 'green';
  let rekomendasi = 'Pembayaran lunas dan tepat waktu. Pertahankan komunikasi baik.';

  // Logika rekomendasi & kategori terpisah antara yang SUDAH LUNAS vs YANG MASIH MENUNGGAK
  if (unpaid <= 0) {
    // Sudah bayar lunas
    if (lagDays > 7) {
      kategori = 'Medium';
      badgeColor = 'yellow';
      rekomendasi = `Tagihan periode ini sudah LUNAS, namun ada catatan keterlambatan ${lagDays} hari dari tanggal jatuh tempo (Tgl ${dueDay}). Berikan apresiasi dan pengingat ramah untuk periode berikutnya.`;
    } else if (lagDays > 0) {
      kategori = 'Low';
      badgeColor = 'green';
      rekomendasi = `Tagihan periode ini sudah LUNAS (terlambat ringan ${lagDays} hari dari Tgl ${dueDay}).`;
    } else {
      kategori = 'Low';
      badgeColor = 'green';
      rekomendasi = `Pembayaran lunas tepat waktu pada tanggal jatuh tempo (Tgl ${dueDay}).`;
    }
  } else {
    // Masih ada tunggakan aktif
    if (totalScore >= 5) {
      kategori = 'High';
      badgeColor = 'red';
      rekomendasi = `Peringatan dini! Penyewa menunggak (${lagDays} hari dari Tgl ${dueDay}) dengan sisa tagihan aktif. Segera terbitkan Surat Peringatan (SP) dan lakukan penagihan langsung.`;
    } else if (totalScore >= 2 || statusPembayaran === 'Cicil') {
      kategori = 'Medium';
      badgeColor = 'yellow';
      rekomendasi = `Perhatian! Penyewa mencicil atau menunggak ringan (${lagDays} hari dari Tgl ${dueDay}). Kirimkan pesan pengingat tagihan via WhatsApp.`;
    } else {
      kategori = 'Low';
      badgeColor = 'green';
      rekomendasi = `Penyewa memiliki sisa tagihan dalam masa tenggang wajar.`;
    }
  }

  return {
    score: totalScore,
    riskScore: totalScore,
    kategori,
    badgeColor,
    rekomendasi,
    breakdown: {
      dueDay,
      L, 
      C, 
      T, 
      lagDays: Math.max(0, lagDays),
      unpaid
    }
  };
}

module.exports = {
  getDueDayFromTglMulai,
  calculatePaymentLag,
  getLagWeight,
  getInstallmentWeight,
  getArrearsWeight,
  computeRiskScore
};
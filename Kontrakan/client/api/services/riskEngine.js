/**
 * Risk Engine & Financial Calculation Service
 * Berdasarkan spesifikasi DESIGN.md Bagian 2
 */

/**
 * Menghitung selisih hari keterlambatan pembayaran terhadap tanggal jatuh tempo (default: tgl 5 tiap bulan)
 * @param {string} periode 'YYYY-MM'
 * @param {string|null} tglLunas 'YYYY-MM-DD'
 * @param {number} dueDay Hari jatuh tempo bulanan (default: 5)
 * @returns {number} jumlah hari terlambat (bisa negatif jika bayar sebelum jatuh tempo)
 */
function calculatePaymentLag(periode, tglLunas, dueDay = 5) {
  if (!periode) return 0;
  const [yearStr, monthStr] = periode.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;

  // Tanggal jatuh tempo pada bulan periode tersebut
  const dueDate = new Date(year, month, dueDay);

  let payDate;
  if (tglLunas) {
    payDate = new Date(tglLunas);
  } else {
    // Jika belum lunas, hitung keterlambatan terhadap akhir bulan periode atau waktu sekarang
    const now = new Date();
    payDate = now;
  }

  const diffMs = payDate.getTime() - dueDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Menghitung bobot Payment Lag (L)
 * - Tepat waktu / <= 0 hari: Bobot 0
 * - Terlambat 1 - 7 hari: Bobot 1
 * - Terlambat > 7 hari: Bobot 3
 */
function getLagWeight(lagDays) {
  if (lagDays <= 0) return 0;
  if (lagDays <= 7) return 1;
  return 3;
}

/**
 * Menghitung bobot Frekuensi Cicilan (C)
 * - Lunas sekali bayar: Bobot 0
 * - Dicicil >= 2 kali: Bobot 2
 */
function getInstallmentWeight(statusPembayaran, cicilan1, cicilan2) {
  if (statusPembayaran === 'Cicil' || (cicilan2 && cicilan2 > 0)) {
    return 2;
  }
  return 0;
}

/**
 * Menghitung bobot Status Tunggakan (T)
 * - Tidak ada tunggakan: Bobot 0
 * - Menunggak > 1 bulan / belum lunas lebih dari 30 hari: Bobot 5
 */
function getArrearsWeight(statusPembayaran, lagDays, unpaidAmount) {
  if (statusPembayaran === 'Belum Lunas' && (lagDays > 30 || unpaidAmount > 0)) {
    return 5;
  }
  if (statusPembayaran === 'Cicil' && lagDays > 30) {
    return 5;
  }
  return 0;
}

/**
 * Menghitung Risk Score S = L + C + T
 * Kategori:
 * - S <= 1 : Low Risk (Hijau)
 * - 2 <= S <= 4 : Medium Risk (Kuning)
 * - S >= 5 : High Risk (Merah)
 */
function computeRiskScore({ periode, tglLunas, statusPembayaran, cicilan1 = 0, cicilan2 = 0, totalTerbayar = 0, hargaSewa = 0 }) {
  const lagDays = calculatePaymentLag(periode, tglLunas);
  const unpaid = Math.max(0, hargaSewa - totalTerbayar);

  const L = getLagWeight(lagDays);
  const C = getInstallmentWeight(statusPembayaran, cicilan1, cicilan2);
  const T = getArrearsWeight(statusPembayaran, lagDays, unpaid);

  const totalScore = L + C + T;

  let kategori = 'Low';
  let badgeColor = 'green';
  let rekomendasi = 'Pembayaran lancar, pertahankan hubungan baik.';

  if (totalScore >= 5) {
    kategori = 'High';
    badgeColor = 'red';
    rekomendasi = 'Peringatan dini! Kirim surat peringatan (SP) dan follow-up penagihan langsung.';
  } else if (totalScore >= 2) {
    kategori = 'Medium';
    badgeColor = 'yellow';
    rekomendasi = 'Perlu dipantau. Kirimkan pesan pengingat tagihan ramah melalui WhatsApp.';
  }

  return {
    score: totalScore,
    kategori,
    badgeColor,
    rekomendasi,
    breakdown: {
      L, // payment lag weight
      C, // installment frequency weight
      T, // arrears weight
      lagDays: Math.max(0, lagDays),
      unpaid
    }
  };
}

module.exports = {
  calculatePaymentLag,
  getLagWeight,
  getInstallmentWeight,
  getArrearsWeight,
  computeRiskScore
};

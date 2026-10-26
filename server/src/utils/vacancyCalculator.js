/**
 * Utility untuk kalkulasi Vacancy (Kamar Kosong)
 * Menghitung tanggal kosong sejak, durasi hari, kerugian akumulasi, dan tingkat risiko
 * Selaras antara Dashboard EWS Vacancy dan Master Data Properti
 */

function calculateUnitVacancy({ unit, lastTx, lastPenyewa, totalKapasitas = 0, totalKerugianBulanan = 0 }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let startDate = null;

  if (unit.tgl_kosong_sejak) {
    startDate = new Date(unit.tgl_kosong_sejak);
  } else if (lastPenyewa && lastPenyewa.tgl_keluar_aktual) {
    startDate = new Date(lastPenyewa.tgl_keluar_aktual);
  } else if (lastPenyewa && lastPenyewa.tgl_selesai_sewa && new Date(lastPenyewa.tgl_selesai_sewa) <= today) {
    startDate = new Date(lastPenyewa.tgl_selesai_sewa);
  } else if (lastTx && lastTx.periode_bulan_tahun) {
    const parts = String(lastTx.periode_bulan_tahun).split('-');
    if (parts.length === 2) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10); // 1-12
      // Unit kosong terhitung mulai awal bulan berikutnya dari transaksi terakhir
      startDate = new Date(year, month, 1);
    }
  }

  // Jika tidak ditemukan catatan tanggal, default awal bulan berjalan
  if (!startDate || isNaN(startDate.getTime())) {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  }

  startDate.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - startDate.getTime();
  const durasiHari = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));

  const y = startDate.getFullYear();
  const m = String(startDate.getMonth() + 1).padStart(2, '0');
  const d = String(startDate.getDate()).padStart(2, '0');
  const formattedTglKosong = `${y}-${m}-${d}`;

  const hargaBulan = parseFloat(unit.harga_saat_ini || unit.harga_sewa_bulan) || 0;
  const kerugianHarian = Math.round(hargaBulan / 30);
  const totalKerugianAkumulasi = kerugianHarian * durasiHari;

  const penyewaTerakhir = lastTx?.nama_penyewa || lastPenyewa?.nama_penyewa || null;

  let tingkatRisiko = 'Transisi (Rendah)';
  let badgeColor = 'emerald';
  let rekomendasi = [
    'Bersihkan kamar dan pastikan sirkulasi udara baik.',
    'Periksa kembali stopkontak, kran air, dan lampu agar siap huni seketika.',
    'Pasang status WhatsApp promosi kamar kontrakan siap huni.'
  ];

  if (durasiHari >= 30) {
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

  const persenPotensiHilang = totalKapasitas > 0 ? Number(((hargaBulan / totalKapasitas) * 100).toFixed(1)) : 0;
  const porsiKerugianPersen = totalKerugianBulanan > 0 ? Number(((hargaBulan / totalKerugianBulanan) * 100).toFixed(1)) : 0;

  return {
    tgl_kosong_sejak: formattedTglKosong,
    durasi_kosong_hari: durasiHari,
    harga_sewa_bulan: hargaBulan,
    kerugian_harian: kerugianHarian,
    total_kerugian_akumulasi: totalKerugianAkumulasi,
    persen_potensi_hilang: persenPotensiHilang,
    porsi_kerugian_persen: porsiKerugianPersen,
    penyewa_terakhir: penyewaTerakhir,
    tingkatRisiko,
    badgeColor,
    rekomendasi
  };
}

module.exports = {
  calculateUnitVacancy
};

export const formatRupiah = (val) => {
  if (val === null || val === undefined || isNaN(val)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(val);
};

export const formatTanggal = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(d);
  } catch {
    return dateStr;
  }
};

export const generateWhatsAppLink = (noHp, namaPenyewa, unit, periode, sisaTagihan, kategoriRisiko, lagDays = 0, dueDay = null) => {
  if (!noHp) return '#';
  // Format nomor HP ke standar internasional 62
  let cleanNumber = noHp.replace(/\D/g, '');
  if (cleanNumber.startsWith('0')) {
    cleanNumber = '62' + cleanNumber.substring(1);
  }

  const sisa = parseFloat(sisaTagihan) || 0;
  let text = '';

  // KONDISI 1: SUDAH LUNAS (Sisa Tagihan = 0)
  if (sisa <= 0) {
    const infoJatuhTempo = dueDay ? `setiap tanggal ${dueDay}` : 'sesuai tanggal jatuh tempo masuk Anda';
    text = `Halo Bapak/Ibu ${namaPenyewa}, salam hangat dari pengelola Kontrakan Buti. Kami mengonfirmasi bahwa pembayaran sewa unit ${unit} periode ${periode} telah kami terima secara lunas. Terima kasih banyak atas kerjasamanya 🙏\n\nSebagai pengingat ramah untuk periode bulan berikutnya, mohon agar pembayaran dapat dilakukan tepat waktu (${infoJatuhTempo}) demi kenyamanan hunian bersama. Semoga sehat dan sukses selalu!`;
  } else if (kategoriRisiko === 'High') {
    // KONDISI 2: TUNGGAKAN TINGGI (HIGH RISK)
    const infoKeterlambatan = lagDays > 0 ? ` (Tercatat keterlambatan ${lagDays} hari)` : '';
    text = `Halo Bapak/Ibu ${namaPenyewa}, mohon maaf mengganggu. Kami dari pengelola Kontrakan Buti menginformasikan bahwa tagihan sewa unit ${unit} untuk periode ${periode} saat ini masih belum terselesaikan (Sisa Tunggakan: ${formatRupiah(sisa)})${infoKeterlambatan}.\n\nMengingat tenggat waktu yang telah terlewat, mohon kiranya dapat segera menyelesaikan pelunasan hari ini agar tidak diterbitkan Surat Peringatan (SP) dan penghentian fasilitas hunian. Terima kasih banyak atas kerjasamanya.`;
  } else {
    // KONDISI 3: CICILAN / TUNGGAKAN RINGAN (MEDIUM RISK)
    text = `Halo Bapak/Ibu ${namaPenyewa}, salam hangat dari pengelola Kontrakan Buti. Ini adalah pengingat ramah mengenai tagihan sewa unit ${unit} periode ${periode} dengan sisa pembayaran sebesar ${formatRupiah(sisa)}.\n\nMohon konfirmasi kesiapan transfer atau hubungi kami jika ada kendala. Terima kasih banyak.`;
  }

  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
};

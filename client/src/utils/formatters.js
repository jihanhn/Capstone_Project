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

export const generateWhatsAppLink = (noHp, namaPenyewa, unit, periode, sisaTagihan, kategoriRisiko) => {
  if (!noHp) return '#';
  // Format nomor HP ke standar internasional 62
  let cleanNumber = noHp.replace(/\D/g, '');
  if (cleanNumber.startsWith('0')) {
    cleanNumber = '62' + cleanNumber.substring(1);
  }

  let text = '';
  if (kategoriRisiko === 'High') {
    text = `Halo Bapak/Ibu ${namaPenyewa}, mohon maaf mengganggu. Kami dari pengelola Kontrakan Buti menginformasikan bahwa tagihan sewa unit ${unit} untuk periode ${periode} saat ini masih belum terselesaikan (Sisa: ${formatRupiah(sisaTagihan)}). Mengingat keterlambatan yang telah terjadi, mohon kiranya dapat segera menyelesaikan pelunasan hari ini agar tidak terbit Surat Peringatan. Terima kasih banyak atas kerjasamanya.`;
  } else {
    text = `Halo Bapak/Ibu ${namaPenyewa}, salam hangat dari pengelola Kontrakan Buti. Ini adalah pengingat ramah untuk tagihan sewa unit ${unit} periode ${periode} sebesar ${formatRupiah(sisaTagihan)}. Mohon konfirmasinya jika sudah melakukan transfer. Terima kasih.`;
  }

  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
};

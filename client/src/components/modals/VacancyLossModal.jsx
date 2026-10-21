import React, { useState } from 'react';
import { X, Copy, Check, AlertTriangle, TrendingDown, DollarSign, Megaphone, CheckCircle2, ShieldAlert, Sparkles, Phone } from 'lucide-react';
import { formatRupiah } from '../../utils/formatters';
import { showToast } from '../../utils/toast';

export default function VacancyLossModal({ unit, onClose }) {
  if (!unit) return null;

  const [copied, setCopied] = useState(false);

  const hargaBulan = unit.harga_sewa_bulan || unit.harga_saat_ini || 850000;
  const kerugian3Bln = hargaBulan * 3;
  const kerugian6Bln = hargaBulan * 6;

  const adTemplate = `🏠 DIKONTRAKKAN: Kamar Siap Huni - Kontrakan Buti (${unit.kode_kontrakan})
📍 Lokasi strategis, lingkungan tenang, aman, dan nyaman.
🛏️ Unit: ${unit.nama_kontrakan} (${unit.kode_kontrakan})
💰 Biaya Sewa: ${formatRupiah(hargaBulan)} / bulan
✨ Fasilitas Lengkap:
- Kamar mandi dalam bersih
- Ventilasi & sirkulasi udara sejuk
- Air sumur pompa jernih 24 jam (bebas iuran air)
- Listrik meteran mandiri
- Parkir motor terlindung dan gerbang aman
🎁 PROMO KHUSUS: Siap survei kapan saja. Diskon khusus untuk sewa awal!
📞 Hubungi Pengelola: 0812-1234-5678 (WhatsApp / Telepon)`;

  const handleCopyAd = () => {
    navigator.clipboard.writeText(adTemplate);
    setCopied(true);
    showToast('success', `Draf teks promosi unit ${unit.kode_kontrakan} disalin ke clipboard!`);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Analisis Vacancy Loss & Strategi Mitigasi
              </h3>
              <p className="text-xs text-slate-500">
                Unit {unit.kode_kontrakan} • {unit.nama_kontrakan}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Card Status & Kerugian Saat Ini */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-rose-50/70 border border-rose-200 p-3.5 rounded-xl">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">
                Kerugian Berjalan
              </span>
              <div className="text-xl font-extrabold text-rose-700 mt-1">
                {formatRupiah(unit.total_kerugian_akumulasi || hargaBulan)}
              </div>
              <span className="text-[11px] text-rose-600 font-medium">
                Selama {unit.durasi_kosong_hari || 14} hari kosong
              </span>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-xl">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
                Tarif Potensi / Bulan
              </span>
              <div className="text-xl font-extrabold text-amber-700 mt-1">
                {formatRupiah(hargaBulan)}
              </div>
              <span className="text-[11px] text-amber-600 font-medium">
                {formatRupiah(unit.kerugian_harian || Math.round(hargaBulan / 30))} / hari
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                Tingkat Risiko
              </span>
              <div className="mt-1">
                <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-extrabold uppercase ${
                  unit.tingkatRisiko?.includes('Kritis') 
                    ? 'bg-rose-100 text-rose-700' 
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {unit.tingkatRisiko || 'Peringatan'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium block mt-1">
                Perlu akselerasi okupansi
              </span>
            </div>
          </div>

          {/* Proyeksi Kerugian Jika Terus Kosong */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
            <h4 className="font-bold text-slate-800 text-xs mb-2 flex items-center space-x-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Simulasi Proyeksi Kerugian Masa Depan (Opportunity Loss)</span>
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Jika kosong hingga 3 bulan:</span>
                <span className="text-sm font-extrabold text-rose-600 block mt-0.5">
                  -{formatRupiah(kerugian3Bln)}
                </span>
                <span className="text-[10px] text-slate-400">Total sewa yang hilang</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Jika kosong hingga 6 bulan:</span>
                <span className="text-sm font-extrabold text-rose-600 block mt-0.5">
                  -{formatRupiah(kerugian6Bln)}
                </span>
                <span className="text-[10px] text-slate-400">Kerugian finansial parah</span>
              </div>
            </div>
          </div>

          {/* Rekomendasi Tindakan Strategis BI */}
          <div>
            <h4 className="font-bold text-slate-800 text-xs mb-2.5 flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Rekomendasi Tindakan Cepat (Business Intelligence Strategy)</span>
            </h4>
            <div className="space-y-2">
              {(unit.rekomendasi && unit.rekomendasi.length > 0 ? unit.rekomendasi : [
                'Berikan promo potongan sewa Rp 50.000 untuk 3 bulan pertama pembayaran lancar.',
                'Pasang iklan di Mamikos, OLX, dan Marketplace Facebook dengan foto kamar terbaik.',
                'Pasang banner "Ada Kamar Kosong" di pagar gerbang depan kontrakan.',
                'Tawarkan komisi referensi Rp 100.000 untuk penyewa aktif yang membawa kenalan.',
                'Periksa kebersihan kamar mandi dan cat dinding sebelum calon penyewa survei lokasi.'
              ]).map((saran, i) => (
                <div key={i} className="flex items-start space-x-2 text-xs text-slate-700 bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100/80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{saran}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Generator Iklan Siap Salin */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                <Megaphone className="w-4 h-4 text-indigo-600" />
                <span>Draft Iklan Promosi Sewa (Siap Pakai untuk WhatsApp & Medsos)</span>
              </h4>
              <button
                onClick={handleCopyAd}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center space-x-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copied ? 'Tersalin!' : 'Salin Iklan'}</span>
              </button>
            </div>
            <textarea
              readOnly
              rows={6}
              value={adTemplate}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-700 leading-relaxed outline-none resize-none"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

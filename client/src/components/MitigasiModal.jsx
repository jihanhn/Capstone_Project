import React, { useState } from 'react';
import { X, MessageSquare, AlertTriangle, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';
import { formatRupiah, generateWhatsAppLink } from '../utils/formatters';

export default function MitigasiModal({ warning, onClose }) {
  if (!warning) return null;

  const [activeTab, setActiveTab] = useState('detail');
  const [copied, setCopied] = useState(false);

  const spTemplate = `SURAT PERINGATAN (SP) PENYEWA KONTRAKAN BUTI
Nomor: SP/${warning.periode}/${warning.kode_kontrakan}

Kepada Yth.
Bapak/Ibu: ${warning.nama_penyewa}
Unit Kontrakan: ${warning.nama_kontrakan} (${warning.kode_kontrakan})

Dengan hormat,
Berdasarkan data sistem pembukuan Kontrakan Buti, kami mencatat kewajiban sewa hunian Anda untuk periode ${warning.periode} dengan rincian:
- Total Tarif Sewa : ${formatRupiah(warning.harga_sewa_periode)}
- Total Terbayar   : ${formatRupiah(warning.total_terbayar)}
- Sisa Tunggakan   : ${formatRupiah(warning.sisa_tagihan)}
- Status           : ${warning.status_pembayaran} (${warning.kategori} Risk - Keterlambatan: ${warning.breakdown?.lagDays || 0} hari)

Sehubungan dengan hal tersebut, kami mengimbau agar pelunasan tunggakan diselesaikan selambat-lambatnya 3x24 jam sejak surat ini diterbitkan.

Hormat kami,
Pengelola Kontrakan Buti`;

  const copySP = () => {
    navigator.clipboard.writeText(spTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const waUrl = generateWhatsAppLink(
    warning.no_hp,
    warning.nama_penyewa,
    warning.nama_kontrakan,
    warning.periode,
    warning.sisa_tagihan,
    warning.kategori
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className={`p-5 flex items-center justify-between text-white ${
          warning.kategori === 'High' ? 'bg-rose-600' : 'bg-amber-500'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-xl">
              {warning.kategori === 'High' ? <ShieldAlert className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-lg font-bold">Rekomendasi Tindakan & Mitigasi Risiko</h3>
              <p className="text-xs opacity-90">{warning.nama_penyewa} &bull; Unit {warning.kode_kontrakan} ({warning.nama_kontrakan})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 space-x-4">
          <button
            onClick={() => setActiveTab('detail')}
            className={`pb-3 text-sm font-semibold transition border-b-2 ${
              activeTab === 'detail'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Rincian Indikator Risiko
          </button>
          <button
            onClick={() => setActiveTab('sp')}
            className={`pb-3 text-sm font-semibold transition border-b-2 flex items-center space-x-1.5 ${
              activeTab === 'sp'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Draft Surat Peringatan (SP)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === 'detail' ? (
            <>
              {/* Score Highlight */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-xs text-slate-500 font-medium">Total Skor Risiko (S)</div>
                  <div className={`text-3xl font-extrabold mt-1 ${
                    warning.kategori === 'High' ? 'text-rose-600' : 'text-amber-600'
                  }`}>
                    {warning.riskScore}
                  </div>
                  <div className="text-xs font-semibold mt-0.5 text-slate-600">{warning.kategori} Risk</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-xs text-slate-500 font-medium">Sisa Tunggakan</div>
                  <div className="text-lg font-bold text-slate-800 mt-2">
                    {formatRupiah(warning.sisa_tagihan)}
                  </div>
                  <div className="text-xs text-slate-500">dari {formatRupiah(warning.harga_sewa_periode)}</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-xs text-slate-500 font-medium">Keterlambatan</div>
                  <div className="text-lg font-bold text-slate-800 mt-2">
                    {warning.breakdown?.lagDays || 0} Hari
                  </div>
                  <div className="text-xs text-slate-500">Jatuh Tempo: Tgl 5</div>
                </div>
              </div>

              {/* Formula Breakdown Cards */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                  <span>Komponen Formula:</span>
                  <code className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-xs">S = L + C + T</code>
                </h4>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <span className="font-semibold text-slate-800">1. Payment Lag (L):</span>
                      <p className="text-xs text-slate-500">
                        {warning.breakdown?.lagDays <= 0 ? 'Tepat waktu (<= 0 hari)' : warning.breakdown?.lagDays <= 7 ? 'Terlambat 1 - 7 hari' : 'Terlambat > 7 hari'}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-slate-700 bg-white px-2.5 py-1 rounded border">
                      +{warning.breakdown?.L ?? 0}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <span className="font-semibold text-slate-800">2. Frekuensi Cicilan (C):</span>
                      <p className="text-xs text-slate-500">
                        {warning.breakdown?.C === 2 ? 'Pembayaran bertahap (>= 2 kali cicilan)' : 'Lunas sekaligus'}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-slate-700 bg-white px-2.5 py-1 rounded border">
                      +{warning.breakdown?.C ?? 0}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <span className="font-semibold text-slate-800">3. Status Tunggakan (T):</span>
                      <p className="text-xs text-slate-500">
                        {warning.breakdown?.T === 5 ? 'Menunggak lebih dari 1 bulan' : 'Tidak ada tunggakan berlarut'}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-slate-700 bg-white px-2.5 py-1 rounded border">
                      +{warning.breakdown?.T ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rekomendasi BI */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Rekomendasi Sistem BI</div>
                <div className="text-sm text-emerald-950 mt-1 font-medium leading-relaxed">
                  {warning.rekomendasi}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto border border-slate-800">
                {spTemplate}
              </div>
              <div className="flex items-center justify-end space-x-2">
                <button
                  onClick={copySP}
                  className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-medium flex items-center space-x-2 transition"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <FileText className="w-4 h-4" />}
                  <span>{copied ? 'Teks SP Tersalin!' : 'Salin Teks SP'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            No. HP: <span className="font-medium text-slate-700">{warning.no_hp || '-'}</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium transition"
            >
              Tutup
            </button>
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center space-x-2 shadow hover:shadow-md transition"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Kirim Pengingat WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { X, BookOpen, ShieldAlert, Receipt, Building2, Users, Wallet, FileBarChart, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';

export default function PanduanModal({ isOpen, onClose }) {
  const [activeSection, setActiveSection] = useState('ringkasan');

  if (!isOpen) return null;

  const sections = [
    { id: 'ringkasan', label: 'Ringkasan Sistem', icon: BookOpen },
    { id: 'ews', label: 'Early Warning System (EWS)', icon: ShieldAlert },
    { id: 'properti', label: 'Keterisian & Unit', icon: Building2 },
    { id: 'transaksi', label: 'Pembayaran & Cicilan', icon: Receipt },
    { id: 'biaya', label: 'Biaya & Pemeliharaan', icon: Wallet },
    { id: 'laporan', label: 'Laporan & Ekspor', icon: FileBarChart },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Panduan & Dokumentasi Sistem BI</h3>
              <p className="text-xs text-slate-500">Petunjuk operasional Sistem Business Intelligence Kontrakan Buti</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar Menu */}
          <div className="w-64 border-r border-slate-200 bg-slate-50/70 p-3 space-y-1 overflow-y-auto hidden sm:block">
            {sections.map(sec => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition text-left ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="flex-1 truncate">{sec.label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/70" />}
                </button>
              );
            })}
          </div>

          {/* Main Detail Area */}
          <div className="flex-1 p-6 overflow-y-auto text-slate-700 text-sm leading-relaxed space-y-4">
            {activeSection === 'ringkasan' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h4 className="text-lg font-bold text-slate-800">Sistem Business Intelligence Kontrakan Buti</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Aplikasi cerdas berbasis data untuk memantau performa keuangan, risiko keterlambatan sewa, dan efisiensi operasional kos/kontrakan.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                    <h5 className="font-bold text-slate-800 text-xs flex items-center space-x-1.5 mb-1.5">
                      <ShieldAlert className="w-4 h-4 text-emerald-600" />
                      <span>Mitigasi Risiko Finansial</span>
                    </h5>
                    <p className="text-xs text-slate-600 leading-normal">
                      Algoritma pendeteksi dini (EWS) menghitung skor risiko keterlambatan bayar sewa berdasarkan tren historis.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                    <h5 className="font-bold text-slate-800 text-xs flex items-center space-x-1.5 mb-1.5">
                      <FileBarChart className="w-4 h-4 text-indigo-600" />
                      <span>Transparansi Laba Bersih</span>
                    </h5>
                    <p className="text-xs text-slate-600 leading-normal">
                      Pencatatan pendapatan sewa dikurangi biaya perawatan fasilitas secara riil untuk analisis laba kotor vs bersih.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'ews' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h4 className="text-lg font-bold text-slate-800">Early Warning System (EWS)</h4>
                  <p className="text-xs text-slate-500 mt-1">Klasifikasi risiko penyewa untuk mencegah kerugian piutang.</p>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800">
                    <span className="font-bold block mb-1">🔴 Risiko Tinggi (High Risk / Kritis)</span>
                    Penyewa menunggak penuh lebih dari 15 hari atau memiliki frekuensi telat kronis. Rekomendasi: Surat peringatan resmi & kunjungan langsung.
                  </div>
                  <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800">
                    <span className="font-bold block mb-1">🟡 Risiko Sedang (Medium Risk / Perhatian)</span>
                    Penyewa mencicil sewa atau lewat tanggal jatuh tempo 1-7 hari. Rekomendasi: Kirim pesan WhatsApp pengingat sopan.
                  </div>
                  <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800">
                    <span className="font-bold block mb-1">🟢 Risiko Rendah (Low Risk / Aman)</span>
                    Pembayaran lunas tepat waktu sebelum tanggal 5 setiap bulan.
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'properti' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h4 className="text-lg font-bold text-slate-800">Manajemen Unit Properti & Keterisian</h4>
                  <p className="text-xs text-slate-500 mt-1">Mengelola 10 kamar/unit kontrakan, tarif bulanan, dan status fisik.</p>
                </div>
                <ul className="space-y-2 text-xs text-slate-600 list-disc list-inside">
                  <li><strong>Status Terisi:</strong> Unit terikat dengan penyewa aktif yang belum mencapai tanggal keluar aktual.</li>
                  <li><strong>Status Kosong:</strong> Unit siap disewakan atau dalam masa pembersihan/perbaikan.</li>
                  <li><strong>Pencarian Cepat di Header:</strong> Anda dapat mengetik kode unit (misal: <code>L1-DPN-01</code>) untuk langsung melihat detail kamar.</li>
                </ul>
              </div>
            )}

            {activeSection === 'transaksi' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h4 className="text-lg font-bold text-slate-800">Alur Transaksi & Pencatatan Cicilan</h4>
                  <p className="text-xs text-slate-500 mt-1">Format fleksibel untuk pembayaran tunai, transfer, dan cicilan 2 tahap.</p>
                </div>
                <div className="text-xs text-slate-600 space-y-2">
                  <p>1. <strong>Lunas:</strong> Penyewa membayar 100% biaya sewa untuk periode yang bersangkutan.</p>
                  <p>2. <strong>Cicil:</strong> Masukkan Cicilan 1. Sistem otomatis menghitung sisa tagihan yang belum dibayar.</p>
                  <p>3. <strong>Pelunasan Cicilan 2:</strong> Cukup edit transaksi dan masukkan Cicilan 2; jika total cicilan memenuhi harga sewa, status otomatis menjadi Lunas.</p>
                </div>
              </div>
            )}

            {activeSection === 'biaya' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h4 className="text-lg font-bold text-slate-800">Biaya Pemeliharaan & Beban Operasional</h4>
                  <p className="text-xs text-slate-500 mt-1">Mencatat pengeluaran perbaikan genteng bocor, pompa air, token bersama, dll.</p>
                </div>
                <p className="text-xs text-slate-600">
                  Setiap pengeluaran dikelompokkan ke unit spesifik atau pengeluaran umum (Fasilitas Bersama). Data ini langsung memotong laba bruto di menu Laporan Keuangan.
                </p>
              </div>
            )}

            {activeSection === 'laporan' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h4 className="text-lg font-bold text-slate-800">Ekspor Laporan & Dokumen Audit</h4>
                  <p className="text-xs text-slate-500 mt-1">Unduh rekapitulasi data keuangan dalam format Excel (.xlsx) atau CSV.</p>
                </div>
                <p className="text-xs text-slate-600">
                  Gunakan menu <strong>Laporan</strong> untuk melihat grafik laba/rugi bulanan dan unduh laporan komprehensif untuk pemilik kontrakan.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
}

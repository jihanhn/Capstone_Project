import React, { useState, useEffect } from 'react';
import { Download, Printer, Calendar, FileText, CheckCircle2, Clock, AlertCircle, Receipt, Wallet, Building } from 'lucide-react';
import { formatRupiah, formatTanggal } from '../utils/formatters';
import { showToast } from '../utils/toast';

export default function LaporanView() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = String(today.getMonth() + 1).padStart(2, '0');

  // Mode Laporan: 'tagihan' (Basis Akrual / Tagihan & Piutang) | 'kas' (Basis Kas / Arus Kas Masuk & Rekonsiliasi Bank)
  const [basisMode, setBasisMode] = useState('tagihan');

  // Filters State
  const [filterPeriode, setFilterPeriode] = useState(`${currentYear}-${currentMonth}`);
  const [filterTahun, setFilterTahun] = useState(currentYear.toString());
  const [allYear, setAllYear] = useState(false);

  // Data State
  const [dataTagihan, setDataTagihan] = useState([]);
  const [dataKas, setDataKas] = useState({ total_kas_masuk: 0, total_transaksi_kas: 0, rekap_metode: {}, data: [] });
  const [loading, setLoading] = useState(true);

  // Menghasilkan daftar tahun secara otomatis (dari 5 tahun lalu hingga 5 tahun ke depan)
  const yearList = Array.from(new Array(11), (val, index) => currentYear + 5 - index);

  const fetchLaporan = async () => {
    setLoading(true);
    try {
      if (basisMode === 'tagihan') {
        let url = `/api/transaksi?`;
        if (!allYear && filterPeriode) {
          url += `periode=${filterPeriode}&`;
        }
        const res = await fetch(url);
        let items = await res.json();

        if (allYear) {
          items = items.filter(t => t.periode_bulan_tahun.startsWith(filterTahun));
        }

        setDataTagihan(items || []);
      } else {
        // Fetch Arus Kas Masuk Fisik
        let url = `/api/transaksi/arus-kas?`;
        if (allYear) {
          url += `tahun=${filterTahun}&`;
        } else if (filterPeriode) {
          url += `periode=${filterPeriode}&`;
        }
        const res = await fetch(url);
        const kasResult = await res.json();
        setDataKas(kasResult || { total_kas_masuk: 0, total_transaksi_kas: 0, rekap_metode: {}, data: [] });
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Gagal memuat data laporan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLaporan();
  }, [basisMode, filterPeriode, filterTahun, allYear]);

  // Agregasi Basis Akrual
  const totalPotensi = dataTagihan.reduce((acc, curr) => acc + (curr.harga_sewa_periode || 0), 0);
  const totalRealisasi = dataTagihan.reduce((acc, curr) => acc + (curr.total_terbayar || 0), 0);
  const totalDefisit = Math.max(0, totalPotensi - totalRealisasi);
  const highRiskTotal = dataTagihan.filter(d => d.kategoriRisiko === 'High').length;

  const handleExportCsv = () => {
    let url = '/api/export/csv?';
    if (basisMode === 'kas') {
      url += 'basis=kas&';
    }
    if (allYear) {
      url += `tahun=${filterTahun}`;
    } else {
      url += `periode=${filterPeriode}`;
    }
    showToast('info', `Laporan ${basisMode === 'kas' ? 'Arus Kas Masuk' : 'Tagihan & Piutang'} sedang diunduh dalam format CSV.`);
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Export Actions */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Pelaporan &amp; Rekonsiliasi Keuangan</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pemisahan akuntansi resmi: Laporan Tagihan/Piutang (Basis Akrual) dan Arus Kas Masuk Fisik (Basis Kas / Mutasi Bank)
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold flex items-center space-x-2 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Simpan PDF</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center space-x-2 shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            <span>Unduh CSV ({basisMode === 'kas' ? 'Arus Kas' : 'Tagihan'})</span>
          </button>
        </div>
      </div>

      {/* Basis Mode Switcher & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4 no-print">
        {/* Toggle Mode */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBasisMode('tagihan')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              basisMode === 'tagihan'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>1. Tagihan &amp; Piutang (Basis Akrual)</span>
          </button>
          <button
            onClick={() => setBasisMode('kas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              basisMode === 'kas'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>2. Arus Kas Masuk Riil (Basis Kas / Mutasi Bank)</span>
          </button>
        </div>

        {/* Filter Periode & Tahun */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="allYearCheck"
              checked={allYear}
              onChange={(e) => setAllYear(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="allYearCheck" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
              Rekap 1 Tahun Penuh
            </label>
          </div>

          {!allYear ? (
            <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                {basisMode === 'kas' ? 'Bulan Kas Masuk:' : 'Periode Tagihan:'}
              </span>
              <input
                type="month"
                value={filterPeriode}
                onChange={(e) => setFilterPeriode(e.target.value)}
                className="bg-transparent font-medium text-slate-800 outline-none w-36 cursor-pointer"
              />
            </div>
          ) : (
            <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Tahun:</span>
              <select
                value={filterTahun}
                onChange={(e) => setFilterTahun(e.target.value)}
                className="bg-transparent font-medium text-slate-800 outline-none w-36 cursor-pointer"
              >
                {yearList.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LAPORAN 1: BASIS AKRUAL (TAGIHAN & PIUTANG SEWA)                          */}
      {/* ========================================================================= */}
      {basisMode === 'tagihan' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6 print:border-none print:shadow-none print:p-0">
          <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block mb-1">
                Laporan Basis Akrual (Accrual Basis)
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900">REKAPITULASI TAGIHAN &amp; PIUTANG SEWA</h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Usaha Sewa Hunian Kontrakan Buti &bull; Periode:{' '}
                <span className="font-bold text-slate-800">{allYear ? `Tahun Penuh ${filterTahun}` : filterPeriode}</span>
              </p>
            </div>
            <div className="text-right text-xs text-slate-400">
              <div>Dicetak Pada: {new Date().toLocaleDateString('id-ID')}</div>
              <div className="font-semibold text-emerald-700">Kontrakan Buti BI System</div>
            </div>
          </div>

          {/* Ringkasan Finansial Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">Potensi Tagihan Sewa</div>
              <div className="text-lg font-bold text-slate-800 mt-1">{formatRupiah(totalPotensi)}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">Total Terbayar (Alokasi)</div>
              <div className="text-lg font-bold text-emerald-600 mt-1">{formatRupiah(totalRealisasi)}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">Sisa Piutang Menunggak</div>
              <div className="text-lg font-bold text-rose-600 mt-1">{formatRupiah(totalDefisit)}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">Penyewa High Risk</div>
              <div className="text-lg font-bold text-amber-600 mt-1">{highRiskTotal} Tagihan</div>
            </div>
          </div>

          {/* Tabel Rekapitulasi Tagihan */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Periode</th>
                  <th className="p-2.5">Unit</th>
                  <th className="p-2.5">Nama Penyewa</th>
                  <th className="p-2.5">Tarif Sewa</th>
                  <th className="p-2.5">Terbayar</th>
                  <th className="p-2.5">Sisa Piutang</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Transaksi Terakhir</th>
                  <th className="p-2.5">Risk Score</th>
                  <th className="p-2.5">Kategori</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {dataTagihan.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="p-6 text-center text-slate-400">Tidak ada data tagihan untuk periode ini.</td>
                  </tr>
                ) : (
                  dataTagihan.map((item) => (
                    <tr key={item.id_transaksi} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono">{item.periode_bulan_tahun}</td>
                      <td className="p-2.5 font-semibold">{item.kode_kontrakan}</td>
                      <td className="p-2.5 font-medium">{item.nama_penyewa}</td>
                      <td className="p-2.5">{formatRupiah(item.harga_sewa_periode)}</td>
                      <td className="p-2.5 font-semibold text-emerald-700">{formatRupiah(item.total_terbayar)}</td>
                      <td className="p-2.5 text-rose-600 font-semibold">{formatRupiah(item.sisa_tagihan)}</td>
                      <td className="p-2.5 font-semibold">{item.status_pembayaran}</td>
                      <td className="p-2.5">{formatTanggal(item.tgl_lunas || item.breakdown?.tglBayarTerakhir)}</td>
                      <td className="p-2.5 font-mono font-bold text-center">{item.riskScore}</td>
                      <td className="p-2.5">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase tracking-wide ${
                            item.kategoriRisiko === 'High'
                              ? 'bg-rose-100 text-rose-800'
                              : item.kategoriRisiko === 'Medium'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.kategoriRisiko}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Tanda Tangan Pembukuan */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="text-slate-500">Mengetahui,</div>
              <div className="font-bold text-slate-800 mt-16">Pengelola Kontrakan Buti</div>
            </div>
            <div>
              <div className="text-slate-500">Penanggung Jawab Keuangan,</div>
              <div className="font-bold text-slate-800 mt-16">(............................................)</div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LAPORAN 2: BASIS KAS (ARUS KAS MASUK FISIK / REKONSILIASI BANK)           */}
      {/* ========================================================================= */}
      {basisMode === 'kas' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6 print:border-none print:shadow-none print:p-0">
          <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded inline-block mb-1">
                Laporan Basis Kas (Cash Inflow Basis - Mutasi Rekening Bank)
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900">REKAPITULASI ARUS KAS MASUK &amp; REKONSILIASI BANK</h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Usaha Sewa Hunian Kontrakan Buti &bull; Uang Fisik Diterima:{' '}
                <span className="font-bold text-slate-800">{allYear ? `Tahun ${filterTahun}` : `Bulan ${filterPeriode}`}</span>
              </p>
            </div>
            <div className="text-right text-xs text-slate-400">
              <div>Dicetak Pada: {new Date().toLocaleDateString('id-ID')}</div>
              <div className="font-semibold text-emerald-700">Kontrakan Buti BI System</div>
            </div>
          </div>

          {/* Ringkasan Kas Masuk Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200">
              <div className="text-xs text-blue-700 font-semibold">Total Uang Fisik Masuk</div>
              <div className="text-2xl font-black text-blue-900 mt-1">{formatRupiah(dataKas.total_kas_masuk)}</div>
              <div className="text-[11px] text-blue-600 mt-0.5">Wajib 100% klop dengan total kredit mutasi rekening bank</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500 font-semibold">Frekuensi Transaksi Kas</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{dataKas.total_transaksi_kas} Transaksi</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Termasuk cicilan partial payment &amp; pelunasan penuh</div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
              <div className="text-xs text-emerald-700 font-semibold">Status Rekonsiliasi Bank</div>
              <div className="text-base font-bold text-emerald-800 mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Tercatat Sesuai Tanggal Riil</span>
              </div>
              <div className="text-[11px] text-emerald-700 mt-0.5">Cicilan tagihan lampau dicatat pada bulan uang masuk</div>
            </div>
          </div>

          {/* Breakdown Per Akun Bank / Metode */}
          {Object.keys(dataKas.rekap_metode || {}).length > 0 && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Rincian Arus Kas Berdasarkan Rekening Tujuan / Metode Pembayaran:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(dataKas.rekap_metode).map(([metode, total]) => (
                  <div key={metode} className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600 truncate mr-2" title={metode}>{metode}</span>
                    <span className="text-xs font-bold text-slate-900 shrink-0">{formatRupiah(total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabel Mutasi Kas Masuk */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Tanggal Uang Masuk</th>
                  <th className="p-2.5">Unit</th>
                  <th className="p-2.5">Nama Penyewa</th>
                  <th className="p-2.5">Nominal Diterima</th>
                  <th className="p-2.5">Rekening / Metode</th>
                  <th className="p-2.5">Alokasi Tagihan</th>
                  <th className="p-2.5">Keterangan / Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {dataKas.data.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-6 text-center text-slate-400">
                      Tidak ada arus kas masuk fisik yang tercatat pada rentang waktu ini.
                    </td>
                  </tr>
                ) : (
                  dataKas.data.map((item) => (
                    <tr key={item.id_pembayaran} className="hover:bg-slate-50">
                      <td className="p-2.5 font-semibold text-slate-800 whitespace-nowrap">
                        {formatTanggal(item.tanggal_bayar)}
                      </td>
                      <td className="p-2.5 font-bold text-slate-900">{item.kode_kontrakan}</td>
                      <td className="p-2.5 font-medium text-slate-800">{item.nama_penyewa}</td>
                      <td className="p-2.5 font-bold text-emerald-700 whitespace-nowrap">
                        {formatRupiah(item.nominal_bayar)}
                      </td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-semibold text-slate-700">
                          {item.metode_pembayaran || 'Transfer Bank'}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          Periode {item.untuk_periode_tagihan}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-500 italic max-w-xs truncate" title={item.catatan_bayar}>
                        {item.catatan_bayar || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Tanda Tangan Pembukuan */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="text-slate-500">Mengetahui,</div>
              <div className="font-bold text-slate-800 mt-16">Pengelola Kontrakan Buti</div>
            </div>
            <div>
              <div className="text-slate-500">Penanggung Jawab Keuangan / Kasir,</div>
              <div className="font-bold text-slate-800 mt-16">(............................................)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
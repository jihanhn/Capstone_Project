import React, { useState, useEffect } from 'react';
import { Download, Printer, Calendar, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { formatRupiah, formatTanggal } from '../utils/formatters';

export default function LaporanView() {
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonth, setSelectedMonth] = useState('09');
  const [allYear, setAllYear] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const periode = allYear ? '' : `${selectedYear}-${selectedMonth}`;

  const fetchLaporan = async () => {
    setLoading(true);
    try {
      let url = `/api/transaksi?`;
      if (!allYear && periode) {
        url += `periode=${periode}&`;
      }
      const res = await fetch(url);
      let items = await res.json();

      if (allYear) {
        items = items.filter(t => t.periode_bulan_tahun.startsWith(selectedYear));
      }

      setData(items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLaporan();
  }, [selectedYear, selectedMonth, allYear]);

  // Agregasi
  const totalPotensi = data.reduce((acc, curr) => acc + (curr.harga_sewa_periode || 0), 0);
  const totalRealisasi = data.reduce((acc, curr) => acc + (curr.total_terbayar || 0), 0);
  const totalDefisit = Math.max(0, totalPotensi - totalRealisasi);
  const highRiskTotal = data.filter(d => d.kategoriRisiko === 'High').length;

  const handleExportCsv = () => {
    let url = '/api/export/csv?';
    if (allYear) {
      url += `tahun=${selectedYear}`;
    } else {
      url += `periode=${periode}`;
    }
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const monthNames = [
    { num: '01', name: 'Januari' },
    { num: '02', name: 'Februari' },
    { num: '03', name: 'Maret' },
    { num: '04', name: 'April' },
    { num: '05', name: 'Mei' },
    { num: '06', name: 'Juni' },
    { num: '07', name: 'Juli' },
    { num: '08', name: 'Agustus' },
    { num: '09', name: 'September' },
    { num: '10', name: 'Oktober' },
    { num: '11', name: 'November' },
    { num: '12', name: 'Desember' },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Pelaporan &amp; Ekspor Rekapitulasi</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Unduh laporan keuangan, ringkasan risiko, dan cetak slip rekap bulanan/tahunan
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold flex items-center space-x-2 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Cetak PDF</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center space-x-2 shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            <span>Unduh CSV (Excel)</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-4 no-print">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="allYearCheck"
            checked={allYear}
            onChange={(e) => setAllYear(e.target.checked)}
            className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
          />
          <label htmlFor="allYearCheck" className="text-sm font-semibold text-slate-700 cursor-pointer">
            Rekap 1 Tahun Penuh
          </label>
        </div>

        {!allYear && (
          <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-sm">
            <span className="text-xs text-slate-500 font-medium">Bulan:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-medium text-slate-700 outline-none"
            >
              {monthNames.map((m) => (
                <option key={m.num} value={m.num}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-sm">
          <span className="text-xs text-slate-500 font-medium">Tahun:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-transparent font-medium text-slate-700 outline-none"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </div>
      </div>

      {/* Printable Report View */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6 print:border-none print:shadow-none print:p-0">
        <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">REKAPITULASI KEUANGAN &amp; RISIKO</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Usaha Sewa Hunian Kontrakan Buti &bull; Periode:{' '}
              <span className="font-bold text-slate-800">{allYear ? `Tahun Penuh ${selectedYear}` : periode}</span>
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
            <div className="text-xs text-slate-500 font-medium">Potensi Tagihan</div>
            <div className="text-lg font-bold text-slate-800 mt-1">{formatRupiah(totalPotensi)}</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500 font-medium">Total Realisasi</div>
            <div className="text-lg font-bold text-emerald-600 mt-1">{formatRupiah(totalRealisasi)}</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500 font-medium">Defisit (Gap Finansial)</div>
            <div className="text-lg font-bold text-rose-600 mt-1">{formatRupiah(totalDefisit)}</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500 font-medium">Penyewa High Risk</div>
            <div className="text-lg font-bold text-amber-600 mt-1">{highRiskTotal} Transaksi</div>
          </div>
        </div>

        {/* Tabel Rekapitulasi */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-2.5">Periode</th>
                <th className="p-2.5">Unit</th>
                <th className="p-2.5">Nama Penyewa</th>
                <th className="p-2.5">Tarif Sewa</th>
                <th className="p-2.5">Terbayar</th>
                <th className="p-2.5">Sisa</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5">Tgl Lunas</th>
                <th className="p-2.5">Risk Score</th>
                <th className="p-2.5">Kategori</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.map((item) => (
                <tr key={item.id_transaksi} className="hover:bg-slate-50">
                  <td className="p-2.5 font-mono">{item.periode_bulan_tahun}</td>
                  <td className="p-2.5 font-semibold">{item.kode_kontrakan}</td>
                  <td className="p-2.5 font-medium">{item.nama_penyewa}</td>
                  <td className="p-2.5">{formatRupiah(item.harga_sewa_periode)}</td>
                  <td className="p-2.5 font-semibold text-emerald-700">{formatRupiah(item.total_terbayar)}</td>
                  <td className="p-2.5 text-rose-600 font-semibold">{formatRupiah(item.sisa_tagihan)}</td>
                  <td className="p-2.5 font-semibold">{item.status_pembayaran}</td>
                  <td className="p-2.5">{formatTanggal(item.tgl_lunas)}</td>
                  <td className="p-2.5 font-mono font-bold">{item.riskScore}</td>
                  <td className="p-2.5">
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
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
              ))}
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
    </div>
  );
}

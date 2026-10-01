import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertOctagon,
  Home,
  AlertTriangle,
  Calendar,
  MessageSquare,
  Eye,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
  Building2, Clock, TrendingDown, Sparkles
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { formatRupiah, generateWhatsAppLink } from '../utils/formatters';
import MitigasiModal from './MitigasiModal';



export default function DashboardView() {
  // State Filter Periode
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonth, setSelectedMonth] = useState('09');

  const [stats, setStats] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [riskData, setRiskData] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWarning, setSelectedWarning] = useState(null);

  const periode = `${selectedYear}-${selectedMonth}`;

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, trendRes, riskRes, warnRes] = await Promise.all([
        fetch(`/api/dashboard/stats?periode=${periode}`),
        fetch(`/api/dashboard/trend?tahun=${selectedYear}`),
        fetch(`/api/dashboard/risk-distribution?periode=${periode}`),
        fetch(`/api/dashboard/early-warning?periode=${periode}`)
      ]);

      const statsJson = await statsRes.json();
      const trendJson = await trendRes.json();
      const riskJson = await riskRes.json();
      const warnJson = await warnRes.json();

      setStats(statsJson);
      setTrendData(trendJson.data || []);
      setRiskData(riskJson.distribution || []);
      setWarnings(warnJson.warnings || []);
    } catch (err) {
      console.error('Gagal mengambil data dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [periode, selectedYear]);

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
      {/* Top Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Executive BI Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Analitik Kinerja Finansial & Sistem Peringatan Dini Risiko Kontrakan Buti
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer"
            >
              {monthNames.map((m) => (
                <option key={m.num} value={m.num}>
                  {m.name}
                </option>
              ))}
            </select>

            <span className="text-slate-300">|</span>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          <button
            onClick={fetchDashboardData}
            title="Muat ulang data"
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 TOP KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Realisasi Pendapatan */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Realisasi Pendapatan
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900">
              {stats ? formatRupiah(stats.totalRealisasi) : '...'}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center">
              <span>Potensi: {stats ? formatRupiah(stats.totalPotensi) : '...'}</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
        </div>

        {/* Card 2: Financial Gap (Defisit) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Gap Finansial (Defisit)
            </span>
            <div className={`p-2 rounded-xl ${
              (stats?.gapFinansial || 0) > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'
            }`}>
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-extrabold ${
              (stats?.gapFinansial || 0) > 0 ? 'text-rose-600' : 'text-slate-900'
            }`}>
              {stats ? formatRupiah(stats.gapFinansial) : '...'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Selisih potensi & realisasi
            </div>
          </div>
          <div className={`absolute bottom-0 left-0 right-0 h-1 ${
            (stats?.gapFinansial || 0) > 0 ? 'bg-rose-500' : 'bg-slate-300'
          }`} />
        </div>

        {/* Card 3: Occupancy Rate */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tingkat Okupansi
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Home className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900">
              {stats ? `${stats.occupancyRate}%` : '...'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {stats ? `${stats.unitTerisi} dari ${stats.totalUnit} unit terisi` : '...'}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500" />
        </div>

        {/* Card 4: High Risk Tenants */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Penyewa High Risk
            </span>
            <div className={`p-2 rounded-xl ${
              (stats?.highRiskCount || 0) > 0 ? 'bg-amber-50 text-amber-600 animate-pulse' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-extrabold ${
              (stats?.highRiskCount || 0) > 0 ? 'text-amber-600' : 'text-slate-900'
            }`}>
              {stats ? `${stats.highRiskCount} Penyewa` : '...'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Skor risiko tinggi (S &ge; 5)
            </div>
          </div>
          <div className={`absolute bottom-0 left-0 right-0 h-1 ${
            (stats?.highRiskCount || 0) > 0 ? 'bg-amber-500' : 'bg-emerald-500'
          }`} />
        </div>
      </div>

      {/* CHARTS ROW (Line Chart & Donut Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart: Tren Pendapatan vs Potensi (2/3 width) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Tren Pendapatan vs Potensi ({selectedYear})</h3>
                <p className="text-xs text-slate-500">Perbandingan per bulan antara proyeksi potensi dan uang masuk</p>
              </div>
              <div className="flex items-center space-x-3 text-xs">
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-slate-600">Realisasi</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-slate-600">Potensi</span>
                </div>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="bulanSingkat" stroke="#94a3b8" fontSize={11} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(val) => `Rp ${(val / 1000000).toFixed(1)}M`}
                  />
                  <Tooltip
                    formatter={(value) => [formatRupiah(value), '']}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                      border: 'none'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="potensi"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Potensi Sewa"
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="realisasi"
                    stroke="#10b981"
                    strokeWidth={3}
                    name="Realisasi Masuk"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Donut Chart: Distribusi Kategori Risiko (1/3 width) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-800 text-base">Distribusi Risiko Penyewa</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">Periode: {periode}</p>

            <div className="h-56 w-full flex items-center justify-center">
              {riskData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                    >
                      {riskData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name, props) => [
                        `${val} Penyewa (${props.payload.percentage}%)`,
                        name
                      ]}
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px',
                        border: 'none'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-slate-400">Tidak ada data transaksi</div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-100 text-center">
              {riskData.map((r) => (
                <div key={r.name} className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 font-medium truncate">{r.name}</div>
                  <div className="text-base font-bold mt-0.5" style={{ color: r.color }}>
                    {r.count} <span className="text-xs font-normal">({r.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* EARLY WARNING SYSTEM (EWS) BOTTOM PANEL */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Early Warning System (EWS)</h3>
              <p className="text-xs text-slate-500">
                Penyewa terindikasi resiko keterlambatan, tunggakan, atau pembayaran cicilan (High &amp; Medium Risk)
              </p>
            </div>
          </div>
          <div className="text-xs font-semibold px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
            {warnings.length} Kasus Perlu Perhatian
          </div>
        </div>

        {warnings.length === 0 ? (
          <div className="p-10 text-center text-slate-400 flex flex-col items-center">
            <ShieldCheck className="w-12 h-12 text-emerald-500 mb-2" />
            <p className="text-sm font-semibold text-slate-700">Kondisi Finansial Aman</p>
            <p className="text-xs text-slate-500">Tidak ada penyewa dengan indikasi risiko tinggi/sedang pada periode ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Unit &amp; Penyewa</th>
                  <th className="px-4 py-3.5">Kategori &amp; Skor</th>
                  <th className="px-4 py-3.5">Sisa Tunggakan</th>
                  <th className="px-4 py-3.5">Indikator Komponen</th>
                  <th className="px-4 py-3.5">Rekomendasi Tindakan</th>
                  <th className="px-5 py-3.5 text-right">Aksi Mitigasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {warnings.map((w) => {
                  const waUrl = generateWhatsAppLink(
                    w.no_hp,
                    w.nama_penyewa,
                    w.nama_kontrakan,
                    w.periode,
                    w.sisa_tagihan,
                    w.kategori
                  );

                  return (
                    <tr key={w.id_transaksi} className="hover:bg-slate-50/80 transition">
                      {/* Unit & Penyewa */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-800">{w.nama_penyewa}</div>
                        <div className="text-xs text-slate-500 flex items-center space-x-1.5 mt-0.5">
                          <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {w.kode_kontrakan}
                          </span>
                          <span>&bull;</span>
                          <span>{w.nama_kontrakan}</span>
                        </div>
                      </td>

                      {/* Kategori & Skor */}
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
                              w.kategori === 'High'
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : 'bg-amber-100 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {w.kategori} Risk
                          </span>
                          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            Skor: {w.riskScore}
                          </span>
                        </div>
                      </td>

                      {/* Sisa Tunggakan */}
                      <td className="px-4 py-4">
                        <div className="font-bold text-rose-600">{formatRupiah(w.sisa_tagihan)}</div>
                        <div className="text-xs text-slate-500">
                          Terbayar: {formatRupiah(w.total_terbayar)}
                        </div>
                      </td>

                      {/* Indikator Komponen */}
                      <td className="px-4 py-4 text-xs space-y-1">
                        <div className="flex items-center space-x-1">
                          <span className="text-slate-500">Lag (L):</span>
                          <span className="font-semibold text-slate-700">
                            {w.breakdown?.lagDays} hari (+{w.breakdown?.L})
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-slate-500">Cicilan (C):</span>
                          <span className="font-semibold text-slate-700">+{w.breakdown?.C}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-slate-500">Tunggakan (T):</span>
                          <span className="font-semibold text-slate-700">+{w.breakdown?.T}</span>
                        </div>
                      </td>

                      {/* Rekomendasi */}
                      <td className="px-4 py-4 max-w-xs">
                        <p className="text-xs text-slate-700 font-medium line-clamp-2 leading-relaxed">
                          {w.rekomendasi}
                        </p>
                      </td>

                      {/* Aksi Mitigasi */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setSelectedWarning(w)}
                            title="Lihat Detail & Draft SP"
                            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="Kirim pesan peringatan WhatsApp"
                            className="p-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-sm flex items-center space-x-1 text-xs font-semibold"
                          >
                            <MessageSquare className="w-4 h-4" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          
        )}
      </div>

      

      {/* MODAL MITIGASI & DRAFT SP */}
      {selectedWarning && (
        <MitigasiModal
          warning={selectedWarning}
          onClose={() => setSelectedWarning(null)}
        />
      )}
    </div>
    
  );
  
}

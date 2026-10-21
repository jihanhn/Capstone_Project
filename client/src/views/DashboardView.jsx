import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShieldAlert,
  BedDouble,
  Key,
  DoorClosed,
  AlertCircle,
  ShieldCheck,
  Eye,
  MessageSquare,
  Copy,
  Check,
  Megaphone,
  Sparkles,
  DollarSign,
  Wallet,
  ArrowRight
} from 'lucide-react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { formatRupiah, generateWhatsAppLink } from '../utils/formatters';
import MitigasiModal from '../components/modals/MitigasiModal';
import VacancyLossModal from '../components/modals/VacancyLossModal';
import { showToast } from '../utils/toast';

export default function DashboardView() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());

  const [stats, setStats] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [kapasitasPenuhBulan, setKapasitasPenuhBulan] = useState(0);

  // EWS Tunggakan State
  const [warningsList, setWarningsList] = useState([]);
  const [selectedWarning, setSelectedWarning] = useState(null);
  const [ewsTab, setEwsTab] = useState('all'); // 'all' | 'tunggakan' | 'riwayat'

  // EWS Vacancy Loss State
  const [vacancyData, setVacancyData] = useState(null);
  const [selectedVacancyUnit, setSelectedVacancyUnit] = useState(null);
  const [copiedAdUnitId, setCopiedAdUnitId] = useState(null);

  const [loading, setLoading] = useState(true);

  const yearList = Array.from(new Array(11), (val, index) => currentYear + 5 - index);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [trendRes, unitRes, warnRes, biayaRes, vacancyRes] = await Promise.all([
        fetch(`/api/dashboard/trend?tahun=${selectedYear}`).then(r => r.json()).catch(() => ({ data: [], kapasitasPenuhPerBulan: 0 })),
        fetch(`/api/kontrakan`).then(r => r.json()).catch(() => []),
        fetch(`/api/dashboard/early-warning?tahun=${selectedYear}`).then(r => r.json()).catch(() => ({ warnings: [] })),
        fetch(`/api/biaya?tahun=${selectedYear}`).then(r => r.json()).catch(() => []),
        fetch(`/api/dashboard/vacancy-loss`).then(r => r.json()).catch(() => null)
      ]);

      const trends = trendRes.data || [];
      const units = unitRes || [];
      const warnings = warnRes.warnings || [];
      const biaya = biayaRes || [];

      // Kalkulasi Kapasitas Penuh (Seluruh Unit Terisi)
      const fullCapacityMonth = trendRes.kapasitasPenuhPerBulan || units.reduce((acc, u) => acc + (parseFloat(u.harga_saat_ini) || 0), 0);
      setKapasitasPenuhBulan(fullCapacityMonth);

      // Kalkulasi KPI
      const totalUnit = units.length;
      const unitTerisi = units.filter(u => u.status_unit === 'Terisi' || u.status_realtime === 'Terisi').length;
      const unitKosong = totalUnit - unitTerisi;
      const persenTerisi = totalUnit > 0 ? Math.round((unitTerisi / totalUnit) * 100) : 0;
      const persenKosong = totalUnit > 0 ? Math.round((unitKosong / totalUnit) * 100) : 0;

      // Akumulasi setahun
      const totalPotensi = fullCapacityMonth * 12; // Potensi jika seluruh unit terisi 100%
      const totalRealisasi = trends.reduce((sum, item) => sum + (item.realisasi || 0), 0);
      const totalBiaya = biaya.reduce((sum, item) => sum + (item.biaya || 0), 0);
      const totalLabaBersih = totalRealisasi - totalBiaya;
      const gapFinansial = Math.max(0, totalPotensi - totalRealisasi);
      const persenBiaya = totalRealisasi > 0 ? ((totalBiaya / totalRealisasi) * 100).toFixed(1) : 0;

      // Tunggakan Aktif
      const tunggakanAktif = warnings.reduce((sum, w) => sum + (parseFloat(w.sisa_tagihan) || 0), 0);
      const jumlahPenyewaNunggak = warnings.filter(w => (parseFloat(w.sisa_tagihan) || 0) > 0).length;

      // Skor Risiko
      const rataSkor = warnings.length > 0 
        ? Math.round(warnings.reduce((sum, w) => sum + (w.riskScore || w.score || 0), 0) / warnings.length) 
        : 0;

      let tingkatRisiko = 'Rendah';
      if (rataSkor >= 5 || warnings.some(w => w.kategori === 'High')) tingkatRisiko = 'Tinggi';
      else if (rataSkor >= 2 || warnings.some(w => w.kategori === 'Medium')) tingkatRisiko = 'Sedang';

      setStats({
        totalUnit, unitTerisi, unitKosong, persenTerisi, persenKosong,
        totalPotensi, totalRealisasi, totalBiaya, totalLabaBersih,
        tunggakanAktif, jumlahPenyewaNunggak, persenBiaya,
        gapFinansial, rataSkor, tingkatRisiko
      });

      setTrendData(trends);
      setWarningsList(warnings);
      setVacancyData(vacancyRes);

    } catch (err) {
      console.error('Gagal mengambil data dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedYear]);

  // Salin Iklan Promosi Unit Kosong
  const handleCopyAd = (unit) => {
    const hargaBulan = unit.harga_sewa_bulan || unit.harga_saat_ini || 850000;
    const adText = `🏠 DIKONTRAKKAN: Kamar Siap Huni - Kontrakan Buti (${unit.kode_kontrakan})
📍 Lingkungan tenang, aman, dan strategis
🛏️ Unit: ${unit.nama_kontrakan} (${unit.kode_kontrakan})
💰 Biaya Sewa: ${formatRupiah(hargaBulan)} / bulan
✨ Fasilitas: Kamar mandi dalam, listrik meteran mandiri, air sumur jernih 24 jam, parkir motor aman.
🎁 PROMO: Diskon khusus penyewa baru! Hubungi Pengelola: 0812-1234-5678 (WhatsApp)`;

    navigator.clipboard.writeText(adText);
    setCopiedAdUnitId(unit.kode_kontrakan);
    showToast('success', `Draf iklan promosi unit ${unit.kode_kontrakan} disalin ke clipboard!`);
    setTimeout(() => setCopiedAdUnitId(null), 2500);
  };

  // Data untuk Donut Chart Unit
  const unitChartData = [
    { name: 'Terisi', value: stats?.unitTerisi || 0, color: '#059669' },
    { name: 'Kosong', value: stats?.unitKosong || 0, color: '#E11D48' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* HEADER DASHBOARD */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Executive Dashboard</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitoring performa finansial, tren laba rugi, dan sistem peringatan dini (EWS) Kontrakan Buti
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 shadow-sm flex items-center space-x-2">
            <span>Tahun Laporan:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent outline-none cursor-pointer text-emerald-700 font-bold"
            >
              {yearList.map(y => (
                 <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button onClick={fetchDashboardData} className="p-2.5 bg-white shadow-sm border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition" title="Segarkan Data">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 8 KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* ROW 1 */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-500 mb-2">Total Unit Kamar</div>
          <div className="text-3xl font-extrabold text-slate-800">{stats?.totalUnit || 0}</div>
          <div className="text-xs text-slate-400 font-medium mt-1">unit hunian</div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-500 mb-2">Unit Terisi</div>
          <div className="text-3xl font-extrabold text-slate-800">{stats?.unitTerisi || 0}</div>
          <div className="text-xs text-emerald-600 font-bold mt-1">{stats?.persenTerisi || 0}% terisi</div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-500 mb-2">Unit Kosong (Vacancy)</div>
          <div className="text-3xl font-extrabold text-slate-800">{stats?.unitKosong || 0}</div>
          <div className="text-xs text-rose-600 font-bold mt-1">{stats?.persenKosong || 0}% tidak berpenghasilan</div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden">
          <div className="text-xs font-semibold text-slate-500 mb-2">Pendapatan Realisasi</div>
          <div className="text-2xl font-extrabold text-emerald-600">{stats ? formatRupiah(stats.totalRealisasi) : '...'}</div>
          <div className="text-[10px] text-slate-400 font-medium mt-1">Uang benar-benar masuk kas ({selectedYear})</div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-emerald-50 rounded-lg">
             <TrendingUp className="w-5 h-5 text-emerald-600 opacity-80" />
          </div>
        </div>

        {/* ROW 2 */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-rose-200 flex flex-col justify-between relative overflow-hidden">
          <div className="text-xs font-semibold text-slate-500 mb-2">Tunggakan Pembayaran</div>
          <div className="text-xl font-extrabold text-slate-800">{stats ? formatRupiah(stats.tunggakanAktif) : '...'}</div>
          <div className="text-xs text-rose-600 font-bold mt-1 flex items-center">
            {stats?.jumlahPenyewaNunggak || 0} penyewa menunggak
          </div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-500">
             <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-500 mb-2">Biaya Pemeliharaan</div>
          <div className="text-xl font-extrabold text-slate-800">{stats ? formatRupiah(stats.totalBiaya) : '...'}</div>
          <div className="text-[10px] text-slate-500 font-medium mt-1">{stats?.persenBiaya || 0}% dari penerimaan kas</div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-amber-200 flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-500 mb-2">Laba Bersih Operasional</div>
          <div className="text-xl font-extrabold text-amber-600">{stats ? formatRupiah(stats.totalLabaBersih) : '...'}</div>
          <div className="text-[10px] text-slate-400 font-medium mt-1 flex items-center">
             Realisasi dikurangi pemeliharaan
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden">
          <div className="text-xs font-semibold text-slate-500 mb-2">Tingkat Risiko Finansial</div>
          <div className={`text-xl font-extrabold ${stats?.tingkatRisiko === 'Tinggi' ? 'text-rose-600' : stats?.tingkatRisiko === 'Sedang' ? 'text-amber-600' : 'text-emerald-600'}`}>
            {stats?.tingkatRisiko || '...'}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1">Skor EWS Rata-rata: {stats?.rataSkor || 0}</div>
          <div className="absolute right-4 bottom-4 flex items-end space-x-0.5 opacity-80">
            <div className={`w-1.5 h-3 rounded-t ${stats?.tingkatRisiko !== 'Rendah' ? 'bg-amber-400' : 'bg-emerald-500'}`}></div>
            <div className={`w-1.5 h-5 rounded-t ${stats?.tingkatRisiko !== 'Rendah' ? 'bg-amber-400' : 'bg-slate-200'}`}></div>
            <div className={`w-1.5 h-7 rounded-t ${stats?.tingkatRisiko === 'Tinggi' ? 'bg-rose-500' : 'bg-slate-200'}`}></div>
          </div>
        </div>

      </div>

      {/* SECTION: TREN PENDAPATAN & KINERJA KEUANGAN EKSEKUTIF */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Grafik Tren Pendapatan vs Biaya vs Potensi vs Laba Bersih */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Tren Pendapatan & Kinerja Keuangan ({selectedYear})</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Komparasi potensi penuh (100% terisi), realisasi penerimaan, tunggakan sewa, biaya perawatan, dan laba bersih
                </p>
              </div>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 self-start sm:self-auto">
                Kapasitas Penuh: {formatRupiah(kapasitasPenuhBulan)}/bln
              </span>
            </div>

            {/* CHART GRAFIK */}
            <div className="h-72 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="bulanSingkat" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => `Rp ${(val / 1000000).toFixed(1)}Jt`}
                  />
                  <Tooltip 
                    formatter={(value, name) => [formatRupiah(value), name]}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                  />
                  <Legend 
                    iconType="circle" 
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} 
                  />
                  {/* Potensi Penuh (Garis Putus-putus Indigo) */}
                  <Line 
                    type="stepAfter" 
                    dataKey="potensi" 
                    name="Potensi Penuh (100% Terisi)" 
                    stroke="#6366F1" 
                    strokeWidth={2} 
                    strokeDasharray="4 4" 
                    dot={false}
                  />
                  {/* Realisasi Pendapatan (Bar Hijau) */}
                  <Bar dataKey="realisasi" name="Realisasi Pendapatan" fill="#059669" radius={[2, 2, 0, 0]} maxBarSize={14} />
                  {/* Tunggakan Sewa (Bar Merah/Rose) */}
                  <Bar dataKey="tunggakan" name="Tunggakan Sewa" fill="#E11D48" radius={[2, 2, 0, 0]} maxBarSize={14} />
                  {/* Biaya Pemeliharaan (Bar Slate) */}
                  <Bar dataKey="biaya" name="Biaya Pemeliharaan" fill="#64748B" radius={[2, 2, 0, 0]} maxBarSize={14} />
                  {/* Laba Bersih (Garis Tebal Amber) */}
                  <Line 
                    type="monotone" 
                    dataKey="labaBersih" 
                    name="Laba Bersih" 
                    stroke="#F59E0B" 
                    strokeWidth={2.5} 
                    dot={{ r: 3, fill: '#F59E0B', strokeWidth: 2, stroke: '#fff' }} 
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Donut Chart Status Unit Kamar */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-base mb-1">Status Unit Kamar</h3>
            <p className="text-xs text-slate-500 mb-4">Proporsi kamar berpenghuni vs kosong</p>
            
            <div className="h-44 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={unitChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    stroke="none"
                  >
                    {unitChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-800 leading-none">{stats?.totalUnit || 0}</span>
                <span className="text-xs text-slate-500 font-semibold mt-1">Total Kamar</span>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2.5 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 rounded bg-[#059669]" />
                <span className="text-slate-700 font-semibold">Kamar Terisi</span>
              </div>
              <div className="font-bold text-slate-800">
                {stats?.unitTerisi} <span className="text-slate-400 font-normal">({stats?.persenTerisi}%)</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 rounded bg-[#E11D48]" />
                <span className="text-slate-700 font-semibold">Kamar Kosong</span>
              </div>
              <div className="font-bold text-slate-800">
                {stats?.unitKosong} <span className="text-slate-400 font-normal">({stats?.persenKosong}%)</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* SECTION: EWS VACANCY LOSS (PERINGATAN DINI KERUGIAN UNIT KOSONG) */}
      <div className="space-y-4 pt-2">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 flex-shrink-0">
              <DoorClosed className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-800">EWS Vacancy Loss (Peringatan Dini Kerugian Kamar Kosong)</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800">
                  Opportunity Loss
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pemantauan unit kosong, kalkulasi kerugian pendapatan berjalan, dan strategi mitigasi agar kamar segera tersewa
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs font-bold px-3 py-1.5 rounded-xl border bg-rose-50 text-rose-700 border-rose-200">
              Kerugian: {formatRupiah(vacancyData?.total_kerugian_bulanan || 0)}/bulan
            </div>
            <div className="text-xs font-bold px-3 py-1.5 rounded-xl border bg-slate-100 text-slate-700 border-slate-200">
              {vacancyData?.total_unit_kosong || 0} Kamar Kosong
            </div>
          </div>
        </div>

        {/* BANNER REKAP KERUGIAN VACANCY */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Potensi Pendapatan Hilang
            </span>
            <div className="text-2xl font-black text-rose-600 mt-1">
              {formatRupiah(vacancyData?.total_kerugian_bulanan || 0)}
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Hilang per bulan ({vacancyData?.persen_potensi_hilang || 0}% dari kapasitas)
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Akumulasi Kerugian Berjalan
            </span>
            <div className="text-2xl font-black text-amber-600 mt-1">
              {formatRupiah(vacancyData?.total_kerugian_akumulasi || 0)}
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Total kerugian dari durasi kosong unit
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Peluang Pemulihan Kas
            </span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              +{formatRupiah(vacancyData?.total_kerugian_bulanan || 0)}
            </div>
            <span className="text-[11px] text-emerald-700 font-medium">
              Arus kas baru jika semua kamar terisi
            </span>
          </div>
        </div>

        {/* LIST KARTU UNIT KOSONG DENGAN REKOMENDASI BI */}
        {!vacancyData || vacancyData.vacancyList?.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center flex flex-col items-center">
            <ShieldCheck className="w-14 h-14 text-emerald-500 mb-3" />
            <h4 className="text-base font-bold text-slate-800">Okupansi Kamar Sempurna (100% Terisi)</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Seluruh kamar kontrakan saat ini dihuni penyewa. Tidak ada beban kerugian unit kosong (vacancy loss).
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vacancyData.vacancyList.map((unit) => {
              const isCopied = copiedAdUnitId === unit.kode_kontrakan;

              return (
                <div 
                  key={unit.kode_kontrakan}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between hover:shadow-md transition"
                >
                  <div>
                    {/* Header Unit Card */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                        {unit.kode_kontrakan}
                      </span>
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                        unit.tingkatRisiko?.includes('Kritis') 
                          ? 'bg-rose-50 text-rose-700 border-rose-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {unit.tingkatRisiko}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-800 text-sm">{unit.nama_kontrakan}</h4>
                    
                    {/* Metrics Kerugian */}
                    <div className="mt-3 bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Tarif Sewa:</span>
                        <span className="font-extrabold text-slate-800">{formatRupiah(unit.harga_sewa_bulan)}/bln</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Kerugian Harian:</span>
                        <span className="font-semibold text-rose-600">-{formatRupiah(unit.kerugian_harian)}/hari</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Durasi Kosong:</span>
                        <span className="font-bold text-slate-700">{unit.durasi_kosong_hari} hari</span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-200/80 flex justify-between items-center">
                        <span className="text-slate-600 font-bold">Total Kerugian:</span>
                        <span className="font-black text-rose-700">{formatRupiah(unit.total_kerugian_akumulasi)}</span>
                      </div>
                    </div>

                    {/* Rekomendasi Tindakan BI */}
                    <div className="mt-3.5">
                      <span className="text-[11px] font-bold text-emerald-800 flex items-center space-x-1 mb-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Rekomendasi Tindakan BI:</span>
                      </span>
                      <ul className="text-[11px] text-slate-600 space-y-1 list-disc list-inside bg-emerald-50/30 p-2.5 rounded-xl border border-emerald-100/60 leading-relaxed">
                        {(unit.rekomendasi || []).slice(0, 2).map((rek, idx) => (
                          <li key={idx} className="line-clamp-2">{rek}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Actions Button */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center space-x-2">
                    <button
                      onClick={() => handleCopyAd(unit)}
                      className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                        isCopied 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                      title="Salin teks iklan siap kirim ke WhatsApp / sosmed"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Iklan Tersalin!' : 'Salin Iklan'}</span>
                    </button>

                    <button
                      onClick={() => setSelectedVacancyUnit(unit)}
                      className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition flex items-center space-x-1 border border-emerald-200"
                    >
                      <span>Detail</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION: ANALISIS RISIKO FINANSIAL (EWS TUNGGAKAN) */}
      <div className="space-y-4 pt-2">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 flex-shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Analisis Risiko Finansial (Early Warning System Tunggakan)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sistem Peringatan Dini (EWS) untuk mendeteksi penyewa menunggak, cicilan macet, dan mitigasi hukum/penagihan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {warningsList.length > 0 && (
              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setEwsTab('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    ewsTab === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Semua ({warningsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setEwsTab('tunggakan')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                    ewsTab === 'tunggakan' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-rose-600'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${ewsTab === 'tunggakan' ? 'bg-white' : 'bg-rose-500'}`} />
                  <span>Tunggakan Aktif ({warningsList.filter(w => (parseFloat(w.sisa_tagihan) || 0) > 0).length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEwsTab('riwayat')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    ewsTab === 'riwayat' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Riwayat Telat ({warningsList.filter(w => (parseFloat(w.sisa_tagihan) || 0) <= 0).length})
                </button>
              </div>
            )}

            <div className={`text-xs font-bold px-3.5 py-1.5 rounded-xl border flex items-center space-x-2 self-start md:self-auto ${
              warningsList.length > 0 
                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              <span>{warningsList.length} Kasus Membutuhkan Perhatian</span>
            </div>
          </div>
        </div>

        {/* Tabel Kasus Risiko atau Kondisi Aman */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">Memuat data analisis risiko EWS...</div>
          ) : warningsList.length === 0 ? (
            <div className="p-14 text-center text-slate-400 flex flex-col items-center">
              <ShieldCheck className="w-14 h-14 text-emerald-500 mb-3" />
              <p className="text-base font-bold text-slate-800">Kondisi Finansial Aman</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Sistem tidak mendeteksi penyewa dengan indikasi risiko tinggi atau sedang pada periode ini. Semua pembayaran berjalan lancar.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-4">Unit &amp; Penyewa</th>
                    <th className="px-4 py-4">Kategori &amp; Skor</th>
                    <th className="px-4 py-4">Sisa Tunggakan</th>
                    <th className="px-4 py-4">Indikator Komponen</th>
                    <th className="px-4 py-4">Rekomendasi Tindakan BI</th>
                    <th className="px-5 py-4 text-right">Aksi Mitigasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {warningsList
                    .filter(w => {
                      if (ewsTab === 'tunggakan') return (parseFloat(w.sisa_tagihan) || 0) > 0;
                      if (ewsTab === 'riwayat') return (parseFloat(w.sisa_tagihan) || 0) <= 0;
                      return true;
                    })
                    .map((w) => {
                    const waUrl = generateWhatsAppLink(
                      w.no_hp, w.nama_penyewa, w.nama_kontrakan, w.periode, w.sisa_tagihan, w.kategori, w.breakdown?.lagDays, w.dueDay || w.breakdown?.dueDay
                    );

                    return (
                      <tr key={w.id_transaksi} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-800">{w.nama_penyewa}</div>
                          <div className="text-xs text-slate-500 flex items-center space-x-1.5 mt-0.5">
                            <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">{w.kode_kontrakan}</span>
                            <span>&bull;</span><span>{w.nama_kontrakan}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col space-y-1.5 items-start">
                            <span className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wide ${
                              w.kategori === 'High' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
                            }`}>
                              {w.kategori} Risk
                            </span>
                            <span className="text-[11px] font-bold text-slate-600">Total Skor: {w.riskScore}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-rose-600 text-base">{formatRupiah(w.sisa_tagihan)}</div>
                          <div className="text-[11px] text-slate-500 font-medium">Terbayar: {formatRupiah(w.total_terbayar)}</div>
                        </td>
                        <td className="px-4 py-4 text-xs space-y-1">
                          <div className="flex items-center space-x-1">
                            <span className="text-slate-500">Lag (L):</span>
                            <span className="font-semibold text-slate-700">{w.breakdown?.lagDays} hari (+{w.breakdown?.L})</span>
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
                        <td className="px-4 py-4 max-w-xs">
                          <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                            {w.rekomendasi}
                          </p>
                        </td>
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
                              href={waUrl} target="_blank" rel="noreferrer"
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
      </div>

      {/* MITIGASI MODAL POPUP */}
      {selectedWarning && (
        <MitigasiModal warning={selectedWarning} onClose={() => setSelectedWarning(null)} />
      )}

      {/* VACANCY LOSS MODAL POPUP */}
      {selectedVacancyUnit && (
        <VacancyLossModal unit={selectedVacancyUnit} onClose={() => setSelectedVacancyUnit(null)} />
      )}

    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Wallet, 
  Trash2, 
  AlertCircle, 
  X, 
  Wrench, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Building2, 
  Calendar, 
  DollarSign,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { formatRupiah, formatTanggal } from '../utils/formatters';
import { showToast } from '../utils/toast';

export default function BiayaView() {
  const [biayaList, setBiayaList] = useState([]);
  const [kontrakanList, setKontrakanList] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
  
  const [filterPeriode, setFilterPeriode] = useState(`${currentYear}-${currentMonth}`);
  const [filterKategori, setFilterKategori] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'Sedang Dikerjakan' | 'Selesai'

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  const [formData, setFormData] = useState({
    tanggal_pengeluaran: new Date().toISOString().split('T')[0],
    kategori: 'Perbaikan Gedung/Fasilitas',
    deskripsi: '',
    biaya: '',
    sumber_dana: 'Kas Sewa',
    kode_kontrakan: '',
    keterangan: '',
    status_pengerjaan: 'Sedang Dikerjakan'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/api/biaya?`;
      if (filterPeriode) {
        const [year, month] = filterPeriode.split('-');
        url += `tahun=${year}&`; 
      }
      if (filterKategori) url += `kategori=${encodeURIComponent(filterKategori)}&`;
      if (filterStatus !== 'all') url += `status_pengerjaan=${encodeURIComponent(filterStatus)}&`;

      const [resBiaya, resUnit] = await Promise.all([
        fetch(url),
        fetch('/api/kontrakan')
      ]);

      let dataBiaya = await resBiaya.json();
      const dataUnit = await resUnit.json();
      
      if (filterPeriode && Array.isArray(dataBiaya) && dataBiaya.length > 0) {
        dataBiaya = dataBiaya.filter(b => b.tanggal_pengeluaran && b.tanggal_pengeluaran.startsWith(filterPeriode));
      }

      setBiayaList(dataBiaya || []);
      setKontrakanList(dataUnit || []);
    } catch (err) {
      console.error(err);
      showToast('error', 'Gagal memuat data biaya & pemeliharaan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterPeriode, filterKategori, filterStatus]);

  const openCreateModal = () => {
    setFormData({
      tanggal_pengeluaran: new Date().toISOString().split('T')[0],
      kategori: 'Perbaikan Gedung/Fasilitas',
      deskripsi: '',
      biaya: '',
      sumber_dana: 'Kas Sewa',
      kode_kontrakan: '',
      keterangan: '',
      status_pengerjaan: 'Sedang Dikerjakan'
    });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const res = await fetch('/api/biaya', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan data pengeluaran');

      setIsModalOpen(false);
      fetchData();
      showToast(
        'success',
        formData.status_pengerjaan === 'Sedang Dikerjakan'
          ? 'Tindakan pemeliharaan dicatat sebagai Sedang Dikerjakan & diproteksi dari EWS Vacancy!'
          : 'Catatan pengeluaran pemeliharaan berhasil disimpan!'
      );
    } catch (err) {
      setErrorMessage(err.message);
      showToast('error', err.message || 'Gagal menyimpan data pengeluaran');
    }
  };

  // Toggle status pengerjaan (Sedang Dikerjakan <-> Selesai)
  const handleToggleStatus = async (item) => {
    const nextStatus = item.status_pengerjaan === 'Sedang Dikerjakan' ? 'Selesai' : 'Sedang Dikerjakan';
    setTogglingId(item.id_pengeluaran);

    try {
      const res = await fetch(`/api/biaya/${item.id_pengeluaran}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_pengerjaan: nextStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui status pengerjaan');

      showToast(
        'success', 
        nextStatus === 'Selesai'
          ? `Pemeliharaan "${item.deskripsi}" ditandai Selesai. Status unit otomatis diselaraskan.`
          : `Pemeliharaan "${item.deskripsi}" diaktifkan kembali (Sedang Dikerjakan).`
      );
      fetchData();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus catatan pemeliharaan ini? Jika berstatus Sedang Dikerjakan, status unit akan dievaluasi ulang.')) return;
    try {
      await fetch(`/api/biaya/${id}`, { method: 'DELETE' });
      fetchData();
      showToast('success', 'Catatan pemeliharaan berhasil dihapus.');
    } catch (err) {
      showToast('error', 'Gagal menghapus: ' + err.message);
    }
  };

  // Kalkulasi Metrik Ringkasan
  const totalBiaya = biayaList.reduce((acc, curr) => acc + (parseFloat(curr.biaya) || 0), 0);
  const sedangDikerjakanList = biayaList.filter(b => b.status_pengerjaan === 'Sedang Dikerjakan');
  const selesaiList = biayaList.filter(b => b.status_pengerjaan === 'Selesai');
  const countSedangDikerjakan = sedangDikerjakanList.length;
  const countSelesai = selesaiList.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* HEADER SECTION */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-800">Manajemen Biaya & Pemeliharaan</h2>
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              EWS Protected
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola tindakan perawatan fisik unit, pengeluaran operasional, serta integrasi proteksi kerugian kamar kosong (Vacancy Loss)
          </p>
        </div>

        <button 
          onClick={openCreateModal} 
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center justify-center space-x-2 shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Pemeliharaan / Biaya</span>
        </button>
      </div>

      {/* 3 HIGHLIGHT METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Biaya Periode Ini</span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600">
            {formatRupiah(totalBiaya)}
          </div>
          <span className="text-[11px] text-slate-400 font-medium mt-1">
            {biayaList.length} transaksi tercatat pada periode ini
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sedang Dikerjakan</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <div className="text-2xl font-black text-amber-600">{countSedangDikerjakan}</div>
            <span className="text-xs font-semibold text-amber-700">Tindakan Aktif</span>
          </div>
          <span className="text-[11px] text-amber-800 font-medium mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600 inline" />
            <span>Unit otomatis bebas beban EWS Vacancy Loss</span>
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pekerjaan Selesai</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <div className="text-2xl font-black text-emerald-600">{countSelesai}</div>
            <span className="text-xs font-semibold text-slate-500">Tuntas</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium mt-1">
            Unit siap huni kembali atau normal berpenghuni
          </span>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="w-full sm:w-48">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Periode Bulan</label>
            <input
              type="month"
              value={filterPeriode}
              onChange={(e) => setFilterPeriode(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div className="w-full sm:w-56">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Kategori Biaya</label>
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="">Semua Kategori</option>
              <option value="Perbaikan Gedung/Fasilitas">Perbaikan Gedung/Fasilitas</option>
              <option value="Listrik/Air Bersama">Listrik/Air Bersama</option>
              <option value="Kebersihan & Keamanan">Kebersihan & Keamanan</option>
            </select>
          </div>
        </div>

        {/* Filter Tab Status Pengerjaan */}
        <div className="w-full md:w-auto flex items-center justify-end">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 w-full md:w-auto">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex-1 md:flex-initial ${
                filterStatus === 'all'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Semua ({biayaList.length})
            </button>
            <button
              onClick={() => setFilterStatus('Sedang Dikerjakan')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 flex-1 md:flex-initial ${
                filterStatus === 'Sedang Dikerjakan'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-amber-700 hover:bg-amber-100/60'
              }`}
            >
              <Wrench className="w-3 h-3" />
              <span>Sedang Dikerjakan ({countSedangDikerjakan})</span>
            </button>
            <button
              onClick={() => setFilterStatus('Selesai')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 flex-1 md:flex-initial ${
                filterStatus === 'Selesai'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:bg-emerald-100/60'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Selesai ({countSelesai})</span>
            </button>
          </div>
        </div>
      </div>

      {/* TABEL DATA PEMELIHARAAN */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Tanggal</th>
                <th className="px-4 py-3.5">Kategori</th>
                <th className="px-4 py-3.5">Deskripsi Pekerjaan</th>
                <th className="px-4 py-3.5">Unit Terkait</th>
                <th className="px-4 py-3.5">Biaya</th>
                <th className="px-4 py-3.5">Status Pengerjaan</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {biayaList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                    <div className="max-w-sm mx-auto space-y-1">
                      <div className="font-semibold text-slate-600">Tidak ada catatan pemeliharaan</div>
                      <p className="text-xs text-slate-400">Belum ada data pengeluaran untuk kriteria filter periode yang dipilih.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                biayaList.map((b) => {
                  const isSedangDikerjakan = b.status_pengerjaan === 'Sedang Dikerjakan';
                  const isToggling = togglingId === b.id_pengeluaran;

                  return (
                    <tr key={b.id_pengeluaran} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-4 font-medium text-slate-700 whitespace-nowrap">
                        {formatTanggal(b.tanggal_pengeluaran)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          b.kategori === 'Perbaikan Gedung/Fasilitas' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          b.kategori === 'Listrik/Air Bersama' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {b.kategori}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-800">
                        <div className="font-semibold">{b.deskripsi}</div>
                        {b.sumber_dana && (
                          <div className="text-[11px] text-slate-400 mt-0.5">Sumber: {b.sumber_dana}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {b.kode_kontrakan ? (
                          <div className="space-y-1">
                            <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-xs font-bold text-slate-700">
                              {b.kode_kontrakan}
                            </span>
                            {isSedangDikerjakan && (
                              <div className="text-[10px] font-bold text-amber-700 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-amber-600" />
                                <span>Bebas Vacancy EWS</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="italic text-slate-400 text-xs">Fasilitas Umum</span>
                        )}
                      </td>
                      <td className="px-4 py-4 font-bold text-rose-600 whitespace-nowrap">
                        {formatRupiah(b.biaya)}
                      </td>

                      {/* INDIKATOR STATUS PENGERJAAN & QUICK ACTION */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(b)}
                            disabled={isToggling}
                            className={`px-3 py-1 rounded-lg text-xs font-extrabold flex items-center space-x-1.5 transition border shadow-2xs ${
                              isSedangDikerjakan
                                ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            }`}
                            title={`Klik untuk ubah status ke ${isSedangDikerjakan ? 'Selesai' : 'Sedang Dikerjakan'}`}
                          >
                            {isSedangDikerjakan ? (
                              <>
                                <Wrench className="w-3 h-3 text-amber-600 animate-spin" style={{ animationDuration: '3s' }} />
                                <span>Sedang Dikerjakan</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Selesai</span>
                              </>
                            )}
                          </button>

                          {/* Tombol Cepat Selesaikan Pengerjaan jika Sedang Dikerjakan */}
                          {isSedangDikerjakan && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(b)}
                              disabled={isToggling}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition flex items-center space-x-1"
                              title="Tandai pekerjaan ini telah selesai"
                            >
                              <span>Tandai Selesai</span>
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <button 
                          onClick={() => handleDelete(b.id_pengeluaran)} 
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" 
                          title="Hapus Catatan Pemeliharaan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL INPUT PENGELUARAN & PEMELIHARAAN BARU */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Catat Pemeliharaan / Pengeluaran</h3>
                <p className="text-xs text-slate-500 mt-0.5">Integrasi langsung ke status fisik unit dan Risk Engine EWS</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal *</label>
                  <input 
                    type="date" 
                    value={formData.tanggal_pengeluaran} 
                    onChange={(e) => setFormData({ ...formData, tanggal_pengeluaran: e.target.value })} 
                    required 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Estimasi / Nominal Biaya (Rp) *</label>
                  <input 
                    type="number" 
                    value={formData.biaya} 
                    onChange={(e) => setFormData({ ...formData, biaya: e.target.value })} 
                    required 
                    placeholder="Contoh: 150000" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Kategori Pengeluaran *</label>
                <select 
                  value={formData.kategori} 
                  onChange={(e) => setFormData({ ...formData, kategori: e.target.value })} 
                  required 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                >
                  <option value="Perbaikan Gedung/Fasilitas">Perbaikan Gedung/Fasilitas</option>
                  <option value="Listrik/Air Bersama">Listrik/Air Bersama</option>
                  <option value="Kebersihan & Keamanan">Kebersihan & Keamanan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Deskripsi Tindakan Pemeliharaan *</label>
                <input 
                  type="text" 
                  value={formData.deskripsi} 
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })} 
                  required 
                  placeholder="Contoh: Perbaikan atap bocor & cat ulang plafon" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* PILIHAN UNIT TERKAIT */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Unit Kontrakan Terkait</label>
                  <select
                    value={formData.kode_kontrakan}
                    onChange={(e) => setFormData({ ...formData, kode_kontrakan: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                  >
                    <option value="">-- Fasilitas Umum / Bersama --</option>
                    {kontrakanList.map((k) => (
                      <option key={k.kode_kontrakan} value={k.kode_kontrakan}>
                        {k.kode_kontrakan} - {k.nama_kontrakan} ({k.status_unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sumber Dana</label>
                  <select 
                    value={formData.sumber_dana} 
                    onChange={(e) => setFormData({ ...formData, sumber_dana: e.target.value })} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                  >
                    <option value="Kas Sewa">Kas Sewa (Dari Pendapatan)</option>
                    <option value="Modal Pribadi Pemilik">Modal Pribadi Pemilik</option>
                    <option value="Patungan Penyewa">Patungan Penyewa</option>
                  </select>
                </div>
              </div>

              {/* INDIKATOR STATUS PENGERJAAN & EWS INTEGRATION */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Status Pengerjaan Pemeliharaan *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`p-3 rounded-xl border flex items-center space-x-2.5 cursor-pointer transition ${
                    formData.status_pengerjaan === 'Sedang Dikerjakan'
                      ? 'bg-amber-50 border-amber-300 text-amber-900 ring-2 ring-amber-400/40'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}>
                    <input
                      type="radio"
                      name="status_pengerjaan"
                      value="Sedang Dikerjakan"
                      checked={formData.status_pengerjaan === 'Sedang Dikerjakan'}
                      onChange={(e) => setFormData({ ...formData, status_pengerjaan: e.target.value })}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1">
                        <Wrench className="w-3.5 h-3.5 text-amber-600" />
                        <span>Sedang Dikerjakan</span>
                      </div>
                      <div className="text-[10px] text-amber-700 mt-0.5">Proteksi EWS Vacancy Aktif</div>
                    </div>
                  </label>

                  <label className={`p-3 rounded-xl border flex items-center space-x-2.5 cursor-pointer transition ${
                    formData.status_pengerjaan === 'Selesai'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-2 ring-emerald-400/40'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}>
                    <input
                      type="radio"
                      name="status_pengerjaan"
                      value="Selesai"
                      checked={formData.status_pengerjaan === 'Selesai'}
                      onChange={(e) => setFormData({ ...formData, status_pengerjaan: e.target.value })}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Pekerjaan Selesai</span>
                      </div>
                      <div className="text-[10px] text-emerald-700 mt-0.5">Pekerjaan/pembelian tuntas</div>
                    </div>
                  </label>
                </div>

                {formData.status_pengerjaan === 'Sedang Dikerjakan' && (
                  <div className="mt-2.5 p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1 animate-in fade-in">
                    <div className="font-bold flex items-center gap-1.5 text-amber-950">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                      <span>Integrasi Risk Engine EWS Otomatis</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      {formData.kode_kontrakan
                        ? `Unit ${formData.kode_kontrakan} akan otomatis dikecualikan dari perhitungan kerugian kamar kosong (Opportunity Vacancy Loss) di Executive Dashboard selama status masih "Sedang Dikerjakan".`
                        : 'Pilih unit kontrakan terkait di atas agar Risk Engine EWS dapat memproteksi unit tersebut dari hitungan Opportunity Vacancy Loss.'}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow transition"
                >
                  Simpan Pemeliharaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
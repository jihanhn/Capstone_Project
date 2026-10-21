import React, { useState, useEffect } from 'react';
import { Plus, Wallet, Edit, Trash2, AlertCircle, X } from 'lucide-react';
import { formatRupiah, formatTanggal } from '../utils/formatters';
import { showToast } from '../utils/toast';

export default function BiayaView() {
  const [biayaList, setBiayaList] = useState([]);
  const [kontrakanList, setKontrakanList] = useState([]); // State baru untuk tarik data unit
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
  
  const [filterPeriode, setFilterPeriode] = useState(`${currentYear}-${currentMonth}`);
  const [filterKategori, setFilterKategori] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    tanggal_pengeluaran: new Date().toISOString().split('T')[0],
    kategori: 'Perbaikan Gedung/Fasilitas',
    deskripsi: '',
    biaya: '',
    sumber_dana: 'Kas Sewa',
    kode_kontrakan: '', // Akan diisi dari Dropdown
    keterangan: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/api/biaya?`;
      if (filterPeriode) {
        const [year, month] = filterPeriode.split('-');
        url += `tahun=${year}&`; 
      }
      if (filterKategori) url += `kategori=${filterKategori}&`;

      const [resBiaya, resUnit] = await Promise.all([
        fetch(url),
        fetch('/api/kontrakan') // Ambil data unit dari database
      ]);

      let dataBiaya = await resBiaya.json();
      const dataUnit = await resUnit.json();
      
      if (filterPeriode && dataBiaya.length > 0) {
        dataBiaya = dataBiaya.filter(b => b.tanggal_pengeluaran.startsWith(filterPeriode));
      }

      setBiayaList(dataBiaya || []);
      setKontrakanList(dataUnit || []); // Simpan data unit ke state
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterPeriode, filterKategori]);

  const openCreateModal = () => {
    setFormData({
      tanggal_pengeluaran: new Date().toISOString().split('T')[0],
      kategori: 'Perbaikan Gedung/Fasilitas',
      deskripsi: '',
      biaya: '',
      sumber_dana: 'Kas Sewa',
      kode_kontrakan: '',
      keterangan: ''
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
      showToast('success', 'Catatan pengeluaran pemeliharaan berhasil disimpan!');
    } catch (err) {
      setErrorMessage(err.message);
      showToast('error', err.message || 'Gagal menyimpan data pengeluaran');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus catatan pengeluaran ini? Tindakan ini akan memengaruhi kalkulasi Laba Bersih.')) return;
    try {
      await fetch(`/api/biaya/${id}`, { method: 'DELETE' });
      fetchData();
      showToast('success', 'Catatan pengeluaran berhasil dihapus.');
    } catch (err) {
      showToast('error', 'Gagal menghapus: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Biaya & Pemeliharaan</h2>
          <p className="text-xs text-slate-500 mt-0.5">Kelola pengeluaran operasional dan riwayat pemeliharaan</p>
        </div>
        <button onClick={openCreateModal} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center justify-center space-x-2 shadow-sm transition">
          <Plus className="w-4 h-4" /><span>Catat Biaya Baru</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1 w-full">
          <label className="block text-xs font-semibold text-slate-500 mb-1">Periode Bulan</label>
          <input
            type="month"
            value={filterPeriode}
            onChange={(e) => setFilterPeriode(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex-1 w-full">
          <label className="block text-xs font-semibold text-slate-500 mb-1">Kategori Pengeluaran</label>
          <select
            value={filterKategori}
            onChange={(e) => setFilterKategori(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Kategori</option>
            <option value="Perbaikan Gedung/Fasilitas">Perbaikan Gedung/Fasilitas</option>
            <option value="Listrik/Air Bersama">Listrik/Air Bersama</option>
            <option value="Kebersihan & Keamanan">Kebersihan & Keamanan</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Tanggal</th>
                <th className="px-4 py-3.5">Kategori</th>
                <th className="px-4 py-3.5">Deskripsi</th>
                <th className="px-4 py-3.5">Nominal Biaya</th>
                <th className="px-4 py-3.5">Unit Terkait</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {biayaList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-8 text-center text-slate-400">Tidak ada catatan pengeluaran untuk periode ini.</td>
                </tr>
              ) : (
                biayaList.map((b) => (
                  <tr key={b.id_pengeluaran} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-4 font-medium text-slate-700">{formatTanggal(b.tanggal_pengeluaran)}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                        b.kategori === 'Perbaikan Gedung/Fasilitas' ? 'bg-rose-100 text-rose-700' :
                        b.kategori === 'Listrik/Air Bersama' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {b.kategori}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-800">{b.deskripsi}</td>
                    <td className="px-4 py-4 font-bold text-rose-600">{formatRupiah(b.biaya)}</td>
                    <td className="px-4 py-4 text-slate-500 font-medium">
                      {b.kode_kontrakan ? (
                         <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-xs font-bold text-slate-600">{b.kode_kontrakan}</span>
                      ) : (
                         <span className="italic text-slate-400 text-xs">Fasilitas Umum</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => handleDelete(b.id_pengeluaran)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Hapus Biaya">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">Catat Pengeluaran Baru</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-200 text-slate-500"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /><span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal *</label>
                  <input type="date" value={formData.tanggal_pengeluaran} onChange={(e) => setFormData({ ...formData, tanggal_pengeluaran: e.target.value })} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nominal (Rp) *</label>
                  <input type="number" value={formData.biaya} onChange={(e) => setFormData({ ...formData, biaya: e.target.value })} required placeholder="Contoh: 150000" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Kategori *</label>
                <select value={formData.kategori} onChange={(e) => setFormData({ ...formData, kategori: e.target.value })} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800">
                  <option value="Perbaikan Gedung/Fasilitas">Perbaikan Gedung/Fasilitas</option>
                  <option value="Listrik/Air Bersama">Listrik/Air Bersama</option>
                  <option value="Kebersihan & Keamanan">Kebersihan & Keamanan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Deskripsi Singkat *</label>
                <input type="text" value={formData.deskripsi} onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })} required placeholder="Contoh: Ganti keran bocor" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                
                {/* TERHUBUNG KE DATA UNIT, BUKAN TEKS MANUAL */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Unit Terkait (Opsional)</label>
                  <select
                    value={formData.kode_kontrakan}
                    onChange={(e) => setFormData({ ...formData, kode_kontrakan: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                  >
                    <option value="">-- Fasilitas Umum --</option>
                    {kontrakanList.map((k) => (
                      <option key={k.kode_kontrakan} value={k.kode_kontrakan}>
                        {k.kode_kontrakan} - {k.nama_kontrakan}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sumber Dana</label>
                  <select value={formData.sumber_dana} onChange={(e) => setFormData({ ...formData, sumber_dana: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800">
                    <option value="Kas Sewa">Kas Sewa (Dari Pendapatan)</option>
                    <option value="Modal Pribadi Pemilik">Modal Pribadi Pemilik</option>
                    <option value="Patungan Penyewa">Patungan Penyewa</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 font-medium">Batal</button>
                <button type="submit" className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
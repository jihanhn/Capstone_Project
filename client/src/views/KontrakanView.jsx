import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, AlertCircle, X, BedDouble, Key, DoorClosed } from 'lucide-react';
import { formatRupiah } from '../utils/formatters';
import { showToast } from '../utils/toast';

export default function KontrakanView({ initialSearchQuery = '', onSearchClear }) {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter State
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);

  useEffect(() => {
    if (initialSearchQuery !== undefined) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({
    kode_kontrakan: '',
    nama_kontrakan: '',
    harga_saat_ini: '',
    status_unit: 'Terisi'
  });

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/kontrakan');
      const data = await res.json();
      setUnits(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const openCreateModal = () => {
    setIsEditMode(false);
    setFormData({
      kode_kontrakan: '',
      nama_kontrakan: '',
      harga_saat_ini: '',
      status_unit: 'Kosong'
    });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const openEditModal = (unit) => {
    setIsEditMode(true);
    setFormData({
      kode_kontrakan: unit.kode_kontrakan,
      nama_kontrakan: unit.nama_kontrakan,
      harga_saat_ini: unit.harga_saat_ini,
      status_unit: unit.status_unit
    });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const url = isEditMode ? `/api/kontrakan/${formData.kode_kontrakan}` : '/api/kontrakan';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan unit kontrakan');

      setIsModalOpen(false);
      fetchUnits();
      showToast('success', isEditMode ? `Unit ${formData.kode_kontrakan} berhasil diperbarui!` : `Unit baru ${formData.kode_kontrakan} berhasil ditambahkan!`);
    } catch (err) {
      setErrorMessage(err.message);
      showToast('error', err.message || 'Gagal menyimpan unit kontrakan');
    }
  };

  const handleDelete = async (kode) => {
    if (!confirm(`Hapus unit kontrakan ${kode}? Seluruh riwayat harga & transaksi unit ini akan terhapus.`)) return;
    try {
      await fetch(`/api/kontrakan/${kode}`, { method: 'DELETE' });
      fetchUnits();
      showToast('success', `Unit kontrakan ${kode} berhasil dihapus.`);
    } catch (err) {
      showToast('error', 'Gagal menghapus: ' + err.message);
    }
  };

  // Kalkulasi Metrik
  const totalUnit = units.length;
  const unitTerisi = units.filter(u => u.status_unit === 'Terisi').length;
  const unitKosong = units.filter(u => u.status_unit === 'Kosong').length;
  const persenTerisi = totalUnit > 0 ? Math.round((unitTerisi / totalUnit) * 100) : 0;
  const persenKosong = totalUnit > 0 ? Math.round((unitKosong / totalUnit) * 100) : 0;

  // Filter Data yang Tampil
  const displayedUnits = units.filter(u => {
    if (filterStatus !== 'Semua' && u.status_unit !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchKode = u.kode_kontrakan && u.kode_kontrakan.toLowerCase().includes(q);
      const matchNama = u.nama_kontrakan && u.nama_kontrakan.toLowerCase().includes(q);
      const matchPenyewa = (u.penyewa_terakhir && u.penyewa_terakhir.toLowerCase().includes(q)) || 
                           (u.nama_penyewa && u.nama_penyewa.toLowerCase().includes(q));
      return matchKode || matchNama || matchPenyewa;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Master Data Unit Kontrakan</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola data fisik unit, tarif sewa bulanan, dan status keterisian hunian
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center justify-center space-x-2 shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Unit Baru</span>
        </button>
      </div>

      {/* 3 HIGHLIGHT METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500">Total Unit</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <BedDouble className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-slate-800">
            {totalUnit}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500">Terisi</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Key className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <div className="text-3xl font-extrabold text-slate-800">{unitTerisi}</div>
            <div className="text-sm font-semibold text-slate-500">({persenTerisi}%)</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500">Kosong</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <DoorClosed className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <div className="text-3xl font-extrabold text-slate-800">{unitKosong}</div>
            <div className="text-sm font-semibold text-slate-500">({persenKosong}%)</div>
          </div>
        </div>
      </div>

      {/* FILTER BUTTONS & SEARCH BADGE */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterStatus('Semua')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              filterStatus === 'Semua'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Semua ({totalUnit})
          </button>
          <button
            onClick={() => setFilterStatus('Terisi')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              filterStatus === 'Terisi'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Terisi ({unitTerisi})
          </button>
          <button
            onClick={() => setFilterStatus('Kosong')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              filterStatus === 'Kosong'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Kosong ({unitKosong})
          </button>
        </div>

        {searchQuery && (
          <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-semibold animate-in fade-in">
            <span>Filter Unit: "{searchQuery}"</span>
            <button
              onClick={() => {
                setSearchQuery('');
                if (onSearchClear) onSearchClear();
              }}
              className="p-0.5 hover:bg-emerald-200/60 rounded-full transition"
              title="Hapus filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Grid of Cards */}
      {displayedUnits.length === 0 && !loading ? (
        <div className="p-10 bg-white rounded-2xl shadow-sm border border-slate-200 text-center text-slate-500 font-medium">
          Tidak ada unit yang sesuai dengan filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {displayedUnits.map((unit) => (
            <div
              key={unit.kode_kontrakan}
              className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                    {unit.kode_kontrakan}
                  </span>
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                      unit.status_unit === 'Terisi'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {unit.status_unit}
                  </span>
                </div>

                <h3 className="font-bold text-slate-800 text-base mt-3">{unit.nama_kontrakan}</h3>

                <div className="mt-3 text-xs text-slate-500">
                  <div className="mb-0.5">Penyewa Terakhir:</div>
                  {unit.penyewa_terakhir ? (
                    <div className="font-semibold text-slate-700">{unit.penyewa_terakhir}</div>
                  ) : (
                    <div className="italic text-slate-400">Belum ada penyewa</div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">Tarif Bulanan</div>
                  <div className="text-base font-bold text-slate-900">{formatRupiah(unit.harga_saat_ini)}</div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => openEditModal(unit)}
                    className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition"
                    title="Edit Unit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(unit.kode_kontrakan)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Hapus Unit"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">
                {isEditMode ? `Edit Unit ${formData.kode_kontrakan}` : 'Tambah Unit Kontrakan'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-200 text-slate-500">
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

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Kode Unit *</label>
                <input
                  type="text"
                  value={formData.kode_kontrakan}
                  onChange={(e) => setFormData({ ...formData, kode_kontrakan: e.target.value })}
                  disabled={isEditMode}
                  required
                  placeholder="Contoh: K1, K2, K1A"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Unit *</label>
                <input
                  type="text"
                  value={formData.nama_kontrakan}
                  onChange={(e) => setFormData({ ...formData, nama_kontrakan: e.target.value })}
                  required
                  placeholder="Contoh: Unit 01 (Lantai 1 Depan)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tarif Sewa Bulanan (Rp) *</label>
                <input
                  type="number"
                  value={formData.harga_saat_ini}
                  onChange={(e) => setFormData({ ...formData, harga_saat_ini: e.target.value })}
                  required
                  placeholder="1200000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                />
                {isEditMode && (
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">
                    * Perubahan harga akan otomatis tercatat ke riwayat penyesuaian tarif.
                  </p>
                )}
              </div>

              {/* Status Keterisian disembunyikan karena sudah di-handle otomatis oleh VIEW di Supabase */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                 <p className="text-xs text-blue-700 font-medium">
                   Status unit (Terisi/Kosong) ditentukan secara otomatis oleh sistem berdasarkan masa kontrak penyewa.
                 </p>
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
                  {isEditMode ? 'Simpan Perubahan' : 'Tambah Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
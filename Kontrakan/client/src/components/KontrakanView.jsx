import React, { useState, useEffect } from 'react';
import { Plus, Home, Edit, Trash2, CheckCircle2, AlertCircle, X, DollarSign, History } from 'lucide-react';
import { formatRupiah } from '../utils/formatters';

export default function KontrakanView() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    kode_kontrakan: '',
    nama_kontrakan: '',
    harga_saat_ini: '',
    status_unit: 'Terisi'
  });
  const [errorMessage, setErrorMessage] = useState('');

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
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleDelete = async (kode) => {
    if (!confirm(`Hapus unit kontrakan ${kode}? Seluruh riwayat harga & transaksi unit ini akan terhapus.`)) return;
    try {
      await fetch(`/api/kontrakan/${kode}`, { method: 'DELETE' });
      fetchUnits();
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
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

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {units.map((unit) => (
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
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    unit.status_unit === 'Terisi'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {unit.status_unit}
                </span>
              </div>

              <h3 className="font-bold text-slate-800 text-base mt-3">{unit.nama_kontrakan}</h3>

              <div className="mt-2 text-xs text-slate-500">
                Penyewa Terakhir:
                <div className="font-semibold text-slate-700 mt-0.5">
                  {unit.penyewa_terakhir || '(Belum ada data)'}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Tarif Bulanan</div>
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
                  <p className="text-xs text-slate-400 mt-1">
                    * Perubahan harga akan otomatis tercatat ke riwayat penyesuaian tarif.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Status Keterisian *</label>
                <select
                  value={formData.status_unit}
                  onChange={(e) => setFormData({ ...formData, status_unit: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                >
                  <option value="Terisi">Terisi</option>
                  <option value="Kosong">Kosong</option>
                </select>
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

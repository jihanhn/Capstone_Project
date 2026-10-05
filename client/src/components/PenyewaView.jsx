import React, { useState, useEffect } from 'react';
import { Plus, User, Phone, MapPin, Calendar, Edit, Trash2, MessageSquare, AlertCircle, X } from 'lucide-react';
import { formatTanggal } from '../utils/formatters';

export default function PenyewaView() {
  const [penyewaList, setPenyewaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    id_penyewa: '',
    nama_penyewa: '',
    no_hp: '',
    asal_ktp: '',
    tgl_mulai_sewa: new Date().toISOString().split('T')[0],
    tgl_selesai_sewa: ''
  });
  const [errorMessage, setErrorMessage] = useState('');

  const fetchPenyewa = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/penyewa');
      const data = await res.json();
      setPenyewaList(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPenyewa();
  }, []);

  const openCreateModal = () => {
    setIsEditMode(false);
    // Auto generate ID
    const nextId = 'P' + String(penyewaList.length + 1).padStart(3, '0');
    setFormData({
      id_penyewa: nextId,
      nama_penyewa: '',
      no_hp: '',
      asal_ktp: '',
      tgl_mulai_sewa: new Date().toISOString().split('T')[0],
      tgl_selesai_sewa: ''
    });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const openEditModal = (p) => {
    setIsEditMode(true);
    setFormData({
      id_penyewa: p.id_penyewa,
      nama_penyewa: p.nama_penyewa,
      no_hp: p.no_hp,
      asal_ktp: p.asal_ktp || '',
      tgl_mulai_sewa: p.tgl_mulai_sewa,
      tgl_selesai_sewa: p.tgl_selesai_sewa || ''
    });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const url = isEditMode ? `/api/penyewa/${formData.id_penyewa}` : '/api/penyewa';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan data penyewa');

      setIsModalOpen(false);
      fetchPenyewa();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(`Hapus data penyewa ${id}? Transaksi terkait penyewa ini juga akan dihapus.`)) return;
    try {
      await fetch(`/api/penyewa/${id}`, { method: 'DELETE' });
      fetchPenyewa();
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Master Data Penyewa</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar profil penyewa, nomor kontak, daerah asal KTP, dan durasi kontrak hunian
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center justify-center space-x-2 shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Penyewa Baru</span>
        </button>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {penyewaList.map((p) => {
          let cleanNumber = (p.no_hp || '').replace(/\D/g, '');
          if (cleanNumber.startsWith('0')) cleanNumber = '62' + cleanNumber.substring(1);
          const waUrl = `https://wa.me/${cleanNumber}`;

          return (
            <div
              key={p.id_penyewa}
              className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                    {p.id_penyewa}
                  </span>
                  {p.kode_unit_sekarang ? (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Unit: {p.kode_unit_sekarang}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                      Tidak Ada Unit Aktif
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-slate-800 text-base mt-3 flex items-center space-x-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>{p.nama_penyewa}</span>
                </h3>

                <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{p.no_hp}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Asal KTP: {p.asal_ktp || '-'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Mulai: {formatTanggal(p.tgl_mulai_sewa)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat WhatsApp</span>
                </a>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => openEditModal(p)}
                    className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition"
                    title="Edit Profil"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id_penyewa)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Hapus Profil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">
                {isEditMode ? `Edit Penyewa ${formData.id_penyewa}` : 'Tambah Penyewa Baru'}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ID Penyewa *</label>
                  <input
                    type="text"
                    value={formData.id_penyewa}
                    onChange={(e) => setFormData({ ...formData, id_penyewa: e.target.value })}
                    disabled={isEditMode}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">No. HP / WhatsApp *</label>
                  <input
                    type="text"
                    value={formData.no_hp}
                    onChange={(e) => setFormData({ ...formData, no_hp: e.target.value })}
                    required
                    placeholder="08123456789"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  value={formData.nama_penyewa}
                  onChange={(e) => setFormData({ ...formData, nama_penyewa: e.target.value })}
                  required
                  placeholder="Nama sesuai KTP"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Kota / Asal KTP</label>
                <input
                  type="text"
                  value={formData.asal_ktp}
                  onChange={(e) => setFormData({ ...formData, asal_ktp: e.target.value })}
                  placeholder="Contoh: Bandung, Cimahi, Garut"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tgl Mulai Sewa *</label>
                  <input
                    type="date"
                    value={formData.tgl_mulai_sewa}
                    onChange={(e) => setFormData({ ...formData, tgl_mulai_sewa: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tgl Akhir Kontrak</label>
                  <input
                    type="date"
                    value={formData.tgl_selesai_sewa}
                    onChange={(e) => setFormData({ ...formData, tgl_selesai_sewa: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                  />
                </div>
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
                  {isEditMode ? 'Simpan Perubahan' : 'Tambah Penyewa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

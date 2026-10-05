import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit, Trash2, CheckCircle2, Clock, AlertCircle, RefreshCw, X } from 'lucide-react';
import { formatRupiah, formatTanggal } from '../utils/formatters';

export default function TransaksiView() {
  const [transaksiList, setTransaksiList] = useState([]);
  const [kontrakanList, setKontrakanList] = useState([]);
  const [penyewaList, setPenyewaList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterPeriode, setFilterPeriode] = useState('2026-09');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterUnit, setFilterUnit] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    kode_kontrakan: '',
    id_penyewa: '',
    periode_bulan_tahun: '2026-09',
    status_pembayaran: 'Lunas',
    tgl_lunas: new Date().toISOString().split('T')[0],
    cicilan_1_rp: '',
    cicilan_2_rp: '',
    catatan: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/api/transaksi?`;
      if (filterPeriode) url += `periode=${filterPeriode}&`;
      if (filterStatus) url += `status_pembayaran=${filterStatus}&`;
      if (filterUnit) url += `kode_kontrakan=${filterUnit}&`;

      const [trxRes, unitRes, tntRes] = await Promise.all([
        fetch(url),
        fetch('/api/kontrakan'),
        fetch('/api/penyewa')
      ]);

      const trxData = await trxRes.json();
      const unitData = await unitRes.json();
      const tntData = await tntRes.json();

      setTransaksiList(trxData || []);
      setKontrakanList(unitData || []);
      setPenyewaList(tntData || []);
    } catch (err) {
      console.error('Gagal mengambil data transaksi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterPeriode, filterStatus, filterUnit]);

  // Handle open create modal
  const openCreateModal = () => {
    const defaultUnit = kontrakanList[0]?.kode_kontrakan || '';
    const defaultPenyewa = penyewaList[0]?.id_penyewa || '';
    const unitObj = kontrakanList.find(k => k.kode_kontrakan === defaultUnit);
    const defaultPrice = unitObj ? unitObj.harga_saat_ini : '';

    setFormData({
      kode_kontrakan: defaultUnit,
      id_penyewa: defaultPenyewa,
      periode_bulan_tahun: filterPeriode || '2026-09',
      status_pembayaran: 'Lunas',
      tgl_lunas: new Date().toISOString().split('T')[0],
      cicilan_1_rp: defaultPrice,
      cicilan_2_rp: 0,
      catatan: ''
    });
    setErrorMessage('');
    setIsCreateModalOpen(true);
  };

  // Handle change unit in modal -> auto adjust price
  const handleUnitChange = (kode) => {
    const unitObj = kontrakanList.find(k => k.kode_kontrakan === kode);
    const price = unitObj ? unitObj.harga_saat_ini : 0;
    setFormData(prev => ({
      ...prev,
      kode_kontrakan: kode,
      cicilan_1_rp: prev.status_pembayaran === 'Lunas' ? price : (price / 2)
    }));
  };

  const handleStatusChange = (status) => {
    const unitObj = kontrakanList.find(k => k.kode_kontrakan === formData.kode_kontrakan);
    const price = unitObj ? unitObj.harga_saat_ini : 0;

    let c1 = 0;
    let c2 = 0;
    let tgl = formData.tgl_lunas;

    if (status === 'Lunas') {
      c1 = price;
      c2 = 0;
      tgl = tgl || new Date().toISOString().split('T')[0];
    } else if (status === 'Cicil') {
      c1 = price / 2;
      c2 = 0;
      tgl = null;
    } else if (status === 'Belum Lunas') {
      c1 = 0;
      c2 = 0;
      tgl = null;
    }

    setFormData(prev => ({
      ...prev,
      status_pembayaran: status,
      cicilan_1_rp: c1,
      cicilan_2_rp: c2,
      tgl_lunas: tgl
    }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const res = await fetch('/api/transaksi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan transaksi');
      }
      setIsCreateModalOpen(false);
      fetchData();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      status_pembayaran: item.status_pembayaran,
      tgl_lunas: item.tgl_lunas || '',
      cicilan_1_rp: item.cicilan_1_rp || 0,
      cicilan_2_rp: item.cicilan_2_rp || 0,
      catatan: item.catatan || ''
    });
    setErrorMessage('');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const res = await fetch(`/api/transaksi/${editingItem.id_transaksi}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memperbarui transaksi');
      }
      setIsEditModalOpen(false);
      fetchData();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data transaksi ini?')) return;
    try {
      await fetch(`/api/transaksi/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      alert('Gagal menghapus transaksi: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Pencatatan Transaksi Pembayaran</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola data pembayaran sewa, cicilan, dan status pelunasan bulanan
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center justify-center space-x-2 shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Transaksi Baru</span>
        </button>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Periode Bulan</label>
          <input
            type="month"
            value={filterPeriode}
            onChange={(e) => setFilterPeriode(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Filter Unit</label>
          <select
            value={filterUnit}
            onChange={(e) => setFilterUnit(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Unit</option>
            {kontrakanList.map((k) => (
              <option key={k.kode_kontrakan} value={k.kode_kontrakan}>
                {k.kode_kontrakan} - {k.nama_kontrakan}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Status Pembayaran</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Status</option>
            <option value="Lunas">Lunas</option>
            <option value="Cicil">Cicil</option>
            <option value="Belum Lunas">Belum Lunas</option>
          </select>
        </div>

        <div className="flex items-end space-x-2 pt-2 sm:pt-5">
          <button
            onClick={() => {
              setFilterPeriode('');
              setFilterStatus('');
              setFilterUnit('');
            }}
            className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            Reset Filter
          </button>
          <button
            onClick={fetchData}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Periode &amp; Unit</th>
                <th className="px-4 py-3.5">Penyewa</th>
                <th className="px-4 py-3.5">Tarif Sewa</th>
                <th className="px-4 py-3.5">Total Terbayar</th>
                <th className="px-4 py-3.5">Status &amp; Cicilan</th>
                <th className="px-4 py-3.5">Risk Score</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transaksiList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-8 text-center text-slate-400">
                    Tidak ada data transaksi untuk filter ini.
                  </td>
                </tr>
              ) : (
                transaksiList.map((t) => (
                  <tr key={t.id_transaksi} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-800">{t.periode_bulan_tahun}</div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          {t.kode_kontrakan}
                        </span>{' '}
                        {t.nama_kontrakan}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-800">{t.nama_penyewa}</div>
                      <div className="text-xs text-slate-500">{t.no_hp}</div>
                    </td>

                    <td className="px-4 py-3.5 font-medium text-slate-700">
                      {formatRupiah(t.harga_sewa_periode)}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-800">{formatRupiah(t.total_terbayar)}</div>
                      {t.sisa_tagihan > 0 ? (
                        <div className="text-xs text-rose-600 font-medium">
                          Sisa: {formatRupiah(t.sisa_tagihan)}
                        </div>
                      ) : (
                        <div className="text-xs text-emerald-600 font-medium">Lunas</div>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center space-x-1.5">
                        {t.status_pembayaran === 'Lunas' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Lunas
                          </span>
                        ) : t.status_pembayaran === 'Cicil' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                            <Clock className="w-3 h-3 mr-1" /> Cicil
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                            <AlertCircle className="w-3 h-3 mr-1" /> Belum Lunas
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        C1: {formatRupiah(t.cicilan_1_rp)} | C2: {formatRupiah(t.cicilan_2_rp)}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          t.kategoriRisiko === 'High'
                            ? 'bg-rose-100 text-rose-700'
                            : t.kategoriRisiko === 'Medium'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {t.kategoriRisiko} (S={t.riskScore})
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => openEditModal(t)}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition"
                          title="Edit Transaksi"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id_transaksi)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Hapus Transaksi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">Catat Transaksi Baru</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-200 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Unit Kontrakan *</label>
                  <select
                    value={formData.kode_kontrakan}
                    onChange={(e) => handleUnitChange(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                  >
                    {kontrakanList.map((k) => (
                      <option key={k.kode_kontrakan} value={k.kode_kontrakan}>
                        {k.kode_kontrakan} - {k.nama_kontrakan} ({formatRupiah(k.harga_saat_ini)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Penyewa *</label>
                  <select
                    value={formData.id_penyewa}
                    onChange={(e) => setFormData({ ...formData, id_penyewa: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                  >
                    {penyewaList.map((p) => (
                      <option key={p.id_penyewa} value={p.id_penyewa}>
                        {p.nama_penyewa} ({p.id_penyewa})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Periode Bulan *</label>
                  <input
                    type="month"
                    value={formData.periode_bulan_tahun}
                    onChange={(e) => setFormData({ ...formData, periode_bulan_tahun: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Status Pembayaran *</label>
                  <select
                    value={formData.status_pembayaran}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                  >
                    <option value="Lunas">Lunas</option>
                    <option value="Cicil">Cicil</option>
                    <option value="Belum Lunas">Belum Lunas</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Cicilan 1 (Rp)</label>
                  <input
                    type="number"
                    value={formData.cicilan_1_rp}
                    onChange={(e) => setFormData({ ...formData, cicilan_1_rp: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Cicilan 2 (Rp)</label>
                  <input
                    type="number"
                    value={formData.cicilan_2_rp}
                    onChange={(e) => setFormData({ ...formData, cicilan_2_rp: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Lunas</label>
                <input
                  type="date"
                  value={formData.tgl_lunas || ''}
                  onChange={(e) => setFormData({ ...formData, tgl_lunas: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Catatan</label>
                <textarea
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  rows="2"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                  placeholder="Keterangan transaksi..."
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow transition"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Update Transaksi</h3>
                <p className="text-xs text-slate-500">
                  {editingItem.nama_penyewa} &bull; Unit {editingItem.kode_kontrakan} ({editingItem.periode_bulan_tahun})
                </p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-200 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Status Pembayaran *</label>
                <select
                  value={formData.status_pembayaran}
                  onChange={(e) => setFormData({ ...formData, status_pembayaran: e.target.value })}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                >
                  <option value="Lunas">Lunas</option>
                  <option value="Cicil">Cicil</option>
                  <option value="Belum Lunas">Belum Lunas</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Cicilan 1 (Rp)</label>
                  <input
                    type="number"
                    value={formData.cicilan_1_rp}
                    onChange={(e) => setFormData({ ...formData, cicilan_1_rp: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Cicilan 2 (Rp)</label>
                  <input
                    type="number"
                    value={formData.cicilan_2_rp}
                    onChange={(e) => setFormData({ ...formData, cicilan_2_rp: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Lunas</label>
                <input
                  type="date"
                  value={formData.tgl_lunas || ''}
                  onChange={(e) => setFormData({ ...formData, tgl_lunas: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Catatan</label>
                <textarea
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  rows="2"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow transition"
                >
                  Perbarui Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

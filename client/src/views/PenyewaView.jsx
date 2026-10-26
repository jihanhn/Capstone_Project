import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, MessageSquare, AlertCircle, X, Search, Users, Phone, MapPin, CalendarDays, Home, RotateCcw, SlidersHorizontal, Calendar, Lock, Sparkles } from 'lucide-react';
import { showToast } from '../utils/toast';

export default function PenyewaView({ initialSearchQuery = '', onSearchClear }) {
  const [penyewaList, setPenyewaList] = useState([]);
  const [unitList, setUnitList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'Aktif' | 'Tidak Aktif'
  const [yearFilterMode, setYearFilterMode] = useState('single'); // 'single' | 'range'
  const [filterYear, setFilterYear] = useState(''); // e.g. '2021'
  const [filterRangeStart, setFilterRangeStart] = useState(''); // e.g. '2019'
  const [filterRangeEnd, setFilterRangeEnd] = useState(''); // e.g. '2022'

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [formData, setFormData] = useState({
    id_penyewa: '',
    nama_penyewa: '',
    no_hp: '',
    asal_ktp: '',
    tgl_mulai_sewa: '',
    tgl_selesai_sewa: '',
    kode_kontrakan: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resPenyewa, resUnit] = await Promise.all([
        fetch('/api/penyewa'),
        fetch('/api/kontrakan')
      ]);
      const dataPenyewa = await resPenyewa.json();
      const dataUnit = await resUnit.json();
      
      setPenyewaList(dataPenyewa || []);
      setUnitList(dataUnit || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (initialSearchQuery !== undefined) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  const openCreateModal = async () => {
    setIsEditMode(false);
    setFormData({
      id_penyewa: 'Memuat ID...',
      nama_penyewa: '',
      no_hp: '',
      asal_ktp: '',
      tgl_mulai_sewa: new Date().toISOString().split('T')[0],
      tgl_selesai_sewa: '',
      kode_kontrakan: ''
    });
    setErrorMessage('');
    setIsModalOpen(true);

    try {
      const res = await fetch('/api/penyewa/next-id');
      if (res.ok) {
        const data = await res.json();
        if (data.nextId) {
          setFormData(prev => ({ ...prev, id_penyewa: data.nextId }));
        }
      }
    } catch (err) {
      console.error('Gagal mengambil next ID:', err);
    }
  };

  const openEditModal = (p) => {
    setIsEditMode(true);
    setFormData({
      id_penyewa: p.id_penyewa,
      nama_penyewa: p.nama_penyewa,
      no_hp: p.no_hp || '',
      asal_ktp: p.asal_ktp || '',
      tgl_mulai_sewa: p.tgl_mulai_sewa ? String(p.tgl_mulai_sewa).split('T')[0] : '',
      tgl_selesai_sewa: p.tgl_selesai_sewa ? String(p.tgl_selesai_sewa).split('T')[0] : '',
      kode_kontrakan: p.kode_unit_sekarang || ''
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
      fetchData();
      showToast(
        'success',
        isEditMode
          ? `Data penyewa ${formData.nama_penyewa} berhasil diperbarui!`
          : `Penyewa baru ${formData.nama_penyewa} (${data.id_penyewa || formData.id_penyewa}) berhasil ditambahkan!`
      );
    } catch (err) {
      setErrorMessage(err.message);
      showToast('error', err.message || 'Gagal menyimpan data penyewa');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(`Hapus data penyewa ${id}? Transaksi terkait bisa kehilangan referensi.`)) return;
    try {
      await fetch(`/api/penyewa/${id}`, { method: 'DELETE' });
      fetchData();
      showToast('success', `Data penyewa ${id} berhasil dihapus.`);
    } catch (err) {
      showToast('error', 'Gagal menghapus: ' + err.message);
    }
  };

  // Helper ekstrak tahun mulai & selesai
  const getStartYear = (p) => {
    if (!p?.tgl_mulai_sewa) return null;
    const match = String(p.tgl_mulai_sewa).match(/^(\d{4})/);
    if (match) return parseInt(match[1], 10);
    const d = new Date(p.tgl_mulai_sewa);
    return isNaN(d.getFullYear()) ? null : d.getFullYear();
  };

  const getEndYear = (p) => {
    const endTgl = p?.tgl_keluar_aktual || p?.tgl_selesai_sewa;
    if (!endTgl || String(endTgl).trim() === '') return null;
    const match = String(endTgl).match(/^(\d{4})/);
    if (match) return parseInt(match[1], 10);
    const d = new Date(endTgl);
    return isNaN(d.getFullYear()) ? null : d.getFullYear();
  };

  // Cek apakah penyewa aktif pada tahun tertentu
  const isPenyewaActiveInYear = (p, targetYear) => {
    const start = getStartYear(p);
    const end = getEndYear(p);
    if (!start) return false;
    if (targetYear < start) return false;
    if (end !== null) {
      return targetYear <= end;
    }
    return true;
  };

  // Cek apakah rentang aktif penyewa bersinggungan dengan rentang tahun filter
  const isPenyewaActiveInRange = (p, rangeStart, rangeEnd) => {
    const start = getStartYear(p);
    const end = getEndYear(p);
    if (!start) return false;
    const effectiveEnd = end !== null ? end : Infinity;
    const rStart = rangeStart ? parseInt(rangeStart, 10) : -Infinity;
    const rEnd = rangeEnd ? parseInt(rangeEnd, 10) : Infinity;
    return start <= rEnd && effectiveEnd >= rStart;
  };

  // Daftar tahun unik dari data penyewa untuk opsi dropdown
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    let minYear = currentYear;
    let maxYear = currentYear;

    penyewaList.forEach(p => {
      const s = getStartYear(p);
      const e = getEndYear(p);
      if (s) {
        if (s < minYear) minYear = s;
        if (s > maxYear) maxYear = s;
      }
      if (e) {
        if (e < minYear) minYear = e;
        if (e > maxYear) maxYear = e;
      }
    });

    const years = [];
    for (let y = maxYear; y >= minYear; y--) {
      years.push(y);
    }
    return years;
  }, [penyewaList]);

  // Status perhitungan
  const activeCount = penyewaList.filter(p => p.status_berjalan === 'Aktif').length;
  const inactiveCount = penyewaList.filter(p => p.status_berjalan !== 'Aktif').length;

  const isAnyFilterActive = Boolean(
    searchQuery ||
    filterStatus !== 'all' ||
    (yearFilterMode === 'single' && filterYear) ||
    (yearFilterMode === 'range' && (filterRangeStart || filterRangeEnd))
  );

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setFilterYear('');
    setFilterRangeStart('');
    setFilterRangeEnd('');
    if (onSearchClear) onSearchClear();
  };

  const filteredPenyewa = penyewaList.filter(p => {
    // 1. Filter Pencarian Text
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = (
        (p.nama_penyewa?.toLowerCase() || '').includes(q) ||
        (p.id_penyewa?.toLowerCase() || '').includes(q) ||
        (p.kode_unit_sekarang?.toLowerCase() || '').includes(q) ||
        (p.asal_ktp?.toLowerCase() || '').includes(q) ||
        (p.no_hp?.toLowerCase() || '').includes(q)
      );
      if (!matchSearch) return false;
    }

    // 2. Filter Status Berjalan (Semua / Aktif / Tidak Aktif)
    if (filterStatus !== 'all') {
      if (p.status_berjalan !== filterStatus) return false;
    }

    // 3. Filter Tahun Aktif
    if (yearFilterMode === 'single') {
      if (filterYear) {
        if (!isPenyewaActiveInYear(p, parseInt(filterYear, 10))) {
          return false;
        }
      }
    } else if (yearFilterMode === 'range') {
      if (filterRangeStart || filterRangeEnd) {
        if (!isPenyewaActiveInRange(p, filterRangeStart, filterRangeEnd)) {
          return false;
        }
      }
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
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

      {/* FILTER & PENCARIAN PANEL */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama, ID penyewa, daerah asal KTP, atau nomor unit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-10 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button 
              onClick={() => {
                setSearchQuery('');
                if (onSearchClear) onSearchClear(); 
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition p-1"
              title="Hapus pencarian"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="pt-3 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Filter Status Sewa */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mr-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              Status:
            </span>
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterStatus === 'all'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Semua ({penyewaList.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('Aktif')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                  filterStatus === 'Aktif'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${filterStatus === 'Aktif' ? 'bg-white' : 'bg-emerald-500'}`}></span>
                <span>Aktif ({activeCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('Tidak Aktif')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                  filterStatus === 'Tidak Aktif'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-rose-600'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${filterStatus === 'Tidak Aktif' ? 'bg-white' : 'bg-rose-500'}`}></span>
                <span>Tidak Aktif ({inactiveCount})</span>
              </button>
            </div>
          </div>

          {/* Filter Tahun Aktif */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
              Tahun Aktif:
            </span>

            {/* Mode Selector */}
            <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => {
                  setYearFilterMode('single');
                  setFilterRangeStart('');
                  setFilterRangeEnd('');
                }}
                className={`px-2.5 py-1 rounded-md transition ${
                  yearFilterMode === 'single' ? 'bg-white text-emerald-700 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                Per Tahun
              </button>
              <button
                type="button"
                onClick={() => {
                  setYearFilterMode('range');
                  setFilterYear('');
                }}
                className={`px-2.5 py-1 rounded-md transition ${
                  yearFilterMode === 'range' ? 'bg-white text-emerald-700 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                Rentang Tahun
              </button>
            </div>

            {/* Input Filter Berdasarkan Mode */}
            {yearFilterMode === 'single' ? (
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className={`text-xs border rounded-xl px-3 py-1.5 font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer ${
                  filterYear ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <option value="">-- Semua Tahun --</option>
                {availableYears.map(yr => (
                  <option key={yr} value={yr}>
                    Tahun {yr}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                <select
                  value={filterRangeStart}
                  onChange={(e) => setFilterRangeStart(e.target.value)}
                  className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">Dari Tahun...</option>
                  {availableYears.slice().reverse().map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
                <span className="text-xs text-slate-400 font-bold">s/d</span>
                <select
                  value={filterRangeEnd}
                  onChange={(e) => setFilterRangeEnd(e.target.value)}
                  className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">Sampai Tahun...</option>
                  {availableYears.map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Tombol Reset Cepat */}
            {isAnyFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-white hover:bg-rose-500 border border-rose-200 hover:border-rose-500 rounded-xl transition flex items-center space-x-1 font-semibold"
                title="Reset semua filter"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Ringkasan Filter Aktif */}
        {isAnyFilterActive && (
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-700">
                Menampilkan {filteredPenyewa.length} dari {penyewaList.length} penyewa
              </span>
              
              {filterStatus !== 'all' && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                  filterStatus === 'Aktif' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  Status: {filterStatus}
                  <button onClick={() => setFilterStatus('all')} className="hover:opacity-75">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {yearFilterMode === 'single' && filterYear && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Aktif di Tahun {filterYear}
                  <button onClick={() => setFilterYear('')} className="hover:opacity-75">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {yearFilterMode === 'range' && (filterRangeStart || filterRangeEnd) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Rentang Tahun: {filterRangeStart || 'Awal'} – {filterRangeEnd || 'Sekarang'}
                  <button onClick={() => { setFilterRangeStart(''); setFilterRangeEnd(''); }} className="hover:opacity-75">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  Pencarian: "{searchQuery}"
                  <button onClick={() => { setSearchQuery(''); if (onSearchClear) onSearchClear(); }} className="hover:opacity-75">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            <button
              onClick={handleResetFilters}
              className="text-xs text-slate-400 hover:text-rose-600 transition underline underline-offset-2"
            >
              Hapus Semua Filter
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPenyewa.length === 0 && !loading ? (
          <div className="col-span-full p-10 bg-white rounded-2xl shadow-sm border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Users className="w-6 h-6" />
            </div>
            <div className="text-slate-800 font-bold text-base">Tidak ada penyewa yang sesuai filter</div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {isAnyFilterActive
                ? 'Tidak ditemukan data penyewa dengan kriteria filter yang Anda terapkan. Coba ubah atau reset filter Anda.'
                : 'Belum ada data penyewa yang terdaftar di sistem.'}
            </p>
            {isAnyFilterActive && (
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition inline-flex items-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Semua Filter</span>
              </button>
            )}
          </div>
        ) : (
          filteredPenyewa.map((p) => (
            <div
              key={p.id_penyewa}
              className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-xs px-2 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                      {p.id_penyewa}
                    </span>
                    <span 
                      className="text-[11px] font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 flex items-center space-x-1"
                      title="Periode Tahun Aktif Hunian"
                    >
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{getStartYear(p) || '–'} {getEndYear(p) ? `– ${getEndYear(p)}` : '– Sekarang'}</span>
                    </span>
                  </div>

                  {p.status_berjalan === 'Aktif' ? (
                    <span className="text-[10px] font-bold uppercase px-2 py-1 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>{p.kode_unit_sekarang ? `Aktif: Unit ${p.kode_unit_sekarang}` : 'Aktif (Tanpa Unit)'}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase px-2 py-1 rounded border bg-rose-50 text-rose-700 border-rose-200 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      <span>Tidak Aktif</span>
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-slate-800 text-base mb-2 flex items-center space-x-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>{p.nama_penyewa}</span>
                </h3>

                <div className="space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{p.no_hp || '-'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Asal KTP: {p.asal_ktp || '-'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CalendarDays className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>
                      Mulai: {p.tgl_mulai_sewa ? new Date(p.tgl_mulai_sewa).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric'}) : '-'}
                      {p.tgl_keluar_aktual ? (
                        <span className="text-rose-600 font-medium"> • Keluar: {new Date(p.tgl_keluar_aktual).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric'})}</span>
                      ) : p.tgl_selesai_sewa ? (
                        <span className="text-slate-500 font-medium"> • Selesai: {new Date(p.tgl_selesai_sewa).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric'})}</span>
                      ) : null}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <a
                  href={p.no_hp ? `https://wa.me/${p.no_hp.replace(/^0/, '62')}` : '#'}
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
                    className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition"
                    title="Edit Penyewa"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id_penyewa)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Hapus Penyewa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">
                {isEditMode ? 'Edit Data Penyewa' : 'Tambah Penyewa Baru'}
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-600">ID Penyewa</label>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-flex items-center space-x-1">
                      <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                      <span>{isEditMode ? 'Terkunci' : 'Auto-Generate'}</span>
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.id_penyewa}
                      readOnly
                      disabled
                      placeholder="Auto-generated"
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm font-bold text-slate-700 cursor-not-allowed select-none tracking-wide"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {isEditMode 
                      ? '🔒 ID dikunci agar tidak merusak relasi transaksi pembayaran.'
                      : '🔒 Dibuat otomatis berurutan oleh sistem (contoh: P017).'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    value={formData.nama_penyewa}
                    onChange={(e) => setFormData({ ...formData, nama_penyewa: e.target.value })}
                    required
                    placeholder="Sesuai KTP"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nomor WhatsApp *</label>
                  <input
                    type="text"
                    value={formData.no_hp}
                    onChange={(e) => setFormData({ ...formData, no_hp: e.target.value })}
                    required
                    placeholder="08123456..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Asal Daerah (KTP)</label>
                  <input
                    type="text"
                    value={formData.asal_ktp}
                    onChange={(e) => setFormData({ ...formData, asal_ktp: e.target.value })}
                    placeholder="Contoh: Jakarta"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                  />
                </div>
              </div>

              {/* DROPDOWN PEMILIHAN UNIT */}
              <div>
                 <div className="flex items-center justify-between mb-1">
                   <label className="block text-xs font-semibold text-slate-600">Unit Kontrakan yang Ditempati</label>
                   <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                     {unitList.filter(u => u.status_unit === 'Kosong' || u.status_realtime === 'Kosong').length} Kamar Kosong
                   </span>
                 </div>
                 <select
                    value={formData.kode_kontrakan}
                    onChange={(e) => setFormData({ ...formData, kode_kontrakan: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                  >
                    <option value="">-- Pilih Unit (Biarkan kosong jika belum ada) --</option>
                    {unitList
                      .filter(u => {
                        const isKosong = u.status_unit === 'Kosong' || u.status_realtime === 'Kosong';
                        const isCurrent = isEditMode && (u.kode_kontrakan === formData.kode_kontrakan);
                        return isKosong || isCurrent;
                      })
                      .map((u) => {
                        const isCurrent = isEditMode && (u.kode_kontrakan === formData.kode_kontrakan);
                        return (
                          <option key={u.kode_kontrakan} value={u.kode_kontrakan}>
                            {u.kode_kontrakan} - {u.nama_kontrakan} {isCurrent ? '(Unit Saat Ini)' : '(Tersedia / Kosong)'}
                          </option>
                        );
                      })}
                  </select>
                  {unitList.filter(u => u.status_unit === 'Kosong' || u.status_realtime === 'Kosong').length === 0 && !formData.kode_kontrakan && (
                    <p className="text-[11px] text-amber-600 font-medium mt-1">
                      ⚠️ Seluruh unit kamar kontrakan saat ini sedang terisi penuh.
                    </p>
                  )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Masuk *</label>
                  <input
                    type="date"
                    value={formData.tgl_mulai_sewa}
                    onChange={(e) => setFormData({ ...formData, tgl_mulai_sewa: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Keluar (Bila ada)</label>
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
                  {isEditMode ? 'Simpan Perubahan' : 'Simpan Penyewa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
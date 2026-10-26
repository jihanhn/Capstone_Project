import React, { useState, useEffect } from 'react';
import {
  Plus, Edit, Trash2, AlertCircle, X, BedDouble, Key, DoorClosed,
  Wrench, Calendar, Clock, Megaphone, Check, AlertTriangle, ArrowRight,
  Lock, Unlock, RefreshCw, Sparkles
} from 'lucide-react';
import { formatRupiah, formatTanggal } from '../utils/formatters';
import { showToast } from '../utils/toast';
import VacancyLossModal from '../components/modals/VacancyLossModal';

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

  // Kalkulasi Periode Bulan Saat Ini & Bulan Depan untuk Default Berlaku Mulai
  const now = new Date();
  const currentPeriode = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextPeriode = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;

  // Modal & EWS Vacancy State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCustomCode, setIsCustomCode] = useState(false);
  const [loadingNextId, setLoadingNextId] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [originalHarga, setOriginalHarga] = useState(null);
  const [copiedUnitCode, setCopiedUnitCode] = useState(null);
  const [selectedVacancyUnit, setSelectedVacancyUnit] = useState(null);
  const [formData, setFormData] = useState({
    kode_kontrakan: '',
    nama_kontrakan: '',
    harga_saat_ini: '',
    status_unit: 'Kosong',
    berlaku_mulai: '',
    tgl_kosong_sejak: ''
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

  const fetchNextUnitId = async () => {
    setLoadingNextId(true);
    try {
      const res = await fetch('/api/kontrakan/next-id');
      const data = await res.json();
      if (data && data.nextId) {
        setFormData(prev => ({
          ...prev,
          kode_kontrakan: data.nextId
        }));
      }
    } catch (err) {
      console.error('Gagal mengambil ID otomatis:', err);
    } finally {
      setLoadingNextId(false);
    }
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setIsCustomCode(false);
    setOriginalHarga(null);
    setFormData({
      kode_kontrakan: 'Memuat ID...',
      nama_kontrakan: '',
      harga_saat_ini: '',
      status_unit: 'Kosong',
      berlaku_mulai: '',
      tgl_kosong_sejak: new Date().toISOString().split('T')[0]
    });
    setErrorMessage('');
    setIsModalOpen(true);
    fetchNextUnitId();
  };

  const openEditModal = (unit) => {
    setIsEditMode(true);
    setOriginalHarga(unit.harga_saat_ini);

    let initialStatus = unit.status_unit || unit.status_master || 'Kosong';
    let tipePerbaikan = 'ringan';

    if (initialStatus === 'Dalam Perbaikan') {
      if (!unit.nama_penyewa) {
        initialStatus = 'Perbaikan_Berat';
        tipePerbaikan = 'berat';
      } else {
        initialStatus = 'Perbaikan_Ringan';
        tipePerbaikan = 'ringan';
      }
    }

    setFormData({
      kode_kontrakan: unit.kode_kontrakan,
      nama_kontrakan: unit.nama_kontrakan,
      harga_saat_ini: unit.harga_saat_ini,
      status_unit: initialStatus,
      tipe_perbaikan: tipePerbaikan,
      berlaku_mulai: nextPeriode,
      tgl_kosong_sejak: unit.tgl_kosong_sejak ? String(unit.tgl_kosong_sejak).split('T')[0] : new Date().toISOString().split('T')[0],
      nama_penyewa_aktif: unit.nama_penyewa || null,
      id_penyewa_aktif: unit.id_penyewa || null,
      tgl_mulai_sewa: unit.tgl_mulai_sewa || null
    });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleCopyAd = (unit) => {
    const hargaBulan = unit.harga_sewa_bulan || unit.harga_saat_ini || 850000;
    const adTemplate = `🏠 DIKONTRAKKAN: Kamar Siap Huni - Kontrakan Buti (${unit.kode_kontrakan})
📍 Lokasi strategis, lingkungan tenang, aman, dan nyaman.
🛏️ Unit: ${unit.nama_kontrakan} (${unit.kode_kontrakan})
💰 Biaya Sewa: ${formatRupiah(hargaBulan)} / bulan
✨ Fasilitas Lengkap:
- Kamar mandi dalam bersih
- Ventilasi & sirkulasi udara sejuk
- Air sumur pompa jernih 24 jam (bebas iuran air)
- Listrik meteran mandiri
- Parkir motor terlindung dan gerbang aman
🎁 PROMO KHUSUS: Siap survei kapan saja. Diskon khusus untuk sewa awal!
📞 Hubungi Pengelola: 0812-1234-5678 (WhatsApp / Telepon)`;

    navigator.clipboard.writeText(adTemplate);
    setCopiedUnitCode(unit.kode_kontrakan);
    showToast('success', `Teks promosi unit ${unit.kode_kontrakan} disalin ke clipboard! Siap diiklankan.`);
    setTimeout(() => setCopiedUnitCode(null), 2500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const url = isEditMode ? `/api/kontrakan/${formData.kode_kontrakan}` : '/api/kontrakan';
      const method = isEditMode ? 'PUT' : 'POST';

      let status_unit = formData.status_unit;
      let tipe_perbaikan = 'ringan';
      let kosongkan_penyewa = false;

      if (status_unit === 'Perbaikan_Ringan') {
        status_unit = 'Dalam Perbaikan';
        tipe_perbaikan = 'ringan';
        kosongkan_penyewa = false;
      } else if (status_unit === 'Perbaikan_Berat') {
        status_unit = 'Dalam Perbaikan';
        tipe_perbaikan = 'berat';
        kosongkan_penyewa = true;
      } else if (status_unit === 'Kosong') {
        kosongkan_penyewa = true;
      }

      const payload = {
        ...formData,
        status_unit,
        tipe_perbaikan,
        kosongkan_penyewa
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
  const unitPerbaikan = units.filter(u => u.status_unit === 'Dalam Perbaikan').length;
  const persenTerisi = totalUnit > 0 ? Math.round((unitTerisi / totalUnit) * 100) : 0;
  const persenKosong = totalUnit > 0 ? Math.round((unitKosong / totalUnit) * 100) : 0;
  const persenPerbaikan = totalUnit > 0 ? Math.round((unitPerbaikan / totalUnit) * 100) : 0;

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

      {/* 4 HIGHLIGHT METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500">Total Unit</span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
              <BedDouble className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-slate-800">
            {totalUnit}
          </div>
          <span className="text-[11px] text-slate-400 font-medium mt-1">Total kapasitas hunian</span>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500">Terisi (Dihuni)</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Key className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <div className="text-3xl font-extrabold text-emerald-600">{unitTerisi}</div>
            <div className="text-sm font-semibold text-slate-500">({persenTerisi}%)</div>
          </div>
          <span className="text-[11px] text-emerald-600 font-medium mt-1">Penyewa aktif & berbayar</span>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500">Kosong (Siap Huni)</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <DoorClosed className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <div className="text-3xl font-extrabold text-rose-600">{unitKosong}</div>
            <div className="text-sm font-semibold text-slate-500">({persenKosong}%)</div>
          </div>
          <span className="text-[11px] text-rose-500 font-medium mt-1">Dipantau Vacancy Loss EWS</span>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500">Dalam Perbaikan</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <div className="text-3xl font-extrabold text-amber-600">{unitPerbaikan}</div>
            <div className="text-sm font-semibold text-slate-500">({persenPerbaikan}%)</div>
          </div>
          <span className="text-[11px] text-amber-600 font-medium mt-1">🛠️ Dikecualikan dari EWS Loss</span>
        </div>
      </div>

      {/* FILTER BUTTONS & SEARCH BADGE */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterStatus('Semua')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${filterStatus === 'Semua'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            Semua ({totalUnit})
          </button>
          <button
            onClick={() => setFilterStatus('Terisi')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${filterStatus === 'Terisi'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            Terisi ({unitTerisi})
          </button>
          <button
            onClick={() => setFilterStatus('Kosong')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${filterStatus === 'Kosong'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            Kosong ({unitKosong})
          </button>
          <button
            onClick={() => setFilterStatus('Dalam Perbaikan')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center space-x-1.5 ${filterStatus === 'Dalam Perbaikan'
              ? 'bg-amber-100 text-amber-800 border border-amber-300'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            <span>Dalam Perbaikan ({unitPerbaikan})</span>
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
          {displayedUnits.map((unit) => {
            const isKosong = unit.status_unit === 'Kosong';
            const isPerbaikan = unit.status_unit === 'Dalam Perbaikan';
            const isTerisi = unit.status_unit === 'Terisi';
            const isCopied = copiedUnitCode === unit.kode_kontrakan;

            return (
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
                      className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border flex items-center gap-1 ${isTerisi
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : isPerbaikan
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                    >
                      {isPerbaikan && <Wrench className="w-3 h-3 text-amber-600" />}
                      {isKosong && <DoorClosed className="w-3 h-3 text-rose-600" />}
                      {isTerisi && <Key className="w-3 h-3 text-emerald-600" />}
                      <span>{unit.status_unit}</span>
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-800 text-base mt-3">{unit.nama_kontrakan}</h3>

                  {/* KONDISI 1: JIKA STATUS UNIT TERDETEKSI KOSONG */}
                  {isKosong ? (
                    <div className="mt-3 space-y-2.5">
                      {/* Box Info Penyewa Terakhir, Kosong Sejak & Durasi Kosong */}
                      <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-100 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Penyewa Terakhir:</span>
                          <span className="font-bold text-slate-800 text-right">
                            {unit.penyewa_terakhir ? (
                              <span className="text-slate-700 font-semibold">{unit.penyewa_terakhir}</span>
                            ) : (
                              <span className="italic text-slate-400 font-normal">Belum ada penyewa</span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Kosong Sejak:</span>
                          <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formatTanggal(unit.tgl_kosong_sejak)}</span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/70">
                          <span className="text-slate-500 font-medium">Durasi Kosong:</span>
                          <span className={`inline-flex items-center gap-1 font-extrabold px-2 py-0.5 rounded-md text-[11px] border ${unit.durasi_kosong_hari >= 30
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : unit.durasi_kosong_hari >= 14
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                            <Clock className="w-3 h-3" />
                            <span>{unit.durasi_kosong_hari || 0} Hari</span>
                          </span>
                        </div>
                      </div>

                      {/* EWS Vacancy Loss Banner: Dorongan Visibilitas & Tindakan Pemasaran Segera */}
                      <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-2.5 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-500" />
                            <span>EWS Vacancy Loss</span>
                          </div>
                          <div className="font-extrabold text-rose-800 text-xs mt-0.5">
                            {formatRupiah(unit.total_kerugian_akumulasi || 0)}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyAd(unit);
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs ${isCopied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300'
                              }`}
                            title="Salin teks iklan siap kirim ke WhatsApp / sosmed"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Tersalin</span>
                              </>
                            ) : (
                              <>
                                <Megaphone className="w-3.5 h-3.5 text-rose-500" />
                                <span>Iklankan</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVacancyUnit(unit);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100/60 rounded-lg transition"
                            title="Buka Analisis & Mitigasi Vacancy EWS"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : isPerbaikan ? (
                    /* KONDISI 2: JIKA DALAM PERBAIKAN */
                    <div className="mt-3 bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-amber-800 font-semibold flex items-center gap-1">
                          <Wrench className="w-3.5 h-3.5 text-amber-600" />
                          <span>{unit.nama_penyewa ? 'Perbaikan Ringan (Dihuni)' : 'Perbaikan Berat / Renovasi (Kosong)'}</span>
                        </span>
                      </div>
                      {unit.nama_penyewa ? (
                        <div className="space-y-1 pt-0.5">
                          <div className="flex items-center justify-between text-slate-700">
                            <span className="text-slate-500 font-medium">Penghuni Aktif:</span>
                            <span className="font-bold text-amber-900">{unit.nama_penyewa}</span>
                          </div>
                          {unit.tgl_mulai_sewa && (
                            <div className="flex items-center justify-between text-slate-500 text-[11px]">
                              <span>Mulai Sewa:</span>
                              <span className="font-semibold text-slate-700">{formatTanggal(unit.tgl_mulai_sewa)}</span>
                            </div>
                          )}
                          <div className="text-[11px] text-amber-800 pt-1 border-t border-amber-200/60 leading-tight">
                            🛠️ Fasilitas dirawat sementara penghuni tetap tinggal. Bebas EWS Vacancy.
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1 pt-0.5">
                          <div className="text-[11px] text-amber-900 font-medium leading-relaxed">
                            🚧 Kamar sedang renovasi / perbaikan menyeluruh dalam kondisi kosong.
                          </div>
                          <div className="text-[10px] text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded border border-amber-200/70 inline-block font-semibold">
                            🛠️ Dikecualikan dari EWS Vacancy Loss
                          </div>
                          {unit.penyewa_terakhir && (
                            <div className="pt-1 border-t border-amber-200/60 text-[11px] text-amber-800">
                              Penyewa Terakhir: <span className="font-semibold">{unit.penyewa_terakhir}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* KONDISI 3: JIKA TERISI */
                    <div className="mt-3 bg-slate-50/70 border border-slate-100 rounded-xl p-3 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Penyewa Aktif:</span>
                        <span className="font-bold text-slate-800">
                          {unit.nama_penyewa || unit.penyewa_terakhir || '-'}
                        </span>
                      </div>
                      {unit.tgl_mulai_sewa && (
                        <div className="flex items-center justify-between text-slate-500">
                          <span>Mulai Sewa:</span>
                          <span className="font-semibold text-slate-700">{formatTanggal(unit.tgl_mulai_sewa)}</span>
                        </div>
                      )}
                    </div>
                  )}
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
            );
          })}
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                    <span>Kode Unit *</span>
                    {!isEditMode && !isCustomCode && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex items-center space-x-1">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        <span>Auto-Generated</span>
                      </span>
                    )}
                  </label>

                  {!isEditMode && (
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={fetchNextUnitId}
                        disabled={loadingNextId}
                        title="Muat ulang kode urut otomatis"
                        className="text-[11px] text-slate-500 hover:text-emerald-700 flex items-center space-x-1 px-1.5 py-0.5 rounded hover:bg-slate-100 transition"
                      >
                        <RefreshCw className={`w-3 h-3 ${loadingNextId ? 'animate-spin' : ''}`} />
                        <span>{loadingNextId ? 'Memuat...' : 'Muat Ulang'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsCustomCode(!isCustomCode)}
                        className={`text-[11px] font-semibold flex items-center space-x-1 px-2 py-0.5 rounded-lg border transition ${isCustomCode
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        title="Klik untuk membuka kunci jika ingin mengetik kode manual"
                      >
                        {isCustomCode ? (
                          <>
                            <Unlock className="w-3 h-3 text-amber-600" />
                            <span>Kustom Aktif</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3 text-slate-500" />
                            <span>Buka Kunci (Kustom)</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={formData.kode_kontrakan}
                    onChange={(e) => setFormData({ ...formData, kode_kontrakan: e.target.value.toUpperCase() })}
                    readOnly={isEditMode || (!isCustomCode)}
                    required
                    placeholder="Contoh: L1-DLM-08"
                    className={`w-full rounded-xl px-3 py-2 text-sm font-bold tracking-wide transition ${isEditMode || !isCustomCode
                      ? 'bg-slate-100 border border-slate-300 text-slate-600 cursor-not-allowed select-none'
                      : 'bg-white border-2 border-emerald-500 text-slate-900 shadow-sm focus:outline-none'
                      }`}
                  />
                  {!isEditMode && !isCustomCode && (
                    <div className="absolute right-3 top-2.5 text-xs text-slate-400 flex items-center space-x-1 select-none pointer-events-none">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[11px] font-medium text-slate-500">Terkunci</span>
                    </div>
                  )}
                </div>
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

              <div className={isEditMode ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : ""}>
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
                </div>

                {isEditMode && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Berlaku Mulai (Bulan)
                    </label>
                    <input
                      type="month"
                      value={formData.berlaku_mulai || ''}
                      onChange={(e) => setFormData({ ...formData, berlaku_mulai: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                    />
                  </div>
                )}
              </div>

              {/* Status Operasional Unit */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Status Operasional Kamar *
                </label>
                <select
                  value={formData.status_unit}
                  onChange={(e) => setFormData({ ...formData, status_unit: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {formData.nama_penyewa_aktif ? (
                    <>
                      <option value="Terisi">🔵 Terisi (Dihuni: {formData.nama_penyewa_aktif})</option>
                      <option value="Perbaikan_Ringan">🛠️ Dalam Perbaikan Ringan (Penyewa Tetap Tinggal)</option>
                      <option value="Perbaikan_Berat">🚧 Dalam Perbaikan Berat / Renovasi (Kosongkan Kamar & Akhiri Sewa)</option>
                      <option value="Kosong">🔴 Kosong (Siap Huni - Penyewa Selesai Sewa / Pindah)</option>
                    </>
                  ) : (
                    <>
                      <option value="Kosong">🟢 Kosong (Siap Huni / Siap Disewakan)</option>
                      <option value="Perbaikan_Berat">🛠️ Dalam Perbaikan / Renovasi (Kamar Kosong)</option>
                      {isEditMode && formData.status_unit === 'Terisi' && (
                        <option value="Terisi">🔵 Terisi (Sedang Dihuni)</option>
                      )}
                    </>
                  )}
                </select>

                {formData.status_unit === 'Perbaikan_Ringan' ? (
                  <div className="mt-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1 animate-in fade-in">
                    <div className="font-bold flex items-center gap-1.5 text-amber-900">
                      <Wrench className="w-3.5 h-3.5 text-amber-600" />
                      <span>Perbaikan Ringan (Penyewa Tetap Tinggal)</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Unit sedang dilakukan perbaikan fasilitas ringan sementara <strong>{formData.nama_penyewa_aktif}</strong> tetap tinggal di kamar. Data sewa <strong>TETAP AKTIF & TIDAK DIKELUARKAN</strong>, bebas EWS Vacancy Loss, dan dapat dikembalikan ke status 'Terisi' kapan saja setelah perbaikan selesai.
                    </p>
                  </div>
                ) : formData.status_unit === 'Perbaikan_Berat' ? (
                  <div className="mt-2.5 p-3 bg-amber-50/90 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-1.5 animate-in fade-in">
                    <div className="font-bold flex items-center gap-1.5 text-amber-950">
                      <Wrench className="w-3.5 h-3.5 text-amber-700" />
                      <span>Perbaikan Berat / Renovasi (Kamar Dikosongkan)</span>
                    </div>
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      {formData.nama_penyewa_aktif
                        ? `Unit memerlukan perbaikan berat/renovasi menyeluruh sehingga kamar harus KOSONG. Penyewa ${formData.nama_penyewa_aktif} akan dicatat keluar & statusnya menjadi 'Tidak Aktif'. Kamar dalam status perbaikan ini BEBAS dari beban EWS Vacancy Loss hingga perbaikan selesai.`
                        : 'Kamar kosong sedang dalam renovasi atau perbaikan fisik sebelum disewakan kembali. Secara otomatis DIKECUALIKAN dari EWS Vacancy Loss agar tidak mendistorsi analisis pemasaran.'}
                    </p>
                  </div>
                ) : formData.status_unit === 'Terisi' ? (
                  <div className="mt-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1 animate-in fade-in">
                    <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                      <Key className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Unit Terisi (Dihuni)</span>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Unit berstatus normal dan aktif dihuni oleh <strong>{formData.nama_penyewa_aktif || 'penyewa terdaftar'}</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 mt-2">
                    {formData.nama_penyewa_aktif && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                        <div className="font-bold flex items-center gap-1 text-rose-900">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Perhatian: Pengosongan Unit</span>
                        </div>
                        <p className="text-[11px] text-rose-700">
                          Memilih status Kosong akan mengakhiri masa sewa penyewa <strong>{formData.nama_penyewa_aktif}</strong> di unit ini dan status penyewa berubah menjadi <strong>Tidak Aktif</strong>.
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Kosong Sejak (Tanggal Acuan)
                      </label>
                      <input
                        type="date"
                        value={formData.tgl_kosong_sejak || ''}
                        onChange={(e) => setFormData({ ...formData, tgl_kosong_sejak: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                      />
                    </div>
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
                  {isEditMode ? 'Simpan Perubahan' : 'Tambah Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VACANCY LOSS MODAL POPUP */}
      {selectedVacancyUnit && (
        <VacancyLossModal
          unit={selectedVacancyUnit}
          onClose={() => setSelectedVacancyUnit(null)}
        />
      )}
    </div>
  );
}
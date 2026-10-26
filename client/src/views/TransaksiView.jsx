import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Trash2, CheckCircle2, Clock, AlertCircle, RefreshCw, X,
  ShieldAlert, Timer, Lock, Receipt, Calendar, CreditCard, ChevronRight, Info,
  Wallet, Download, ArrowDownLeft, Building
} from 'lucide-react';
import { formatRupiah, formatTanggal } from '../utils/formatters';
import { showToast } from '../utils/toast';

// Opsi Standar Metode Pembayaran & Rekening Pengelola
const DEFAULT_METODE_OPTIONS = [
  { group: 'Transfer Bank', value: 'Transfer Bank - BCA (8830-123-456 a.n. Ibu Buti)', label: 'BCA: 8830-123-456 a.n. Ibu Buti' },
  { group: 'Transfer Bank', value: 'Transfer Bank - Mandiri (137-00-9876543-2 a.n. Ibu Buti)', label: 'Bank Mandiri: 137-00-9876543-2 a.n. Ibu Buti' },
  { group: 'Transfer Bank', value: 'Transfer Bank - BRI (0206-01-054321-50-8 a.n. Kontrakan Buti)', label: 'Bank BRI: 0206-01-054321-50-8 a.n. Kontrakan Buti' },
  { group: 'Transfer Bank', value: 'Transfer Bank - Rekening Lainnya', label: 'Transfer Bank Lainnya' },
  { group: 'QRIS & Digital', value: 'QRIS (KONTRAKAN BUTI OFFICIAL)', label: 'QRIS Semua Bank & E-Wallet' },
  { group: 'Tunai / Cash', value: 'Tunai Langsung (Cash)', label: 'Tunai Langsung (Cash - Pengelola Lapangan)' }
];

const getAvailableMetodeOptions = () => {
  try {
    const saved = localStorage.getItem('kb_metode_pembayaran');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
          .filter(m => m.aktif !== false)
          .map(m => {
            const norekStr = m.nomor && m.nomor !== '-' ? ` (${m.nomor}${m.atasNama ? ` a.n. ${m.atasNama}` : ''})` : (m.atasNama ? ` (${m.atasNama})` : '');
            return {
              group: m.tipe || 'Metode Pembayaran',
              value: `${m.nama}${norekStr}`,
              label: `${m.nama}${norekStr}`
            };
          });
      }
    }
  } catch (e) {
    // fallback ke default
  }
  return DEFAULT_METODE_OPTIONS;
};

export default function TransaksiView({ initialFilterUnit = '', initialFilterStatus = '', onFilterClear }) {
  const [transaksiList, setTransaksiList] = useState([]);
  const [allTagihanList, setAllTagihanList] = useState([]);
  const [kontrakanList, setKontrakanList] = useState([]);
  const [penyewaList, setPenyewaList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mode Tampilan: 'tagihan' (Basis Akrual / Tagihan Sewa & Piutang) | 'kas' (Basis Kas / Arus Kas Masuk & Mutasi Bank)
  const [viewMode, setViewMode] = useState('tagihan');

  // State untuk Data Arus Kas Masuk Fisik (Basis Kas)
  const [arusKasResult, setArusKasResult] = useState({ total_kas_masuk: 0, total_transaksi_kas: 0, rekap_metode: {}, data: [] });
  const [loadingKas, setLoadingKas] = useState(false);

  const [metodeOptions, setMetodeOptions] = useState(DEFAULT_METODE_OPTIONS);

  useEffect(() => {
    setMetodeOptions(getAvailableMetodeOptions());
  }, []);

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = String(today.getMonth() + 1).padStart(2, '0');

  // Filter untuk Tab Tagihan (Basis Akrual)
  const [filterPeriode, setFilterPeriode] = useState(`${currentYear}-${currentMonth}`);
  const [filterStatus, setFilterStatus] = useState(initialFilterStatus);
  const [filterUnit, setFilterUnit] = useState(initialFilterUnit);

  // Filter untuk Tab Arus Kas Masuk (Basis Kas)
  const [filterBulanKas, setFilterBulanKas] = useState(`${currentYear}-${currentMonth}`);
  const [filterUnitKas, setFilterUnitKas] = useState('');
  const [filterMetodeKas, setFilterMetodeKas] = useState('');

  useEffect(() => {
    if (initialFilterUnit) setFilterUnit(initialFilterUnit);
    if (initialFilterStatus) setFilterStatus(initialFilterStatus);
  }, [initialFilterUnit, initialFilterStatus]);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [detailModalItem, setDetailModalItem] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Form Data untuk Catat Pembayaran Baru (Invoice-based partial payment)
  const [formData, setFormData] = useState({
    id_penyewa: '',
    id_tagihan: '',
    isNewInvoice: false,
    periode_baru: `${currentYear}-${currentMonth}`,
    kode_kontrakan: '',
    nominal_bayar: '',
    metode_pembayaran: DEFAULT_METODE_OPTIONS[0].value,
    tanggal_bayar: new Date().toISOString().split('T')[0],
    catatan: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/api/transaksi?`;
      if (filterPeriode) url += `periode=${filterPeriode}&`;
      if (filterStatus) url += `status_pembayaran=${filterStatus}&`;
      if (filterUnit) url += `kode_kontrakan=${filterUnit}&`;

      const [trxRes, allTrxRes, unitRes, tntRes] = await Promise.all([
        fetch(url),
        fetch('/api/transaksi'),
        fetch('/api/kontrakan'),
        fetch('/api/penyewa')
      ]);

      const trxData = await trxRes.json();
      const allTrxData = await allTrxRes.json();
      const unitData = await unitRes.json();
      const tntData = await tntRes.json();

      setTransaksiList(trxData || []);
      setAllTagihanList(allTrxData || []);
      setKontrakanList(unitData || []);
      setPenyewaList(tntData || []);
    } catch (err) {
      console.error('Gagal mengambil data transaksi:', err);
    } finally {
      setLoading(false);
    }
  };

  // Mengambil Data Arus Kas Masuk Fisik (Basis Kas / Rekonsiliasi Bank)
  const fetchArusKas = async () => {
    setLoadingKas(true);
    try {
      let url = `/api/transaksi/arus-kas?`;
      if (filterBulanKas) url += `periode=${filterBulanKas}&`;
      if (filterUnitKas) url += `kode_kontrakan=${filterUnitKas}&`;
      if (filterMetodeKas) url += `metode_pembayaran=${filterMetodeKas}&`;
      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        setArusKasResult(d || { total_kas_masuk: 0, total_transaksi_kas: 0, rekap_metode: {}, data: [] });
      }
    } catch (e) {
      console.error('Gagal mengambil data arus kas masuk:', e);
    } finally {
      setLoadingKas(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterPeriode, filterStatus, filterUnit]);

  useEffect(() => {
    fetchArusKas();
  }, [filterBulanKas, filterUnitKas, filterMetodeKas]);

  // Ekspor CSV Sesuai Tab Aktif
  const handleExportTransaksiCsv = () => {
    let url = '/api/export/csv?';
    if (viewMode === 'kas') {
      url += `basis=kas&`;
      if (filterBulanKas) url += `periode=${filterBulanKas}&`;
      showToast('info', 'Mengunduh Laporan Arus Kas Masuk (Basis Kas)...');
    } else {
      if (filterPeriode) url += `periode=${filterPeriode}&`;
      showToast('info', 'Mengunduh Laporan Rekap Tagihan Sewa (Basis Akrual)...');
    }
    window.open(url, '_blank');
  };

  // Format Periode (misal: "2026-03" -> "Maret 2026")
  const formatPeriodeNama = (periodeStr) => {
    if (!periodeStr) return '';
    const [year, month] = periodeStr.split('-');
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const idx = parseInt(month, 10) - 1;
    return `${monthNames[idx] || month} ${year}`;
  };

  // Filter penyewa yang memiliki unit (penyewa aktif)
  const activeTenants = useMemo(() => {
    return penyewaList.filter(p => p.kode_unit_sekarang || p.kode_kontrakan);
  }, [penyewaList]);

  // Tagihan BELUM LUNAS milik penyewa yang dipilih (Sisa Tunggakan > 0)
  const tenantUnpaidInvoices = useMemo(() => {
    if (!formData.id_penyewa) return [];
    return allTagihanList.filter(t =>
      t.id_penyewa === formData.id_penyewa &&
      (t.sisa_tagihan || 0) > 0
    );
  }, [allTagihanList, formData.id_penyewa]);

  // Handle pilih penyewa di modal
  const handlePenyewaChange = (idPenyewa) => {
    if (!idPenyewa) {
      setFormData(prev => ({
        ...prev,
        id_penyewa: '',
        id_tagihan: '',
        kode_kontrakan: '',
        nominal_bayar: '',
        isNewInvoice: false
      }));
      return;
    }

    const penyewa = penyewaList.find(p => p.id_penyewa === idPenyewa);
    const kodeUnit = penyewa?.kode_unit_sekarang || penyewa?.kode_kontrakan || '';
    const unit = kontrakanList.find(u => u.kode_kontrakan === kodeUnit);
    const tarifUnit = unit?.harga_saat_ini || penyewa?.harga_sewa_bulan || 0;

    // Cari tagihan belum lunas milik penyewa ini
    const unpaid = allTagihanList.filter(t => t.id_penyewa === idPenyewa && (t.sisa_tagihan || 0) > 0);
    const firstInvoice = unpaid[0];
    const isNew = unpaid.length === 0;

    setFormData(prev => ({
      ...prev,
      id_penyewa: idPenyewa,
      kode_kontrakan: kodeUnit,
      id_tagihan: firstInvoice ? String(firstInvoice.id_tagihan) : 'NEW_INVOICE',
      isNewInvoice: isNew,
      nominal_bayar: firstInvoice ? String(firstInvoice.sisa_tagihan) : (tarifUnit ? String(tarifUnit) : '')
    }));
  };

  // Handle pilih tagihan dari dropdown
  const handleTagihanChange = (val) => {
    const penyewa = penyewaList.find(p => p.id_penyewa === formData.id_penyewa);
    const kodeUnit = formData.kode_kontrakan || penyewa?.kode_unit_sekarang || penyewa?.kode_kontrakan || '';
    const unit = kontrakanList.find(u => u.kode_kontrakan === kodeUnit);
    const tarifUnit = unit?.harga_saat_ini || penyewa?.harga_sewa_bulan || 0;

    if (val === 'NEW_INVOICE') {
      setFormData(prev => ({
        ...prev,
        id_tagihan: 'NEW_INVOICE',
        isNewInvoice: true,
        nominal_bayar: tarifUnit ? String(tarifUnit) : ''
      }));
      return;
    }

    const inv = allTagihanList.find(t => String(t.id_tagihan) === String(val));
    setFormData(prev => ({
      ...prev,
      id_tagihan: val,
      isNewInvoice: false,
      nominal_bayar: inv ? String(inv.sisa_tagihan) : (tarifUnit ? String(tarifUnit) : '')
    }));
  };

  const openCreateModal = () => {
    const defaultMetode = (metodeOptions && metodeOptions[0]?.value) || DEFAULT_METODE_OPTIONS[0].value;
    setFormData({
      id_penyewa: '',
      id_tagihan: '',
      isNewInvoice: false,
      periode_baru: filterPeriode || `${currentYear}-${currentMonth}`,
      kode_kontrakan: '',
      nominal_bayar: '',
      metode_pembayaran: defaultMetode,
      tanggal_bayar: new Date().toISOString().split('T')[0],
      catatan: ''
    });
    setErrorMessage('');
    setIsCreateModalOpen(true);
  };

  // Quick action: buka modal pembayaran cicilan untuk tagihan tertentu
  const openPayModalForInvoice = (inv) => {
    const defaultMetode = (metodeOptions && metodeOptions[0]?.value) || DEFAULT_METODE_OPTIONS[0].value;
    setFormData({
      id_penyewa: inv.id_penyewa,
      id_tagihan: String(inv.id_tagihan),
      isNewInvoice: false,
      periode_baru: inv.periode_bulan_tahun,
      kode_kontrakan: inv.kode_kontrakan,
      nominal_bayar: inv.sisa_tagihan > 0 ? inv.sisa_tagihan : '',
      metode_pembayaran: inv.metode_pembayaran || defaultMetode,
      tanggal_bayar: new Date().toISOString().split('T')[0],
      catatan: ''
    });
    setErrorMessage('');
    setIsCreateModalOpen(true);
  };

  // Submit pembayaran (Invoice-based partial payment)
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.id_penyewa) {
      setErrorMessage('Pilih penyewa terlebih dahulu');
      return;
    }

    const nominal = parseFloat(formData.nominal_bayar);
    if (!nominal || nominal <= 0) {
      setErrorMessage('Nominal pembayaran harus lebih besar dari Rp 0');
      return;
    }

    if (!formData.metode_pembayaran || formData.metode_pembayaran.trim() === '') {
      setErrorMessage('Wajib memilih Metode Pembayaran / Rekening Tujuan untuk pencatatan mutasi');
      return;
    }

    try {
      const payload = {
        nominal_bayar: nominal,
        tanggal_bayar: formData.tanggal_bayar,
        metode_pembayaran: formData.metode_pembayaran,
        catatan: formData.catatan
      };

      if (formData.isNewInvoice || formData.id_tagihan === 'NEW_INVOICE') {
        payload.kode_kontrakan = formData.kode_kontrakan;
        payload.id_penyewa = formData.id_penyewa;
        payload.periode_bulan_tahun = formData.periode_baru;
      } else {
        payload.id_tagihan = formData.id_tagihan;
      }

      const res = await fetch('/api/transaksi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mencatat pembayaran');

      setIsCreateModalOpen(false);
      await fetchData();
      await fetchArusKas();
      showToast('success', data.message || 'Pembayaran berhasil dicatat!');

      // Jika sedang buka detail modal, update tampilan detailnya
      if (detailModalItem) {
        const updated = await fetch(`/api/transaksi?periode=${detailModalItem.periode_bulan_tahun}`).then(r => r.json());
        const refreshed = updated.find(t => t.id_transaksi === detailModalItem.id_transaksi);
        if (refreshed) setDetailModalItem(refreshed);
      }
    } catch (err) {
      setErrorMessage(err.message);
      showToast('error', err.message);
    }
  };

  // Hapus tagihan
  const handleDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data tagihan ini dan seluruh riwayat pembayarannya?')) return;
    try {
      const res = await fetch(`/api/transaksi/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus');
      await fetchData();
      await fetchArusKas();
      showToast('success', 'Data tagihan berhasil dihapus.');
      if (detailModalItem && detailModalItem.id_transaksi === id) {
        setDetailModalItem(null);
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  // Hapus satu pembayaran cicilan dari riwayat
  const handleDeletePembayaran = async (idPembayaran) => {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan pembayaran ini?')) return;
    try {
      const res = await fetch(`/api/transaksi/pembayaran/${idPembayaran}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus pembayaran');
      await fetchData();
      await fetchArusKas();
      showToast('success', 'Riwayat pembayaran berhasil dihapus.');

      // Refresh item di detail modal
      if (detailModalItem) {
        const updated = await fetch(`/api/transaksi?periode=${detailModalItem.periode_bulan_tahun}`).then(r => r.json());
        const refreshed = updated.find(t => t.id_transaksi === detailModalItem.id_transaksi);
        setDetailModalItem(refreshed || null);
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  // Tagihan yang sedang dipilih di form modal
  const selectedInvoiceObj = allTagihanList.find(t => String(t.id_tagihan) === String(formData.id_tagihan));
  const selectedTenantObj = penyewaList.find(p => p.id_penyewa === formData.id_penyewa);
  const selectedUnitKode = formData.kode_kontrakan || selectedTenantObj?.kode_unit_sekarang || selectedTenantObj?.kode_kontrakan || '';
  const selectedUnitObj = kontrakanList.find(u => u.kode_kontrakan === selectedUnitKode);
  const currentUnitRentPrice = selectedInvoiceObj?.harga_sewa_periode || selectedUnitObj?.harga_saat_ini || selectedTenantObj?.harga_sewa_bulan || 0;

  // Ringkasan Header
  const totalPenyewa = transaksiList.length;
  const totalPotensi = transaksiList.reduce((acc, curr) => acc + (parseFloat(curr.harga_sewa_periode) || 0), 0);
  const totalRealisasi = transaksiList.reduce((acc, curr) => {
    const terbayar = (curr.riwayat_transaksi || []).reduce(
      (sum, r) => sum + (parseFloat(r.nominal_bayar) || 0),
      0
    ) || (parseFloat(curr.total_terbayar) || 0);
    return acc + terbayar;
  }, 0);
  const persenRealisasi = totalPotensi > 0 ? Math.round((totalRealisasi / totalPotensi) * 100) : 0;
  const tepatWaktu = transaksiList.filter(t => (t.sisa_tagihan || 0) <= 0 && t.breakdown?.lagDays <= 0).length;
  const persenTepatWaktu = totalPenyewa > 0 ? Math.round((tepatWaktu / totalPenyewa) * 100) : 0;
  const totalTunggakan = transaksiList.reduce((acc, curr) => acc + (curr.sisa_tagihan || 0), 0);
  const jumlahPenyewaNunggak = transaksiList.filter(t => (t.sisa_tagihan || 0) > 0).length;
  const penyewaTerlambat = transaksiList.filter(t => t.breakdown?.lagDays > 0);
  const rataRataTerlambat = penyewaTerlambat.length > 0
    ? Math.round(penyewaTerlambat.reduce((acc, curr) => acc + curr.breakdown.lagDays, 0) / penyewaTerlambat.length)
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Pembayaran Sewa</h2>
          <p className="text-xs text-slate-500 mt-0.5">Sistem partial payment per tagihan invoice, pantau status pembayaran dan cicilan bulanan</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center justify-center space-x-2 shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Pembayaran Baru</span>
        </button>
      </div>

      {/* Summary KPI Cards (4 Kolom Lengkap dengan Realisasi Pembayaran) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Realisasi Pembayaran */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-100 bg-emerald-50/20 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Realisasi Pembayaran</span>
            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><Wallet className="w-4 h-4" /></div>
          </div>
          <div className="mt-2 relative z-10">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700">{formatRupiah(totalRealisasi)}</div>
            <div className="text-xs font-medium text-emerald-700/80 mt-1 flex items-center space-x-1">
              <span>{persenRealisasi}% dari potensi ({formatRupiah(totalPotensi)})</span>
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 text-emerald-100 opacity-40 z-0"><Wallet className="w-24 h-24" /></div>
        </div>

        {/* Card 2: Tunggakan Aktif */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-rose-200 bg-rose-50/30 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700">Tunggakan Aktif</span>
            <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg"><ShieldAlert className="w-4 h-4" /></div>
          </div>
          <div className="mt-2 relative z-10">
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-600">{formatRupiah(totalTunggakan)}</div>
            <div className="text-xs font-medium text-rose-600/80 mt-1 flex items-center space-x-1">
              <span>{jumlahPenyewaNunggak} penyewa menunggak</span>
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 text-rose-100 opacity-50 z-0"><ShieldAlert className="w-24 h-24" /></div>
        </div>

        {/* Card 3: Pembayaran Tepat Waktu */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pembayaran Tepat Waktu</span>
            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><CheckCircle2 className="w-4 h-4" /></div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{persenTepatWaktu}%</div>
            <div className="text-xs font-medium text-slate-500 mt-1">{tepatWaktu} penyewa dari total tagihan</div>
          </div>
        </div>

        {/* Card 4: Rata-rata Keterlambatan */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Rata-rata Keterlambatan</span>
            <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg"><Timer className="w-4 h-4" /></div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-800">
              {rataRataTerlambat} <span className="text-base font-semibold text-slate-500">hari</span>
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">Dihitung dari tanggal jatuh tempo</div>
          </div>
        </div>
      </div>

      {/* Mode Switcher: Basis Akrual (Tagihan) vs Basis Kas (Arus Kas Masuk / Mutasi Bank) */}
      <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setViewMode('tagihan')}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${viewMode === 'tagihan'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Rekap Tagihan Sewa (Basis Akrual)</span>
          </button>
          <button
            onClick={() => setViewMode('kas')}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${viewMode === 'kas'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Arus Kas Masuk Fisik (Basis Kas / Mutasi Bank)</span>
          </button>
        </div>

        <button
          onClick={handleExportTransaksiCsv}
          className="w-full sm:w-auto px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl flex items-center justify-center gap-1.5 transition"
          title="Unduh laporan dalam format CSV"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Ekspor CSV ({viewMode === 'tagihan' ? 'Tagihan' : 'Mutasi Kas'})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAMPILAN 1: REKAP TAGIHAN & PIUTANG SEWA (BASIS AKRUAL)                   */}
      {/* ========================================================================= */}
      {viewMode === 'tagihan' && (
        <div className="space-y-0">
          {/* Filter Toolbar Tagihan */}
          <div className="bg-white p-4 rounded-t-2xl shadow-sm border border-b-0 border-slate-200 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Periode Tagihan Sewa
              </label>
              <input
                type="month"
                value={filterPeriode}
                onChange={(e) => setFilterPeriode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Filter Unit
              </label>
              <select
                value={filterUnit}
                onChange={(e) => setFilterUnit(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="">Semua Unit</option>
                {kontrakanList.map((k) => (
                  <option key={k.kode_kontrakan} value={k.kode_kontrakan}>
                    {k.kode_kontrakan} - {k.nama_kontrakan}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 w-full">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Status Tagihan
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="">Semua Status</option>
                <option value="Lunas">LUNAS</option>
                <option value="Belum Lunas">BELUM LUNAS</option>
              </select>
            </div>
            <div className="flex items-end space-x-2 w-full sm:w-auto self-end">
              <button
                onClick={() => { setFilterPeriode(''); setFilterStatus(''); setFilterUnit(''); }}
                className="flex-1 sm:flex-none py-2 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Reset
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

          {/* Main Table Tagihan */}
          <div className="bg-white rounded-b-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Periode &amp; Unit</th>
                    <th className="px-4 py-3.5">Penyewa</th>
                    <th className="px-4 py-3.5">Tarif Sewa</th>
                    <th className="px-4 py-3.5">Total Terbayar</th>
                    <th className="px-4 py-3.5">Status Pembayaran</th>
                    {/* Header Kolom Transaksi Terakhir (mencegah bias kognitif admin) */}
                    <th className="px-4 py-3.5">Transaksi Terakhir</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transaksiList.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-5 py-8 text-center text-slate-400">
                        Tidak ada data transaksi pembayaran untuk filter ini.
                      </td>
                    </tr>
                  ) : (
                    transaksiList.map((t) => {
                      const totalTerbayar = (t.riwayat_transaksi || []).reduce(
                        (acc, curr) => acc + (parseFloat(curr.nominal_bayar) || 0),
                        0
                      ) || (parseFloat(t.total_terbayar) || 0);

                      const tarifSewa = parseFloat(t.harga_sewa_periode) || 0;
                      const sisaTunggakan = Math.max(0, tarifSewa - totalTerbayar);
                      const isLunas = totalTerbayar >= tarifSewa;

                      return (
                        <tr key={t.id_transaksi} className="hover:bg-slate-50/70 transition">
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-slate-800">{t.periode_bulan_tahun}</div>
                            <div className="text-xs text-slate-500 font-medium mt-0.5">
                              <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                                {t.kode_kontrakan}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-slate-800">{t.nama_penyewa}</div>
                          </td>
                          <td className="px-4 py-3.5 font-medium text-slate-700">
                            {formatRupiah(tarifSewa)}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-800">{formatRupiah(totalTerbayar)}</div>
                            {sisaTunggakan > 0 ? (
                              <div className="text-xs text-rose-600 font-bold mt-0.5">
                                Tunggakan: {formatRupiah(sisaTunggakan)}
                              </div>
                            ) : null}
                            {t.metode_pembayaran && (
                              <div className="text-[10px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                                <CreditCard className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                <span className="truncate max-w-[130px]" title={t.metode_pembayaran}>
                                  {t.metode_pembayaran.split('-')[0].trim()}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            {isLunas ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wide">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> LUNAS
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 uppercase tracking-wide">
                                <AlertCircle className="w-3 h-3 mr-1" /> BELUM LUNAS
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            {t.tgl_bayar_terakhir || t.tgl_lunas ? (
                              <div>
                                <div className="font-semibold text-slate-800">
                                  {formatTanggal(t.tgl_bayar_terakhir || t.tgl_lunas)}
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium">
                                  {(t.riwayat_transaksi || []).length > 1
                                    ? `Cicilan ke-${(t.riwayat_transaksi || []).length} (${isLunas ? 'Lunas' : 'Belum Lunas'})`
                                    : isLunas ? 'Langsung Lunas' : 'Pembayaran Awal'}
                                </div>
                              </div>
                            ) : (
                              <div className="text-slate-400 italic text-xs">Belum Ada Transaksi</div>
                            )}
                            {t.breakdown?.lagDays > 0 ? (
                              <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
                                Terlambat {t.breakdown.lagDays} hari
                              </div>
                            ) : isLunas && (t.tgl_bayar_terakhir || t.tgl_lunas) ? (
                              <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                                Tepat Waktu
                              </div>
                            ) : null}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => setDetailModalItem(t)}
                                className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition"
                                title="Lihat Detail Riwayat Pembayaran"
                              >
                                <Receipt className="w-4 h-4" />
                              </button>
                              {sisaTunggakan > 0 && (
                                <button
                                  onClick={() => openPayModalForInvoice(t)}
                                  className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                                  title="Catat Pembayaran Cicilan"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(t.id_transaksi)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Hapus Tagihan"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAMPILAN 2: ARUS KAS MASUK FISIK (BASIS KAS / MUTASI REKENING BANK)       */}
      {/* ========================================================================= */}
      {viewMode === 'kas' && (
        <div className="space-y-4">
          {/* Filter Toolbar Arus Kas */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="w-full sm:w-56">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Bulan Kas Masuk (Mutasi)
                </label>
                <input
                  type="month"
                  value={filterBulanKas}
                  onChange={(e) => setFilterBulanKas(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              <div className="w-full sm:w-48">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Unit Kontrakan
                </label>
                <select
                  value={filterUnitKas}
                  onChange={(e) => setFilterUnitKas(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">Semua Unit</option>
                  {kontrakanList.map((k) => (
                    <option key={k.kode_kontrakan} value={k.kode_kontrakan}>
                      {k.kode_kontrakan} - {k.nama_kontrakan}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:w-56">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Rekening / Metode
                </label>
                <select
                  value={filterMetodeKas}
                  onChange={(e) => setFilterMetodeKas(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">Semua Metode</option>
                  <option value="BCA">BCA (Bank Central Asia)</option>
                  <option value="Mandiri">Bank Mandiri</option>
                  <option value="BRI">Bank BRI</option>
                  <option value="QRIS">QRIS / Digital</option>
                  <option value="Tunai">Tunai Langsung (Cash)</option>
                </select>
              </div>

              <div className="flex items-end space-x-2 w-full sm:w-auto self-end">
                <button
                  onClick={() => { setFilterBulanKas(''); setFilterUnitKas(''); setFilterMetodeKas(''); }}
                  className="py-2 px-3 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Reset
                </button>
                <button
                  onClick={fetchArusKas}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                  title="Segarkan data kas"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingKas ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div >
          </div>

          {/* Ringkasan Kas Masuk Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <span className="text-xs font-semibold text-slate-500">Total Kas Masuk Fisik</span>
              <div className="text-2xl font-extrabold text-emerald-700 mt-1">
                {formatRupiah(arusKasResult.total_kas_masuk)}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Uang riil yang masuk rekening bank/kas</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <span className="text-xs font-semibold text-slate-500">Jumlah Transaksi Mutasi</span>
              <div className="text-2xl font-extrabold text-slate-800 mt-1">
                {arusKasResult.total_transaksi_kas} <span className="text-sm font-normal text-slate-500">transaksi</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Kali transfer/pembayaran cicilan diterima</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-500 mb-1">Rincian per Rekening</span>
              <div className="space-y-1 text-xs">
                {Object.keys(arusKasResult.rekap_metode || {}).length === 0 ? (
                  <span className="text-slate-400 italic">Belum ada mutasi</span>
                ) : (
                  Object.entries(arusKasResult.rekap_metode).slice(0, 3).map(([metode, total]) => (
                    <div key={metode} className="flex justify-between items-center text-[11px]">
                      <span className="truncate max-w-[130px] text-slate-600 font-medium" title={metode}>
                        {metode.split('-')[0].trim()}
                      </span>
                      <span className="font-bold text-slate-800">{formatRupiah(total)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Tabel Mutasi Arus Kas Masuk */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">No</th>
                    <th className="px-4 py-3.5">Tanggal Kas Masuk</th>
                    <th className="px-4 py-3.5">Penyewa &amp; Unit</th>
                    <th className="px-4 py-3.5">Untuk Tagihan Periode</th>
                    <th className="px-4 py-3.5">Nominal Masuk</th>
                    <th className="px-4 py-3.5">Metode / Rekening Tujuan</th>
                    <th className="px-4 py-3.5">Keterangan</th>
                    <th className="px-4 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {arusKasResult.data.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-5 py-8 text-center text-slate-400">
                        Tidak ada catatan arus kas masuk pada bulan/filter yang dipilih.
                      </td>
                    </tr>
                  ) : (
                    arusKasResult.data.map((r, idx) => (
                      <tr key={r.id_pembayaran} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3.5 text-xs text-slate-400 font-medium">{idx + 1}</td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-800">{formatTanggal(r.tanggal_bayar)}</div>
                          <div className="text-[10px] text-slate-400">
                            ID Pembayaran: #{r.id_pembayaran}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-800">{r.nama_penyewa}</div>
                          <div className="text-xs text-slate-500 font-medium mt-0.5">
                            <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                              {r.kode_kontrakan}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="inline-flex items-center gap-1 font-bold text-slate-700 text-xs bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                            <Receipt className="w-3 h-3 text-slate-500" />
                            <span>{formatPeriodeNama(r.untuk_periode_tagihan)}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Status Tagihan: <span className={r.status_tagihan_sekarang === 'Lunas' ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>{r.status_tagihan_sekarang}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-extrabold text-emerald-700 text-sm">
                            +{formatRupiah(r.nominal_bayar)}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                            <CreditCard className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                            <span className="truncate max-w-[170px]" title={r.metode_pembayaran}>
                              {r.metode_pembayaran || 'Transfer Bank'}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600">
                          {r.catatan_bayar || '-'}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => handleDeletePembayaran(r.id_pembayaran)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus Transaksi Kas Ini"
                          >
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CATAT PEMBAYARAN BARU (INVOICE-BASED PARTIAL PAYMENT)            */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">
                  {formData.id_tagihan && !formData.isNewInvoice ? 'Catat Pembayaran Cicilan' : 'Catat Pembayaran Baru'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formData.id_tagihan && !formData.isNewInvoice
                    ? 'Catat pembayaran cicilan untuk tagihan yang dipilih'
                    : 'Pilih penyewa dan periode tagihan yang ingin dibayarkan'}
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition"
              >
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

              {/* Field 1: Pilih Penyewa */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Penyewa *</label>
                <select
                  value={formData.id_penyewa}
                  onChange={(e) => handlePenyewaChange(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Pilih Penyewa --</option>
                  {activeTenants.map((p) => {
                    const unit = kontrakanList.find(u => u.kode_kontrakan === (p.kode_unit_sekarang || p.kode_kontrakan));
                    const tarif = unit?.harga_saat_ini || p.harga_sewa_bulan;
                    return (
                      <option key={p.id_penyewa} value={p.id_penyewa}>
                        {p.nama_penyewa} ({p.kode_unit_sekarang || p.kode_kontrakan}) {tarif ? ` - Tarif: ${formatRupiah(tarif)}/bln` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* CARD INFO TARIF & UNIT KONTRAKAN (LANGSUNG MUNCUL SAAT PENYEWA DIPILIH) */}
              {selectedTenantObj && (
                <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 font-semibold">
                        Unit: <span className="text-slate-800 font-bold">{selectedUnitKode}</span> &bull; {selectedUnitObj?.nama_kontrakan || selectedTenantObj?.nama_kontrakan || 'Kontrakan'}
                      </div>
                      <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mt-0.5">
                        <span>Tarif Sewa Kontrakan:</span>
                        <span className="text-sm font-black text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300">
                          {formatRupiah(currentUnitRentPrice)}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-semibold">/ bulan</span>
                      </div>
                    </div>
                  </div>

                  {currentUnitRentPrice > 0 && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, nominal_bayar: String(currentUnitRentPrice) }))}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm shrink-0"
                      title="Gunakan tarif ini sebagai nominal pembayaran"
                    >
                      Gunakan Tarif
                    </button>
                  )}
                </div>
              )}

              {/* Field 2: Dropdown Pilih Periode Tagihan (HANYA YANG BELUM LUNAS) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-600">Pilih Periode Tagihan *</label>
                  {formData.id_penyewa && tenantUnpaidInvoices.length > 0 && (
                    <span className="text-[11px] text-rose-600 font-semibold">
                      {tenantUnpaidInvoices.length} tagihan belum lunas
                    </span>
                  )}
                </div>

                {!formData.id_penyewa ? (
                  <div className="w-full bg-slate-50 border border-dashed border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-400 italic">
                    Pilih penyewa terlebih dahulu untuk melihat daftar tagihan
                  </div>
                ) : (
                  <select
                    value={formData.id_tagihan}
                    onChange={(e) => handleTagihanChange(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Pilih Periode Tagihan --</option>
                    {tenantUnpaidInvoices.map((inv) => (
                      <option key={inv.id_tagihan} value={inv.id_tagihan}>
                        {formatPeriodeNama(inv.periode_bulan_tahun)} - Tarif: {formatRupiah(inv.harga_sewa_periode)} (Sisa: {formatRupiah(inv.sisa_tagihan)})
                      </option>
                    ))}
                    <option value="NEW_INVOICE">+ Buat Tagihan Baru untuk Periode Lain...</option>
                  </select>
                )}

                {formData.id_penyewa && tenantUnpaidInvoices.length === 0 && !formData.isNewInvoice && (
                  <div className="p-2.5 mt-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Semua tagihan penyewa ini telah lunas. Pilih "+ Buat Tagihan Baru" untuk periode baru.</span>
                  </div>
                )}
              </div>

              {/* Field Khusus Jika Membuat Tagihan Baru */}
              {formData.isNewInvoice && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-amber-800 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5" />
                      <span>Membuat Tagihan Periode Baru</span>
                    </div>
                    {currentUnitRentPrice > 0 && (
                      <div className="text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300">
                        Tarif: {formatRupiah(currentUnitRentPrice)}/bln
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Periode Bulan *</label>
                      <input
                        type="month"
                        value={formData.periode_baru}
                        onChange={(e) => setFormData({ ...formData, periode_baru: e.target.value })}
                        required
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Unit Kontrakan &amp; Tarif</label>
                      <div className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 flex items-center justify-between">
                        <span>{formData.kode_kontrakan || selectedUnitKode || 'Unit penyewa'}</span>
                        <span className="text-emerald-700 font-black">{formatRupiah(currentUnitRentPrice)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Detail Tagihan Terpilih */}
              {selectedInvoiceObj && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tarif Sewa</span>
                    <span className="font-bold text-slate-800">{formatRupiah(selectedInvoiceObj.harga_sewa_periode)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Telah Terbayar</span>
                    <span className="font-bold text-emerald-700">{formatRupiah(selectedInvoiceObj.total_terbayar)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Sisa Tunggakan</span>
                    <span className="font-bold text-rose-600">{formatRupiah(selectedInvoiceObj.sisa_tagihan)}</span>
                  </div>
                </div>
              )}

              {/* Field 3: Nominal Bayar & Tanggal Bayar */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-600">Nominal Bayar (Rp) *</label>
                    {currentUnitRentPrice > 0 && (
                      <span className="text-[10px] text-slate-500 font-medium">
                        Tarif: <strong className="text-emerald-700">{formatRupiah(currentUnitRentPrice)}</strong>
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    value={formData.nominal_bayar}
                    onChange={(e) => setFormData({ ...formData, nominal_bayar: e.target.value })}
                    required
                    placeholder={currentUnitRentPrice > 0 ? `Contoh: ${currentUnitRentPrice}` : "Contoh: 300000"}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {/* Shortcut Chips Pengisian Nominal Cepat */}
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {selectedInvoiceObj?.sisa_tagihan > 0 ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, nominal_bayar: String(selectedInvoiceObj.sisa_tagihan) }))}
                          className="text-[10px] px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded font-semibold transition cursor-pointer"
                        >
                          Lunasi Sisa ({formatRupiah(selectedInvoiceObj.sisa_tagihan)})
                        </button>
                        {selectedInvoiceObj.sisa_tagihan >= 200000 && (
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, nominal_bayar: String(Math.round(selectedInvoiceObj.sisa_tagihan / 2)) }))}
                            className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold transition cursor-pointer"
                          >
                            Cicil 50%
                          </button>
                        )}
                      </>
                    ) : currentUnitRentPrice > 0 ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, nominal_bayar: String(currentUnitRentPrice) }))}
                          className="text-[10px] px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded font-semibold transition cursor-pointer"
                        >
                          Bayar Penuh ({formatRupiah(currentUnitRentPrice)})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, nominal_bayar: String(Math.round(currentUnitRentPrice / 2)) }))}
                          className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold transition cursor-pointer"
                        >
                          Cicil 50%
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Bayar *</label>
                  <input
                    type="date"
                    value={formData.tanggal_bayar}
                    onChange={(e) => setFormData({ ...formData, tanggal_bayar: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Field 4: Dropdown Wajib Pilih Metode Pembayaran / Rekening Tujuan */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pilih Metode Pembayaran / Rekening Tujuan *</span>
                  </label>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Wajib untuk Mutasi
                  </span>
                </div>
                <select
                  value={formData.metode_pembayaran}
                  onChange={(e) => setFormData({ ...formData, metode_pembayaran: e.target.value })}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">-- Pilih Metode / Rekening Tujuan --</option>
                  <optgroup label="Transfer Bank">
                    {metodeOptions
                      .filter(m => (m.group || '').toLowerCase().includes('transfer') || (m.group || '').toLowerCase().includes('bank'))
                      .map((m, idx) => (
                        <option key={idx} value={m.value || m.label}>
                          {m.label}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="QRIS & E-Wallet">
                    {metodeOptions
                      .filter(m => (m.group || '').toLowerCase().includes('qris') || (m.group || '').toLowerCase().includes('digital'))
                      .map((m, idx) => (
                        <option key={idx} value={m.value || m.label}>
                          {m.label}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Tunai / Cash">
                    {metodeOptions
                      .filter(m => (m.group || '').toLowerCase().includes('tunai') || (m.group || '').toLowerCase().includes('cash'))
                      .map((m, idx) => (
                        <option key={idx} value={m.value || m.label}>
                          {m.label}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              {/* Field 5: Catatan */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Catatan Tambahan (Opsional)</label>
                <textarea
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  rows="2"
                  placeholder="Keterangan tambahan (misal: titip via pengurus, cicilan 1 dari 2, dll)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  {formData.id_tagihan && !formData.isNewInvoice ? 'Simpan Cicilan' : 'Simpan Pembayaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: POP-UP LIHAT DETAIL RIWAYAT PEMBAYARAN PADA TAGIHAN              */}
      {/* ========================================================================= */}
      {detailModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                  Detail Riwayat Pembayaran
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {detailModalItem.nama_penyewa} &bull; Unit {detailModalItem.kode_kontrakan} ({formatPeriodeNama(detailModalItem.periode_bulan_tahun)})
                </p>
              </div>
              <button
                onClick={() => setDetailModalItem(null)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Ringkasan Status Tagihan */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">Tarif Sewa</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {formatRupiah(detailModalItem.harga_sewa_periode)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Total Terbayar</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    {formatRupiah(detailModalItem.total_terbayar)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Sisa Tunggakan</span>
                  <span className={`font-bold text-sm ${detailModalItem.sisa_tagihan > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                    {formatRupiah(detailModalItem.sisa_tagihan)}
                  </span>
                </div>
              </div>

              {/* Info Jatuh Tempo & Keterlambatan */}
              <div className="flex items-center justify-between text-xs px-1 text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Jatuh Tempo: <strong>Tanggal {detailModalItem.breakdown?.dueDay || 5}</strong> setiap bulan</span>
                </div>
                {detailModalItem.breakdown?.lagDays > 0 ? (
                  <span className="text-amber-600 font-semibold">
                    Terlambat {detailModalItem.breakdown.lagDays} hari
                  </span>
                ) : (
                  <span className="text-emerald-600 font-semibold">
                    Tepat Waktu
                  </span>
                )}
              </div>

              {/* Tabel List Riwayat Transaksi */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Daftar Cicilan / Pembayaran Masuk
                  </h4>
                  <span className="text-xs text-slate-500 font-medium">
                    {(detailModalItem.riwayat_transaksi || []).length} kali pembayaran
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="px-3.5 py-2.5">No</th>
                        <th className="px-3.5 py-2.5">Tanggal Bayar</th>
                        <th className="px-3.5 py-2.5">Nominal</th>
                        <th className="px-3.5 py-2.5">Metode / Rekening</th>
                        <th className="px-3.5 py-2.5">Catatan</th>
                        <th className="px-3.5 py-2.5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(detailModalItem.riwayat_transaksi || []).length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-3.5 py-4 text-center text-slate-400 italic">
                            Belum ada riwayat pembayaran yang tercatat untuk tagihan ini.
                          </td>
                        </tr>
                      ) : (
                        (detailModalItem.riwayat_transaksi || []).map((r, idx) => (
                          <tr key={r.id_pembayaran || idx} className="hover:bg-slate-50 transition">
                            <td className="px-3.5 py-2.5 font-medium text-slate-500">{idx + 1}</td>
                            <td className="px-3.5 py-2.5 font-semibold text-slate-800">{formatTanggal(r.tanggal_bayar)}</td>
                            <td className="px-3.5 py-2.5 font-bold text-emerald-700">{formatRupiah(r.nominal_bayar)}</td>
                            <td className="px-3.5 py-2.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                <CreditCard className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                <span>{r.metode_pembayaran || 'Transfer Bank'}</span>
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-500">{r.catatan || '-'}</td>
                            <td className="px-3.5 py-2.5 text-right">
                              <button
                                onClick={() => handleDeletePembayaran(r.id_pembayaran)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                                title="Hapus Pembayaran Ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setDetailModalItem(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
                >
                  Tutup
                </button>
                {detailModalItem.sisa_tagihan > 0 && (
                  <button
                    onClick={() => {
                      const target = detailModalItem;
                      setDetailModalItem(null);
                      openPayModalForInvoice(target);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Catat Pembayaran Cicilan</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
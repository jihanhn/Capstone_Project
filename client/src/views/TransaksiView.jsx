import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, CheckCircle2, Clock, AlertCircle, RefreshCw, X, 
  ShieldAlert, Timer, Lock, Receipt, Calendar, CreditCard, ChevronRight, Info
} from 'lucide-react';
import { formatRupiah, formatTanggal } from '../utils/formatters';
import { showToast } from '../utils/toast';

export default function TransaksiView({ initialFilterUnit = '', initialFilterStatus = '', onFilterClear }) {
  const [transaksiList, setTransaksiList] = useState([]);
  const [allTagihanList, setAllTagihanList] = useState([]);
  const [kontrakanList, setKontrakanList] = useState([]);
  const [penyewaList, setPenyewaList] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
  const [filterPeriode, setFilterPeriode] = useState(`${currentYear}-${currentMonth}`);
  const [filterStatus, setFilterStatus] = useState(initialFilterStatus);
  const [filterUnit, setFilterUnit] = useState(initialFilterUnit);

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

  useEffect(() => {
    fetchData();
  }, [filterPeriode, filterStatus, filterUnit]);

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

    // Cari tagihan belum lunas milik penyewa ini
    const unpaid = allTagihanList.filter(t => t.id_penyewa === idPenyewa && (t.sisa_tagihan || 0) > 0);
    const firstInvoice = unpaid[0];

    setFormData(prev => ({
      ...prev,
      id_penyewa: idPenyewa,
      kode_kontrakan: kodeUnit,
      id_tagihan: firstInvoice ? String(firstInvoice.id_tagihan) : (unpaid.length === 0 ? 'NEW_INVOICE' : ''),
      isNewInvoice: unpaid.length === 0,
      nominal_bayar: firstInvoice ? firstInvoice.sisa_tagihan : ''
    }));
  };

  // Handle pilih tagihan dari dropdown
  const handleTagihanChange = (val) => {
    if (val === 'NEW_INVOICE') {
      const unit = kontrakanList.find(u => u.kode_kontrakan === formData.kode_kontrakan);
      setFormData(prev => ({
        ...prev,
        id_tagihan: 'NEW_INVOICE',
        isNewInvoice: true,
        nominal_bayar: unit ? unit.harga_saat_ini : ''
      }));
      return;
    }

    const inv = allTagihanList.find(t => String(t.id_tagihan) === String(val));
    setFormData(prev => ({
      ...prev,
      id_tagihan: val,
      isNewInvoice: false,
      nominal_bayar: inv ? inv.sisa_tagihan : ''
    }));
  };

  const openCreateModal = () => {
    setFormData({
      id_penyewa: '',
      id_tagihan: '',
      isNewInvoice: false,
      periode_baru: filterPeriode || `${currentYear}-${currentMonth}`,
      kode_kontrakan: '',
      nominal_bayar: '',
      tanggal_bayar: new Date().toISOString().split('T')[0],
      catatan: ''
    });
    setErrorMessage('');
    setIsCreateModalOpen(true);
  };

  // Quick action: buka modal pembayaran untuk tagihan tertentu
  const openPayModalForInvoice = (inv) => {
    setFormData({
      id_penyewa: inv.id_penyewa,
      id_tagihan: String(inv.id_tagihan),
      isNewInvoice: false,
      periode_baru: inv.periode_bulan_tahun,
      kode_kontrakan: inv.kode_kontrakan,
      nominal_bayar: inv.sisa_tagihan > 0 ? inv.sisa_tagihan : '',
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

    try {
      const payload = {
        nominal_bayar: nominal,
        tanggal_bayar: formData.tanggal_bayar,
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
      fetchData();
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

  // Ringkasan Header
  const totalPenyewa = transaksiList.length;
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pembayaran Tepat Waktu</span>
            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><CheckCircle2 className="w-4 h-4" /></div>
          </div>
          <div className="mt-2">
            <div className="text-3xl font-extrabold text-emerald-600">{persenTepatWaktu}%</div>
            <div className="text-xs font-medium text-slate-500 mt-1">{tepatWaktu} penyewa dari total tagihan</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-rose-200 bg-rose-50/30 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700">Tunggakan Aktif</span>
            <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg"><ShieldAlert className="w-4 h-4" /></div>
          </div>
          <div className="mt-2 relative z-10">
            <div className="text-3xl font-extrabold text-rose-600">{formatRupiah(totalTunggakan)}</div>
            <div className="text-xs font-medium text-rose-600/80 mt-1 flex items-center space-x-1">
              <span>{jumlahPenyewaNunggak} penyewa menunggak</span>
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 text-rose-100 opacity-50 z-0"><ShieldAlert className="w-24 h-24" /></div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Rata-rata Keterlambatan</span>
            <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg"><Timer className="w-4 h-4" /></div>
          </div>
          <div className="mt-2">
            <div className="text-3xl font-extrabold text-slate-800">
              {rataRataTerlambat} <span className="text-base font-semibold text-slate-500">hari</span>
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">Dihitung dari tanggal jatuh tempo</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-t-2xl shadow-sm border border-b-0 border-slate-200 flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <input 
            type="month" 
            value={filterPeriode} 
            onChange={(e) => setFilterPeriode(e.target.value)} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500" 
          />
        </div>
        <div className="flex-1 w-full">
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
        <div className="flex-1 w-full">
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Status</option>
            <option value="Lunas">LUNAS</option>
            <option value="Belum Lunas">BELUM LUNAS</option>
          </select>
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button 
            onClick={() => { setFilterPeriode(''); setFilterStatus(''); setFilterUnit(''); }} 
            className="flex-1 sm:flex-none py-2 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
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

      {/* Main Table */}
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
                <th className="px-4 py-3.5">Tanggal Bayar</th>
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
                  // Nilai Total Terbayar pada sebuah tagihan didapat dari fungsi reduce() atau SUM dari seluruh nominal_bayar di riwayat_transaksi
                  const totalTerbayar = (t.riwayat_transaksi || []).reduce(
                    (acc, curr) => acc + (parseFloat(curr.nominal_bayar) || 0), 
                    0
                  ) || (parseFloat(t.total_terbayar) || 0);

                  const tarifSewa = parseFloat(t.harga_sewa_periode) || 0;
                  // Rumus Sisa Tunggakan = Tarif Sewa - Total Terbayar
                  const sisaTunggakan = Math.max(0, tarifSewa - totalTerbayar);
                  // Status: JIKA Total Terbayar >= Tarif Sewa -> LUNAS, JIKA kurang -> BELUM LUNAS
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
                        {sisaTunggakan > 0 && (
                          <div className="text-xs text-rose-600 font-bold mt-0.5">
                            Tunggakan: {formatRupiah(sisaTunggakan)}
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
                          <div className="font-medium text-slate-700">
                            {formatTanggal(t.tgl_bayar_terakhir || t.tgl_lunas)}
                          </div>
                        ) : (
                          <div className="text-slate-400 italic text-xs">-</div>
                        )}
                        {t.breakdown?.lagDays > 0 ? (
                          <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
                            Terlambat {t.breakdown.lagDays} hari
                          </div>
                        ) : isLunas ? (
                          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                            Tepat Waktu
                          </div>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {/* Tombol Lihat Detail: pop-up kecil yang me-map/melist array riwayat_transaksi */}
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

      {/* ========================================================================= */}
      {/* MODAL 1: CATAT PEMBAYARAN BARU (INVOICE-BASED PARTIAL PAYMENT)            */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Catat Pembayaran Baru</h3>
                <p className="text-xs text-slate-500 mt-0.5">Pilih penyewa dan periode tagihan yang ingin dibayarkan</p>
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
                  {activeTenants.map((p) => (
                    <option key={p.id_penyewa} value={p.id_penyewa}>
                      {p.nama_penyewa} ({p.kode_unit_sekarang || p.kode_kontrakan})
                    </option>
                  ))}
                </select>
              </div>

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
                        {formatPeriodeNama(inv.periode_bulan_tahun)} - Sisa {formatRupiah(inv.sisa_tagihan)}
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
                  <div className="text-xs font-bold text-amber-800 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    <span>Membuat Tagihan Periode Baru</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Periode Bulan *</label>
                      <input
                        type="month"
                        value={formData.periode_baru}
                        onChange={(e) => setFormData({ ...formData, periode_baru: e.target.value })}
                        required
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Unit Kontrakan</label>
                      <div className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                        {formData.kode_kontrakan || 'Unit penyewa'}
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
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nominal Bayar (Rp) *</label>
                  <input
                    type="number"
                    value={formData.nominal_bayar}
                    onChange={(e) => setFormData({ ...formData, nominal_bayar: e.target.value })}
                    required
                    placeholder="Contoh: 300000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
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

              {/* Field 4: Catatan */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Catatan (Opsional)</label>
                <textarea
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  rows="2"
                  placeholder="Keterangan pembayaran (misal: transfer BCA, cicilan 1, dll)..."
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
                  Simpan Pembayaran
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
                        <th className="px-3.5 py-2.5">Catatan</th>
                        <th className="px-3.5 py-2.5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(detailModalItem.riwayat_transaksi || []).length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-3.5 py-4 text-center text-slate-400 italic">
                            Belum ada riwayat pembayaran yang tercatat untuk tagihan ini.
                          </td>
                        </tr>
                      ) : (
                        (detailModalItem.riwayat_transaksi || []).map((r, idx) => (
                          <tr key={r.id_pembayaran || idx} className="hover:bg-slate-50 transition">
                            <td className="px-3.5 py-2.5 font-medium text-slate-500">{idx + 1}</td>
                            <td className="px-3.5 py-2.5 font-semibold text-slate-800">{formatTanggal(r.tanggal_bayar)}</td>
                            <td className="px-3.5 py-2.5 font-bold text-emerald-700">{formatRupiah(r.nominal_bayar)}</td>
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
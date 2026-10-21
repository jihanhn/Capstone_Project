import React, { useState, useEffect } from 'react';
import {
  Save,
  CheckCircle2,
  Upload,
  Home,
  Users,
  UserPlus,
  Shield,
  Key,
  Trash2,
  Edit,
  Lock,
  Wallet,
  CreditCard,
  Bell,
  Database,
  Download,
  RefreshCw,
  AlertCircle,
  Copy,
  Plus,
  X,
  Check,
  Phone,
  Mail,
  Building,
  FileText
} from 'lucide-react';
import { formatRupiah } from '../utils/formatters';
import { showToast } from '../utils/toast';

// Default Data untuk Inisialisasi LocalStorage
const DEFAULT_USERS = [
  {
    id: 'USR-001',
    nama: 'Admin Buti',
    username: 'admin',
    email: 'admin@kontrakan.com',
    no_hp: '0812-3456-7890',
    role: 'Super Admin',
    jabatan: 'Pengelola Utama',
    status: 'Aktif',
    avatarColor: 'emerald',
    lastActive: 'Hari ini, 10:15'
  },
  {
    id: 'USR-002',
    nama: 'Siti Nurhaliza',
    username: 'siti_operasional',
    email: 'siti@kontrakan.com',
    no_hp: '0857-1122-3344',
    role: 'Pengelola',
    jabatan: 'Koordinator Lapangan',
    status: 'Aktif',
    avatarColor: 'blue',
    lastActive: 'Kemarin, 16:30'
  },
  {
    id: 'USR-003',
    nama: 'Rian Ardianto',
    username: 'rian_finance',
    email: 'rian@kontrakan.com',
    no_hp: '0819-9988-7766',
    role: 'Staf Keuangan',
    jabatan: 'Admin Keuangan & Kas',
    status: 'Aktif',
    avatarColor: 'indigo',
    lastActive: '3 hari yang lalu'
  }
];

const DEFAULT_KATEGORI_BIAYA = [
  { id: 'KAT-01', nama: 'Perbaikan Gedung/Fasilitas', plafon: 2500000, deskripsi: 'Pengecatan, atap bocor, pintu, dan sanitasi' },
  { id: 'KAT-02', nama: 'Listrik & Air Bersama', plafon: 750000, deskripsi: 'Pompa air sumur dan penerangan lorong bersama' },
  { id: 'KAT-03', nama: 'Kebersihan & Keamanan', plafon: 500000, deskripsi: 'Iuran sampah RT/RW dan keamanan lingkungan' },
  { id: 'KAT-04', nama: 'Pajak Bumi & Bangunan (PBB)', plafon: 1200000, deskripsi: 'Alokasi bulanan untuk pelunasan PBB tahunan' },
  { id: 'KAT-05', nama: 'Kas Operasional & ATK', plafon: 300000, deskripsi: 'Kuitansi fisik, materai, dan administrasi' },
  { id: 'KAT-06', nama: 'Dana Cadangan Darurat', plafon: 1500000, deskripsi: 'Plafon antisipasi kerusakan mendesak fasilitas utama' }
];

const DEFAULT_METODE_BAYAR = [
  { id: 'MET-01', nama: 'BCA (Bank Central Asia)', nomor: '8830-123-456', atasNama: 'Ibu Buti', aktif: true, tipe: 'Transfer Bank' },
  { id: 'MET-02', nama: 'Bank Mandiri', nomor: '137-00-9876543-2', atasNama: 'Ibu Buti', aktif: true, tipe: 'Transfer Bank' },
  { id: 'MET-03', nama: 'Bank BRI', nomor: '0206-01-054321-50-8', atasNama: 'Kontrakan Buti', aktif: true, tipe: 'Transfer Bank' },
  { id: 'MET-04', nama: 'QRIS Semua Bank & E-Wallet', nomor: 'ID102003004050', atasNama: 'KONTRAKAN BUTI OFFICIAL', aktif: true, tipe: 'QRIS / Digital' },
  { id: 'MET-05', nama: 'Tunai Langsung (Cash)', nomor: '-', atasNama: 'Pengelola Lapangan (Ibu Buti / Siti)', aktif: true, tipe: 'Tunai' }
];

const DEFAULT_WA_TEMPLATE = `Halo Bapak/Ibu {nama_penyewa},
Semoga selalu sehat. Kami dari Pengelola {nama_usaha} menginformasikan tagihan sewa unit {kode_kontrakan} untuk periode {periode} sebesar {nominal}.

Jatuh tempo pembayaran: {jatuh_tempo}.
Pembayaran dapat ditransfer ke:
{rekening_tujuan}

Konfirmasi pembayaran atau kendala sewa silakan hubungi WhatsApp kami. Terima kasih atas kerjasamanya! 🙏`;

export default function PengaturanView({ initialTab = 'profil', onTabChange, currentUser, onUserUpdate }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Pengaturan berhasil disimpan!');

  // Sync dengan prop initialTab jika berubah dari luar (misal dari menu Header)
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (onTabChange) onTabChange(tabId);
  };

  // State Form Profil Usaha
  const [profil, setProfil] = useState({
    nama: 'Kontrakan Buti',
    alamat: 'Jl. Contoh No. 123, Jakarta',
    kontak: '0812-1234-5678',
    email: 'kontrakanbuti@email.com'
  });

  // State Toggles Pengaturan Sistem
  const [settings, setSettings] = useState({
    notifJatuhTempo: true,
    notifUnitKosong: true,
    notifPemeliharaan: true,
    laporanOtomatis: false,
    modeMaintenance: false
  });

  // State Manajemen Pengguna
  const [usersList, setUsersList] = useState([]);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [userFormData, setUserFormData] = useState({
    id: '',
    nama: '',
    username: '',
    email: '',
    no_hp: '',
    role: 'Pengelola',
    jabatan: 'Staf Operasional',
    status: 'Aktif',
    password: '',
    avatarColor: 'emerald'
  });

  // State Kategori Biaya
  const [kategoriList, setKategoriList] = useState([]);
  const [kategoriModalOpen, setKategoriModalOpen] = useState(false);
  const [kategoriFormData, setKategoriFormData] = useState({
    id: '',
    nama: '',
    plafon: '',
    deskripsi: ''
  });

  // State Metode Pembayaran
  const [metodeList, setMetodeList] = useState([]);
  const [metodeModalOpen, setMetodeModalOpen] = useState(false);
  const [metodeFormData, setMetodeFormData] = useState({
    id: '',
    nama: '',
    nomor: '',
    atasNama: '',
    tipe: 'Transfer Bank',
    aktif: true
  });

  // State Notifikasi & WhatsApp
  const [notifConfig, setNotifConfig] = useState({
    waH7: true,
    waH3: true,
    waEwsHigh: true,
    waUnitKosong14: true,
    waBuktiLunas: true,
    waLaporanMingguan: false,
    waTemplate: DEFAULT_WA_TEMPLATE
  });
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  // State Backup Data
  const [restoreStatus, setRestoreStatus] = useState('');
  const [restoreError, setRestoreError] = useState('');

  // Load data dari localStorage
  useEffect(() => {
    try {
      const savedProfil = localStorage.getItem('kb_profil');
      if (savedProfil) setProfil(JSON.parse(savedProfil));

      const savedSettings = localStorage.getItem('kb_settings');
      if (savedSettings) setSettings(JSON.parse(savedSettings));

      const savedUsers = localStorage.getItem('kb_users_list');
      if (savedUsers) {
        setUsersList(JSON.parse(savedUsers));
      } else {
        setUsersList(DEFAULT_USERS);
        localStorage.setItem('kb_users_list', JSON.stringify(DEFAULT_USERS));
      }

      const savedKategori = localStorage.getItem('kb_kategori_biaya');
      if (savedKategori) {
        setKategoriList(JSON.parse(savedKategori));
      } else {
        setKategoriList(DEFAULT_KATEGORI_BIAYA);
        localStorage.setItem('kb_kategori_biaya', JSON.stringify(DEFAULT_KATEGORI_BIAYA));
      }

      const savedMetode = localStorage.getItem('kb_metode_pembayaran');
      if (savedMetode) {
        setMetodeList(JSON.parse(savedMetode));
      } else {
        setMetodeList(DEFAULT_METODE_BAYAR);
        localStorage.setItem('kb_metode_pembayaran', JSON.stringify(DEFAULT_METODE_BAYAR));
      }

      const savedNotif = localStorage.getItem('kb_notif_config');
      if (savedNotif) {
        setNotifConfig(JSON.parse(savedNotif));
      } else {
        localStorage.setItem('kb_notif_config', JSON.stringify(notifConfig));
      }
    } catch (e) {
      console.warn('Gagal membaca preferensi:', e);
    }
  }, []);

  const triggerToast = (msg = 'Perubahan berhasil disimpan!') => {
    setSuccessMessage(msg);
    setShowSuccess(true);
    showToast('success', msg);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  // Simpan Profil & Pengaturan Sistem
  const handleSaveProfil = () => {
    setIsSaving(true);
    setTimeout(() => {
      localStorage.setItem('kb_profil', JSON.stringify(profil));
      localStorage.setItem('kb_settings', JSON.stringify(settings));
      window.dispatchEvent(new CustomEvent('kb_profil_updated', { detail: profil }));
      setIsSaving(false);
      triggerToast('Profil usaha & pengaturan sistem berhasil disimpan!');
    }, 500);
  };

  // User Handlers
  const openAddUser = () => {
    setIsEditingUser(false);
    setUserFormData({
      id: `USR-00${usersList.length + 1}`,
      nama: '',
      username: '',
      email: '',
      no_hp: '',
      role: 'Pengelola',
      jabatan: 'Koordinator Lapangan',
      status: 'Aktif',
      password: '',
      avatarColor: 'emerald'
    });
    setUserModalOpen(true);
  };

  const openEditUser = (user) => {
    setIsEditingUser(true);
    setUserFormData({
      ...user,
      password: ''
    });
    setUserModalOpen(true);
  };

  const handleSaveUser = (e) => {
    e.preventDefault();
    let updated;
    if (isEditingUser) {
      updated = usersList.map(u => u.id === userFormData.id ? { ...userFormData, password: u.password } : u);
      // Jika yang diedit adalah user yang sedang login
      if (currentUser && currentUser.id === userFormData.id && onUserUpdate) {
        onUserUpdate({ ...currentUser, ...userFormData });
      }
    } else {
      updated = [...usersList, { ...userFormData, lastActive: 'Baru saja' }];
    }
    setUsersList(updated);
    localStorage.setItem('kb_users_list', JSON.stringify(updated));
    setUserModalOpen(false);
    triggerToast(isEditingUser ? 'Data pengguna berhasil diperbarui!' : 'Pengguna baru berhasil ditambahkan!');
  };

  const handleDeleteUser = (id) => {
    if (usersList.length <= 1) {
      alert('Sistem harus memiliki minimal satu pengguna (Super Admin).');
      return;
    }
    if (confirm('Yakin ingin menghapus akun pengguna ini?')) {
      const updated = usersList.filter(u => u.id !== id);
      setUsersList(updated);
      localStorage.setItem('kb_users_list', JSON.stringify(updated));
      triggerToast('Pengguna telah dihapus dari sistem.');
    }
  };

  const toggleUserStatus = (id) => {
    const updated = usersList.map(u => {
      if (u.id === id) {
        const newStatus = u.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
        return { ...u, status: newStatus };
      }
      return u;
    });
    setUsersList(updated);
    localStorage.setItem('kb_users_list', JSON.stringify(updated));
    triggerToast('Status akun pengguna berhasil diubah!');
  };

  // Kategori Biaya Handlers
  const handleSaveKategori = (e) => {
    e.preventDefault();
    let updated;
    if (kategoriFormData.id) {
      updated = kategoriList.map(k => k.id === kategoriFormData.id ? kategoriFormData : k);
    } else {
      const newKat = {
        ...kategoriFormData,
        id: `KAT-0${kategoriList.length + 1}`,
        plafon: parseFloat(kategoriFormData.plafon) || 0
      };
      updated = [...kategoriList, newKat];
    }
    setKategoriList(updated);
    localStorage.setItem('kb_kategori_biaya', JSON.stringify(updated));
    setKategoriModalOpen(false);
    triggerToast('Kategori biaya berhasil disimpan!');
  };

  const handleDeleteKategori = (id) => {
    if (confirm('Hapus kategori biaya ini?')) {
      const updated = kategoriList.filter(k => k.id !== id);
      setKategoriList(updated);
      localStorage.setItem('kb_kategori_biaya', JSON.stringify(updated));
      triggerToast('Kategori biaya dihapus.');
    }
  };

  // Metode Pembayaran Handlers
  const handleSaveMetode = (e) => {
    e.preventDefault();
    let updated;
    if (metodeFormData.id) {
      updated = metodeList.map(m => m.id === metodeFormData.id ? metodeFormData : m);
    } else {
      const newMetode = {
        ...metodeFormData,
        id: `MET-0${metodeList.length + 1}`
      };
      updated = [...metodeList, newMetode];
    }
    setMetodeList(updated);
    localStorage.setItem('kb_metode_pembayaran', JSON.stringify(updated));
    setMetodeModalOpen(false);
    triggerToast('Metode pembayaran berhasil disimpan!');
  };

  const toggleMetodeStatus = (id) => {
    const updated = metodeList.map(m => m.id === id ? { ...m, aktif: !m.aktif } : m);
    setMetodeList(updated);
    localStorage.setItem('kb_metode_pembayaran', JSON.stringify(updated));
    triggerToast('Status metode pembayaran diperbarui!');
  };

  const handleDeleteMetode = (id) => {
    if (confirm('Hapus metode pembayaran ini?')) {
      const updated = metodeList.filter(m => m.id !== id);
      setMetodeList(updated);
      localStorage.setItem('kb_metode_pembayaran', JSON.stringify(updated));
      triggerToast('Metode pembayaran dihapus.');
    }
  };

  // Notifikasi & WA Handlers
  const handleSaveNotifConfig = () => {
    localStorage.setItem('kb_notif_config', JSON.stringify(notifConfig));
    triggerToast('Konfigurasi notifikasi & template WhatsApp disimpan!');
  };

  const copyTemplateToClipboard = () => {
    navigator.clipboard.writeText(notifConfig.waTemplate);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  // Backup & Restore Handlers
  const handleDownloadBackup = async () => {
    try {
      setIsSaving(true);
      const [resUnit, resPenyewa, resTrx, resBiaya] = await Promise.all([
        fetch('/api/kontrakan').then(r => r.json()).catch(() => []),
        fetch('/api/penyewa').then(r => r.json()).catch(() => []),
        fetch('/api/transaksi').then(r => r.json()).catch(() => []),
        fetch('/api/biaya').then(r => r.json()).catch(() => [])
      ]);

      const backupData = {
        metadata: {
          system: 'Kontrakan Buti BI',
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          usaha: profil.nama
        },
        database: {
          kontrakan: resUnit,
          penyewa: resPenyewa,
          transaksi: resTrx,
          biaya: resBiaya
        },
        settings: {
          profil,
          settings,
          users: usersList,
          kategoriBiaya: kategoriList,
          metodePembayaran: metodeList,
          notifConfig
        }
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_kontrakan_buti_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setIsSaving(false);
      triggerToast('File backup database berhasil diunduh!');
    } catch (err) {
      setIsSaving(false);
      alert('Gagal membuat backup: ' + err.message);
    }
  };

  const handleRestoreFile = (e) => {
    const file = e.target.files[0];
    setRestoreError('');
    setRestoreStatus('');
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed.metadata || !parsed.database) {
          throw new Error('Format file backup tidak valid atau rusak.');
        }

        const countUnits = parsed.database.kontrakan?.length || 0;
        const countPenyewa = parsed.database.penyewa?.length || 0;
        const countTrx = parsed.database.transaksi?.length || 0;

        setRestoreStatus(`File terverifikasi: ${countUnits} Unit, ${countPenyewa} Penyewa, ${countTrx} Transaksi. Silakan klik Terapkan Pemulihan.`);
        
        // Simpan sementara di window untuk diterapkan
        window.__pendingRestoreData = parsed;
      } catch (err) {
        setRestoreError('File gagal dibaca: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const applyRestore = () => {
    if (!window.__pendingRestoreData) {
      alert('Silakan pilih file backup JSON yang valid terlebih dahulu.');
      return;
    }
    const data = window.__pendingRestoreData;
    if (confirm('Terapkan pemulihan data pengaturan dan konfigurasi dari file backup ini?')) {
      if (data.settings?.profil) {
        localStorage.setItem('kb_profil', JSON.stringify(data.settings.profil));
        setProfil(data.settings.profil);
      }
      if (data.settings?.settings) {
        localStorage.setItem('kb_settings', JSON.stringify(data.settings.settings));
        setSettings(data.settings.settings);
      }
      if (data.settings?.users) {
        localStorage.setItem('kb_users_list', JSON.stringify(data.settings.users));
        setUsersList(data.settings.users);
      }
      if (data.settings?.kategoriBiaya) {
        localStorage.setItem('kb_kategori_biaya', JSON.stringify(data.settings.kategoriBiaya));
        setKategoriList(data.settings.kategoriBiaya);
      }
      if (data.settings?.metodePembayaran) {
        localStorage.setItem('kb_metode_pembayaran', JSON.stringify(data.settings.metodePembayaran));
        setMetodeList(data.settings.metodePembayaran);
      }
      setRestoreStatus('Data pengaturan berhasil dipulihkan!');
      triggerToast('Pemulihan data berhasil diterapkan!');
    }
  };

  const tabs = [
    { id: 'profil', label: 'Profil Usaha', icon: Building },
    { id: 'pengguna', label: 'Pengguna', icon: Users },
    { id: 'kategori', label: 'Kategori Biaya', icon: Wallet },
    { id: 'metode', label: 'Metode Pembayaran', icon: CreditCard },
    { id: 'notifikasi', label: 'Notifikasi & WA', icon: Bell },
    { id: 'backup', label: 'Backup & Restore', icon: Database },
  ];

  const ToggleSwitch = ({ label, description, checked, onChange }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <div>
        <span className="text-sm text-slate-700 font-semibold block">{label}</span>
        {description && <span className="text-xs text-slate-400 block mt-0.5">{description}</span>}
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? 'bg-emerald-600' : 'bg-slate-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Pengaturan */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Pengaturan Sistem</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola data master bisnis, akun pengguna pengelola, metode bayar, dan notifikasi BI
          </p>
        </div>

        {showSuccess && (
          <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-emerald-800 text-xs font-bold animate-in slide-in-from-right-4">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto space-x-2 border-b border-slate-200 pb-1 scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`whitespace-nowrap px-4 py-2.5 rounded-t-xl text-sm font-semibold transition-all flex items-center space-x-2 ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-b-2 border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: PROFIL USAHA */}
      {activeTab === 'profil' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Kolom 1: Profil Usaha */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Identitas Usaha</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">Master Data</span>
            </div>
            <div className="p-6 space-y-4 flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Usaha</label>
                <input
                  type="text"
                  value={profil.nama}
                  onChange={(e) => setProfil({...profil, nama: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Alamat Lengkap</label>
                <input
                  type="text"
                  value={profil.alamat}
                  onChange={(e) => setProfil({...profil, alamat: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">No. Kontak / WA</label>
                  <input
                    type="text"
                    value={profil.kontak}
                    onChange={(e) => setProfil({...profil, kontak: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email Resmi</label>
                  <input
                    type="email"
                    value={profil.email}
                    onChange={(e) => setProfil({...profil, email: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ikon / Logo Usaha</label>
                <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="w-12 h-12 bg-emerald-700 rounded-xl text-white flex items-center justify-center font-black shadow-sm">
                    <Home className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-700">{profil.nama}</p>
                    <p className="text-[11px] text-slate-400">Format PNG/JPG atau Ikon Sistem</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => alert('Logo sistem disesuaikan secara dinamis.')}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg transition"
                  >
                    Ganti Ikon
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Kolom 2: Pengaturan Sistem */}
          <div className="flex flex-col space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Preferensi Sistem BI</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700">Otomasi</span>
              </div>
              <div className="p-6 space-y-1 flex-1">
                <ToggleSwitch 
                  label="Notifikasi pembayaran jatuh tempo" 
                  description="Munculkan peringatan otomatis saat tagihan mendekati atau lewat tanggal 5"
                  checked={settings.notifJatuhTempo} 
                  onChange={() => setSettings({...settings, notifJatuhTempo: !settings.notifJatuhTempo})} 
                />
                <ToggleSwitch 
                  label="Notifikasi unit kosong" 
                  description="Peringatkan jika terdapat unit kosong tanpa penyewa lebih dari 7 hari"
                  checked={settings.notifUnitKosong} 
                  onChange={() => setSettings({...settings, notifUnitKosong: !settings.notifUnitKosong})} 
                />
                <ToggleSwitch 
                  label="Notifikasi pemeliharaan" 
                  description="Catat pengeluaran rutin dan rekomendasi servis berkala fasilitas"
                  checked={settings.notifPemeliharaan} 
                  onChange={() => setSettings({...settings, notifPemeliharaan: !settings.notifPemeliharaan})} 
                />
                <ToggleSwitch 
                  label="Laporan bulanan otomatis" 
                  description="Kirim ringkasan laba rugi bulanan ke email dan panel notifikasi"
                  checked={settings.laporanOtomatis} 
                  onChange={() => setSettings({...settings, laporanOtomatis: !settings.laporanOtomatis})} 
                />
                <ToggleSwitch 
                  label="Mode maintenance" 
                  description="Batasi akses perubahan data saat proses audit akhir tahun"
                  checked={settings.modeMaintenance} 
                  onChange={() => setSettings({...settings, modeMaintenance: !settings.modeMaintenance})} 
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-end">
              <button
                onClick={handleSaveProfil}
                disabled={isSaving}
                className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition flex items-center space-x-2"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                <span>Simpan Pengaturan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PENGGUNA (MANAJEMEN PENGGUNA) */}
      {activeTab === 'pengguna' && (
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Manajemen Pengguna & Otoritas Sistem</h3>
              <p className="text-xs text-slate-500 mt-0.5">Kelola akun staf pengelola, peran akses, dan kredensial sistem</p>
            </div>
            <button
              onClick={openAddUser}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Pengguna Baru</span>
            </button>
          </div>

          {/* User Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Pengguna</th>
                    <th className="py-3.5 px-4">Kontak</th>
                    <th className="py-3.5 px-4">Peran (Role)</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Aktivitas Terakhir</th>
                    <th className="py-3.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersList.map((user) => {
                    const initial = user.nama ? user.nama.charAt(0).toUpperCase() : 'U';
                    const isSelf = currentUser && currentUser.email === user.email;

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                              {initial}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                                <span>{user.nama}</span>
                                {isSelf && (
                                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">Anda</span>
                                )}
                              </div>
                              <span className="text-slate-400 text-[11px]">@{user.username}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-slate-700 font-medium">{user.email}</div>
                          <div className="text-slate-400 text-[11px]">{user.no_hp || '-'}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold ${
                            user.role === 'Super Admin' 
                              ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                              : user.role === 'Pengelola'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            <Shield className="w-3 h-3 mr-1" />
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => toggleUserStatus(user.id)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                              user.status === 'Aktif'
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-rose-100 hover:text-rose-700'
                                : 'bg-rose-100 text-rose-700 hover:bg-emerald-100 hover:text-emerald-700'
                            }`}
                            title="Klik untuk mengubah status"
                          >
                            ● {user.status}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-medium">
                          {user.lastActive || 'Baru'}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => openEditUser(user)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-slate-100 transition"
                              title="Edit Pengguna"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Hapus Pengguna"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: KATEGORI BIAYA */}
      {activeTab === 'kategori' && (
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Kategori Biaya & Plafon Anggaran Operasional</h3>
              <p className="text-xs text-slate-500 mt-0.5">Klasifikasi pengeluaran pemeliharaan fasilitas untuk kontrol beban kas</p>
            </div>
            <button
              onClick={() => {
                setKategoriFormData({ id: '', nama: '', plafon: '', deskripsi: '' });
                setKategoriModalOpen(true);
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kategori Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {kategoriList.map((kat) => (
              <div key={kat.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-100">
                      {kat.id}
                    </span>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          setKategoriFormData(kat);
                          setKategoriModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteKategori(kat.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="font-bold text-slate-800 text-sm mt-2">{kat.nama}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{kat.deskripsi}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">Estimasi Plafon:</span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md">
                    {formatRupiah(kat.plafon)}/bln
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: METODE PEMBAYARAN */}
      {activeTab === 'metode' && (
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Metode Pembayaran Sewa</h3>
              <p className="text-xs text-slate-500 mt-0.5">Daftar rekening bank, QRIS, dan jalur pembayaran yang dapat digunakan penyewa</p>
            </div>
            <button
              onClick={() => {
                setMetodeFormData({ id: '', nama: '', nomor: '', atasNama: '', tipe: 'Transfer Bank', aktif: true });
                setMetodeModalOpen(true);
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Rekening / Metode</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metodeList.map((m) => (
              <div key={m.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-100">
                      {m.tipe}
                    </span>
                    <button
                      onClick={() => toggleMetodeStatus(m.id)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition ${
                        m.aktif ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {m.aktif ? '● Aktif' : '○ Nonaktif'}
                    </button>
                  </div>

                  <h4 className="font-bold text-slate-800 text-sm mt-3">{m.nama}</h4>
                  <div className="mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="text-xs font-mono font-bold text-slate-800">{m.nomor}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">a/n {m.atasNama}</div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                  <button
                    onClick={() => {
                      setMetodeFormData(m);
                      setMetodeModalOpen(true);
                    }}
                    className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition"
                    title="Edit Metode"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteMetode(m.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Hapus Metode"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: NOTIFIKASI & WA */}
      {activeTab === 'notifikasi' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Kolom 1: Otomasi Notifikasi */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Pemicu Pengingat Otomatis</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">Trigger</span>
            </div>
            <div className="p-6 space-y-1 flex-1">
              <ToggleSwitch
                label="Pengingat Tagihan H-7"
                description="Kirim sinyal notifikasi 7 hari sebelum tanggal 5 jatuh tempo"
                checked={notifConfig.waH7}
                onChange={() => setNotifConfig({...notifConfig, waH7: !notifConfig.waH7})}
              />
              <ToggleSwitch
                label="Pengingat Tagihan H-3"
                description="Kirim pesan pengingat tagihan mendesak 3 hari sebelum jatuh tempo"
                checked={notifConfig.waH3}
                onChange={() => setNotifConfig({...notifConfig, waH3: !notifConfig.waH3})}
              />
              <ToggleSwitch
                label="Peringatan EWS Risiko Tinggi (Kritis)"
                description="Munculkan pemberitahuan prioritas tinggi saat penyewa menunggak > 15 hari"
                checked={notifConfig.waEwsHigh}
                onChange={() => setNotifConfig({...notifConfig, waEwsHigh: !notifConfig.waEwsHigh})}
              />
              <ToggleSwitch
                label="Notifikasi Unit Kosong > 14 Hari"
                description="Peringatkan pengelola untuk mengiklankan kembali kamar yang lama kosong"
                checked={notifConfig.waUnitKosong14}
                onChange={() => setNotifConfig({...notifConfig, waUnitKosong14: !notifConfig.waUnitKosong14})}
              />
              <ToggleSwitch
                label="Konfirmasi Bukti Pembayaran Lunas"
                description="Generate format kuitansi digital instan saat transaksi ditandai Lunas"
                checked={notifConfig.waBuktiLunas}
                onChange={() => setNotifConfig({...notifConfig, waBuktiLunas: !notifConfig.waBuktiLunas})}
              />
            </div>
          </div>

          {/* Kolom 2: Template WhatsApp */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800">Template Pesan WhatsApp Penagihan</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Gunakan tag variabel: {`{nama_penyewa}, {kode_kontrakan}, {nominal}, {periode}, {jatuh_tempo}`}</p>
              </div>
              <button
                onClick={copyTemplateToClipboard}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition flex items-center space-x-1"
              >
                {copiedTemplate ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedTemplate ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
            <div className="p-6 flex flex-col flex-1 space-y-3">
              <textarea
                rows={9}
                value={notifConfig.waTemplate}
                onChange={(e) => setNotifConfig({...notifConfig, waTemplate: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white resize-none"
              />

              <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 text-xs text-slate-600">
                <span className="font-bold text-emerald-800 block mb-1">Pratinjau Pesan yang Diterima Penyewa:</span>
                <p className="italic text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {notifConfig.waTemplate
                    .replace('{nama_penyewa}', 'Bapak Oben')
                    .replace('{nama_usaha}', profil.nama)
                    .replace('{kode_kontrakan}', 'L1-DLM-04')
                    .replace('{periode}', 'Oktober 2026')
                    .replace('{nominal}', 'Rp 850.000')
                    .replace('{jatuh_tempo}', '05 Oktober 2026')
                    .replace('{rekening_tujuan}', 'BCA 8830-123-456 a/n Ibu Buti')}
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleSaveNotifConfig}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Template Notifikasi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: BACKUP & RESTORE */}
      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Unduh Backup */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center font-bold mb-4">
                <Download className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">Pencadangan Data Sistem (Backup)</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Unduh salinan lengkap data unit kontrakan, data penyewa, riwayat pembayaran, beban pengeluaran, dan preferensi akun dalam format berkas JSON terenkripsi.
              </p>
              <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600 space-y-1">
                <div>✓ Termasuk Master Data 10 Unit Kontrakan</div>
                <div>✓ Termasuk Rekam Riwayat EWS & Pembayaran</div>
                <div>✓ Termasuk Master Biaya Operasional</div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={handleDownloadBackup}
                disabled={isSaving}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File Cadangan (.JSON)</span>
              </button>
            </div>
          </div>

          {/* Card 2: Pemulihan Data */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center font-bold mb-4">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">Pemulihan Data (Restore)</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Pulihkan konfigurasi master data dan preferensi dari file cadangan JSON yang pernah diunduh sebelumnya.
              </p>

              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Pilih Berkas Backup</label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreFile}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>

              {restoreError && (
                <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{restoreError}</span>
                </div>
              )}

              {restoreStatus && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{restoreStatus}</span>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={applyRestore}
                className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Terapkan Pemulihan Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH/EDIT PENGGUNA */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">
                {isEditingUser ? 'Edit Akun Pengguna' : 'Tambah Pengguna Sistem'}
              </h3>
              <button onClick={() => setUserModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={userFormData.nama}
                  onChange={e => setUserFormData({...userFormData, nama: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={userFormData.username}
                    onChange={e => setUserFormData({...userFormData, username: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">No. WhatsApp</label>
                  <input
                    type="text"
                    value={userFormData.no_hp}
                    onChange={e => setUserFormData({...userFormData, no_hp: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={userFormData.email}
                  onChange={e => setUserFormData({...userFormData, email: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Peran (Role)</label>
                  <select
                    value={userFormData.role}
                    onChange={e => setUserFormData({...userFormData, role: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Super Admin">Super Admin</option>
                    <option value="Pengelola">Pengelola</option>
                    <option value="Staf Keuangan">Staf Keuangan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                  <select
                    value={userFormData.status}
                    onChange={e => setUserFormData({...userFormData, status: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>

              {!isEditingUser && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Password Awal</label>
                  <input
                    type="password"
                    required
                    placeholder="Minimal 6 karakter"
                    value={userFormData.password}
                    onChange={e => setUserFormData({...userFormData, password: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH/EDIT KATEGORI BIAYA */}
      {kategoriModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">
                {kategoriFormData.id ? 'Edit Kategori Biaya' : 'Tambah Kategori Biaya'}
              </h3>
              <button onClick={() => setKategoriModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveKategori} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Kategori</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Perbaikan Pompa Air"
                  value={kategoriFormData.nama}
                  onChange={e => setKategoriFormData({...kategoriFormData, nama: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Plafon Anggaran Bulanan (Rp)</label>
                <input
                  type="number"
                  required
                  placeholder="Contoh: 1000000"
                  value={kategoriFormData.plafon}
                  onChange={e => setKategoriFormData({...kategoriFormData, plafon: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Deskripsi / Peruntukan</label>
                <textarea
                  rows={3}
                  placeholder="Catatan rincian biaya ini..."
                  value={kategoriFormData.deskripsi}
                  onChange={e => setKategoriFormData({...kategoriFormData, deskripsi: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setKategoriModalOpen(false)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  Simpan Kategori
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH/EDIT METODE PEMBAYARAN */}
      {metodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">
                {metodeFormData.id ? 'Edit Metode Pembayaran' : 'Tambah Metode Pembayaran'}
              </h3>
              <button onClick={() => setMetodeModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMetode} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Metode / Bank</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bank BNI"
                  value={metodeFormData.nama}
                  onChange={e => setMetodeFormData({...metodeFormData, nama: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tipe Jalur</label>
                <select
                  value={metodeFormData.tipe}
                  onChange={e => setMetodeFormData({...metodeFormData, tipe: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Transfer Bank">Transfer Bank</option>
                  <option value="QRIS / Digital">QRIS / Digital</option>
                  <option value="Tunai">Tunai</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nomor Rekening / Akun</label>
                <input
                  type="text"
                  placeholder="Nomor rekening (atau '-' jika tunai)"
                  value={metodeFormData.nomor}
                  onChange={e => setMetodeFormData({...metodeFormData, nomor: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Atas Nama (A/N)</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ibu Buti"
                  value={metodeFormData.atasNama}
                  onChange={e => setMetodeFormData({...metodeFormData, atasNama: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMetodeModalOpen(false)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  Simpan Metode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './utils/supabaseClient';
import { formatRupiah } from './utils/formatters';
import { showToast } from './utils/toast';

// Views
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import KontrakanView from './views/KontrakanView';
import PenyewaView from './views/PenyewaView';
import TransaksiView from './views/TransaksiView';
import BiayaView from './views/BiayaView'; 
import LaporanView from './views/LaporanView';
import PengaturanView from './views/PengaturanView'; 

// Layout Components
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';

// Modals & Notifications
import ProfileModal from './components/modals/ProfileModal';
import PanduanModal from './components/modals/PanduanModal';
import LogoutModal from './components/modals/LogoutModal';
import ToastContainer from './components/common/ToastContainer';

const DEFAULT_USER = {
  id: 'USR-001',
  nama: 'Admin Buti',
  username: 'admin',
  email: 'admin@kontrakan.com',
  role: 'Super Admin',
  jabatan: 'Pengelola Utama',
  no_hp: '0812-3456-7890',
  avatarColor: 'emerald'
};

const AVATAR_GRADIENTS = {
  emerald: 'from-emerald-600 to-teal-500',
  blue: 'from-blue-600 to-cyan-500',
  indigo: 'from-indigo-600 to-purple-500',
  rose: 'from-rose-600 to-pink-500',
  amber: 'from-amber-600 to-orange-500',
  slate: 'from-slate-700 to-slate-900',
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pengaturanTab, setPengaturanTab] = useState('profil');
  
  // Real-time Date & Clock State
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentDateTime.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const formattedTime = currentDateTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // Auth & User State
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const saved = localStorage.getItem('kb_auth_logged_in');
    return saved !== null ? saved === 'true' : true;
  });

  const [session, setSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('kb_currentUser');
      return saved ? JSON.parse(saved) : DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  });

  // Profil Usaha
  const [namaUsaha, setNamaUsaha] = useState('Kontrakan Buti');

  // Modal States
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPanduanModal, setShowPanduanModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Popover State
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // Global filters
  const [globalFilterPenyewa, setGlobalFilterPenyewa] = useState('');
  const [globalFilterUnit, setGlobalFilterUnit] = useState('');
  const [globalFilterTrxUnit, setGlobalFilterTrxUnit] = useState('');
  const [globalFilterTrxStatus, setGlobalFilterTrxStatus] = useState('');

  // Refs untuk Click Outside
  const searchRef = useRef(null);
  const profileRef = useRef(null);

  // Load Nama Usaha dari localStorage
  useEffect(() => {
    try {
      const savedProfil = localStorage.getItem('kb_profil');
      if (savedProfil) {
        const p = JSON.parse(savedProfil);
        if (p.nama) setNamaUsaha(p.nama);
      }
    } catch (e) {
      console.warn('Gagal membaca profil:', e);
    }

    const handleProfilUpdated = (e) => {
      if (e.detail?.nama) setNamaUsaha(e.detail.nama);
    };
    window.addEventListener('kb_profil_updated', handleProfilUpdated);
    return () => window.removeEventListener('kb_profil_updated', handleProfilUpdated);
  }, []);

  // Click Outside Listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchResults([]);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowProfileMenu(false);
        setSearchResults([]);
        setShowMobileSearch(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSaveCurrentUser = (updatedUser) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('kb_currentUser', JSON.stringify(updatedUser));
    
    try {
      const savedUsers = localStorage.getItem('kb_users_list');
      if (savedUsers) {
        const list = JSON.parse(savedUsers);
        const updatedList = list.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u);
        localStorage.setItem('kb_users_list', JSON.stringify(updatedList));
      }
      showToast('success', 'Profil pengguna berhasil diperbarui!');
    } catch (e) {
      console.warn(e);
      showToast('error', 'Gagal memperbarui profil pengguna');
    }
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const [resPenyewa, resUnit, resTrx] = await Promise.all([
        fetch('/api/penyewa').then(r => r.json()).catch(() => []),
        fetch('/api/kontrakan').then(r => r.json()).catch(() => []),
        fetch('/api/transaksi').then(r => r.json()).catch(() => [])
      ]);

      let results = [];
      const q = query.toLowerCase();

      resPenyewa.forEach(p => {
        if (
          (p.nama_penyewa && p.nama_penyewa.toLowerCase().includes(q)) ||
          (p.id_penyewa && p.id_penyewa.toLowerCase().includes(q)) ||
          (p.no_hp && p.no_hp.includes(q))
        ) {
          results.push({
            type: 'penyewa',
            id: p.id_penyewa,
            title: p.nama_penyewa,
            subtitle: p.status_berjalan === 'Aktif' ? `Penyewa Aktif (Unit: ${p.kode_unit_sekarang || '-'})` : 'Penyewa Tidak Aktif',
            badge: 'Penyewa'
          });
        }
      });

      resUnit.forEach(u => {
        if (
          (u.kode_kontrakan && u.kode_kontrakan.toLowerCase().includes(q)) ||
          (u.nama_kontrakan && u.nama_kontrakan.toLowerCase().includes(q))
        ) {
          results.push({
            type: 'unit',
            id: u.kode_kontrakan,
            title: `Unit ${u.kode_kontrakan} - ${u.nama_kontrakan}`,
            subtitle: `Tarif: ${formatRupiah(u.harga_saat_ini)} | Status: ${u.status_realtime || u.status_unit}`,
            badge: 'Properti'
          });
        }
      });

      resTrx.forEach(t => {
        if (
          (t.nama_penyewa && t.nama_penyewa.toLowerCase().includes(q)) ||
          (t.kode_kontrakan && t.kode_kontrakan.toLowerCase().includes(q)) ||
          (t.periode_bulan_tahun && t.periode_bulan_tahun.includes(q))
        ) {
          results.push({
            type: 'transaksi',
            id: `trx-${t.id_transaksi}`,
            title: `Pembayaran ${t.kode_kontrakan} (${t.periode_bulan_tahun})`,
            subtitle: `${t.nama_penyewa} • ${t.status_pembayaran} • ${formatRupiah(t.total_terbayar)}`,
            badge: 'Transaksi'
          });
        }
      });

      setSearchResults(results.slice(0, 8));
    } catch (err) {
      console.error('Gagal mencari data:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (item) => {
    if (item.type === 'penyewa') {
      setGlobalFilterPenyewa(item.title);
      setActiveTab('penyewa');
    } else if (item.type === 'unit') {
      setGlobalFilterUnit(item.id);
      setActiveTab('kontrakan');
    } else if (item.type === 'transaksi') {
      const unitCode = item.title.split(' ')[1] || '';
      setGlobalFilterTrxUnit(unitCode);
      setActiveTab('transaksi');
    }
    setSearchQuery('');
    setSearchResults([]);
    setShowMobileSearch(false);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    setShowProfileMenu(false);
    localStorage.setItem('kb_auth_logged_in', 'false');
    setIsLoggedIn(false);
    setSession(null);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Signout supabase:', e);
    }
  };

  const handleLoginSuccess = (newSession, userMetadata) => {
    setSession(newSession);
    setIsLoggedIn(true);
    localStorage.setItem('kb_auth_logged_in', 'true');
    if (userMetadata) {
      handleSaveCurrentUser({ ...currentUser, ...userMetadata });
    }
    setActiveTab('dashboard');
  };

  const navigateToPengaturan = (subTab) => {
    setPengaturanTab(subTab);
    setActiveTab('pengaturan');
    setShowProfileMenu(false);
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView />;
      case 'kontrakan': 
        return <KontrakanView 
                  initialSearchQuery={globalFilterUnit} 
                  onSearchClear={() => setGlobalFilterUnit('')} 
               />;
      case 'penyewa': 
        return <PenyewaView 
                  initialSearchQuery={globalFilterPenyewa} 
                  onSearchClear={() => setGlobalFilterPenyewa('')} 
               />;
      case 'transaksi': 
        return <TransaksiView 
                  initialFilterUnit={globalFilterTrxUnit}
                  initialFilterStatus={globalFilterTrxStatus}
                  onFilterClear={() => {
                    setGlobalFilterTrxUnit('');
                    setGlobalFilterTrxStatus('');
                  }}
               />;
      case 'biaya': return <BiayaView />;
      case 'laporan': return <LaporanView />;
      case 'pengaturan': 
        return <PengaturanView 
                  initialTab={pengaturanTab}
                  onTabChange={(tab) => setPengaturanTab(tab)}
                  currentUser={currentUser}
                  onUserUpdate={handleSaveCurrentUser}
               />;
      default: return <DashboardView />;
    }
  };

  if (!isLoggedIn) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const userInitial = currentUser.nama ? currentUser.nama.charAt(0).toUpperCase() : 'A';
  const avatarGradient = AVATAR_GRADIENTS[currentUser.avatarColor] || AVATAR_GRADIENTS.emerald;

  return (
    <div className="flex h-screen bg-slate-50 font-sans antialiased overflow-hidden">
      {/* SIDEBAR NAVIGATION */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        namaUsaha={namaUsaha}
        currentUser={currentUser}
        userInitial={userInitial}
        avatarGradient={avatarGradient}
        onLogoutClick={() => setShowLogoutModal(true)}
        onNavClick={() => {
          setGlobalFilterPenyewa('');
          setGlobalFilterUnit('');
          setGlobalFilterTrxUnit('');
        }}
      />

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* NAVBAR */}
        <Navbar
          onOpenSidebar={() => setSidebarOpen(true)}
          searchRef={searchRef}
          searchQuery={searchQuery}
          handleSearch={handleSearch}
          setSearchQuery={setSearchQuery}
          setSearchResults={setSearchResults}
          isSearching={isSearching}
          searchResults={searchResults}
          handleSelectSearchResult={handleSelectSearchResult}
          showMobileSearch={showMobileSearch}
          setShowMobileSearch={setShowMobileSearch}
          formattedDate={formattedDate}
          formattedTime={formattedTime}
          profileRef={profileRef}
          showProfileMenu={showProfileMenu}
          setShowProfileMenu={setShowProfileMenu}
          avatarGradient={avatarGradient}
          userInitial={userInitial}
          currentUser={currentUser}
          onOpenProfileModal={() => setShowProfileModal(true)}
          onOpenPanduanModal={() => setShowPanduanModal(true)}
          onOpenLogoutModal={() => setShowLogoutModal(true)}
          navigateToPengaturan={navigateToPengaturan}
        />

        {/* MOBILE SEARCH EXPANSION */}
        {showMobileSearch && (
          <div className="bg-white border-b border-slate-200 p-3 md:hidden z-10 shadow-sm animate-in slide-in-from-top-2">
            <div className="flex items-center bg-slate-100 rounded-xl px-3 py-2 border border-slate-200">
              <input 
                type="text" 
                placeholder="Cari penyewa, unit, dll..." 
                value={searchQuery}
                onChange={handleSearch}
                autoFocus
                className="bg-transparent border-none outline-none text-xs text-slate-800 w-full"
              />
              <button onClick={() => setShowMobileSearch(false)} className="text-slate-400">
                ✕
              </button>
            </div>
          </div>
        )}

        {/* MAIN BODY AREA */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/60">
          <div className="max-w-7xl mx-auto">
            {renderActiveTab()}
          </div>
        </main>
      </div>

      {/* MODALS */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        currentUser={currentUser}
        onSave={handleSaveCurrentUser}
      />

      <PanduanModal
        isOpen={showPanduanModal}
        onClose={() => setShowPanduanModal(false)}
      />

      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />

      {/* GLOBAL TOAST NOTIFICATIONS */}
      <ToastContainer />
    </div>
  );
}
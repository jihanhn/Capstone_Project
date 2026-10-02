import React, { useState, useEffect } from 'react'; // <-- Tambahan useEffect di sini
import { supabase } from './utils/supabaseClient';
import LoginView from './components/LoginView';
import {
  LayoutDashboard,
  Receipt,
  Building2,
  Users,
  FileBarChart,
  Home,
  Database,
  Menu,
  X,
  Calendar
} from 'lucide-react';
import DashboardView from './components/DashboardView';
import TransaksiView from './components/TransaksiView';
import KontrakanView from './components/KontrakanView';
import PenyewaView from './components/PenyewaView';
import LaporanView from './components/LaporanView';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    { id: 'transaksi', label: 'Pencatatan Transaksi', icon: Receipt },
    { id: 'kontrakan', label: 'Master Unit Kontrakan', icon: Building2 },
    { id: 'penyewa', label: 'Master Data Penyewa', icon: Users },
    { id: 'laporan', label: 'Pelaporan & Ekspor', icon: FileBarChart },
  ];
  
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Mengecek apakah sebelumnya sudah pernah login
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Memantau perubahan jika user login atau logout
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  // GEMBOK UTAMA: Jika tidak ada sesi (belum login), blokir dan tampilkan form
  if (!session) {
    return <LoginView onLoginSuccess={setSession} />;
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans antialiased overflow-hidden">
      
      {/* TOMBOL LOGOUT DIPASANG DI SINI AGAR SELALU MUNCUL */}
        <button
      onClick={() => supabase.auth.signOut()}
      className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold fixed bottom-8 right-8 z-50 shadow-lg shadow-rose-500/30 transition-all hover:-translate-y-1"
    >
      Keluar (Logout)
    </button>

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo Brand */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-gradient-to-tr from-emerald-600 to-emerald-400 rounded-2xl shadow-lg shadow-emerald-900/30">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight text-white leading-tight">
                  Kontrakan Buti
                </h1>
                <span className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase">
                  BI Risk Management
                </span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Menu Utama
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* System Info Bottom Card */}
        <div className="p-4 border-t border-slate-800 m-3 bg-slate-800/50 rounded-2xl">
          <div className="flex items-center space-x-2.5">
            <div className="relative">
              <Database className="w-4 h-4 text-emerald-400" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div className="text-xs">
              <div className="font-semibold text-slate-200">Database</div>
              <div className="text-[11px] text-emerald-400">Terhubung &bull; Aktif</div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-slate-500 hover:text-slate-700 rounded-lg lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-800 capitalize">
                {navItems.find((n) => n.id === activeTab)?.label}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-semibold border border-emerald-100">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Sistem Operasional</span>
            </div>
          </div>
        </header>

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'transaksi' && <TransaksiView />}
            {activeTab === 'kontrakan' && <KontrakanView />}
            {activeTab === 'penyewa' && <PenyewaView />}
            {activeTab === 'laporan' && <LaporanView />}
          </div>
        </main>
      </div>
    </div>
  );
}

import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Building2,
  Users,
  FileBarChart,
  Wallet,
  Settings,
  X,
  LogOut
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'kontrakan', label: 'Properti', icon: Building2 },
  { id: 'penyewa', label: 'Penyewa', icon: Users },
  { id: 'transaksi', label: 'Pembayaran', icon: Receipt },
  { id: 'biaya', label: 'Biaya & Pemeliharaan', icon: Wallet },
  { id: 'laporan', label: 'Laporan', icon: FileBarChart },
  { id: 'pengaturan', label: 'Pengaturan', icon: Settings },
];

export default function Sidebar({
  activeTab,
  setActiveTab,
  sidebarOpen,
  setSidebarOpen,
  namaUsaha,
  currentUser,
  userInitial,
  avatarGradient,
  onLogoutClick,
  onNavClick
}) {
  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden animate-in fade-in"
        />
      )}

      {/* Sidebar Aside */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#064E3B] text-white flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Header Brand */}
          <div className="p-5 flex items-center justify-between border-b border-emerald-900/40">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white rounded-xl shadow-md flex items-center justify-center">
                <Building2 className="w-5 h-5 text-emerald-800" />
              </div>
              <div className="overflow-hidden">
                <h1 className="text-sm font-extrabold tracking-tight text-white leading-tight truncate">
                  {namaUsaha}
                </h1>
                <span className="text-[10px] font-semibold text-emerald-200 tracking-wide uppercase">
                  Business Intelligence
                </span>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="p-1 rounded-lg text-emerald-400 hover:text-white lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 py-4 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (onNavClick) onNavClick(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive 
                      ? 'bg-white/15 text-white font-bold shadow-sm' 
                      : 'text-emerald-100/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-300' : 'text-emerald-300/70'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Badge & Logout in Bottom Sidebar */}
        <div className="p-3 border-t border-emerald-900/40 m-2 bg-emerald-900/30 rounded-2xl">
          <div className="flex items-center space-x-3">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${avatarGradient} text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0`}>
              {userInitial}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-bold text-white truncate">{currentUser.nama}</p>
              <p className="text-[10px] text-emerald-200/80 truncate">{currentUser.role}</p>
            </div>
            <button
              onClick={onLogoutClick}
              className="p-1.5 text-emerald-300 hover:text-rose-300 hover:bg-white/10 rounded-lg transition"
              title="Keluar Akun"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

import React from 'react';
import {
  Menu,
  Search,
  X,
  RefreshCw,
  Calendar,
  ChevronDown,
  User as UserIcon,
  Users,
  Settings,
  HelpCircle,
  LogOut
} from 'lucide-react';

export default function Navbar({
  onOpenSidebar,
  searchRef,
  searchQuery,
  handleSearch,
  setSearchQuery,
  setSearchResults,
  isSearching,
  searchResults,
  handleSelectSearchResult,
  showMobileSearch,
  setShowMobileSearch,
  formattedDate,
  formattedTime,
  profileRef,
  showProfileMenu,
  setShowProfileMenu,
  avatarGradient,
  userInitial,
  currentUser,
  onOpenProfileModal,
  onOpenPanduanModal,
  onOpenLogoutModal,
  navigateToPengaturan
}) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 z-20 flex-shrink-0">
      <div className="flex items-center space-x-2 sm:space-x-4">
        <button
          onClick={onOpenSidebar}
          className="p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition lg:hidden"
          title="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        {/* SEARCH BAR (Desktop) */}
        <div className="hidden md:flex relative" ref={searchRef}>
          <div className="flex items-center bg-slate-100/90 rounded-xl px-3.5 py-2 w-64 lg:w-72 border border-slate-200/80 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:bg-white focus-within:border-transparent transition-all shadow-sm">
            <Search className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
            <input 
              type="text" 
              placeholder="Cari penyewa, unit, dll..." 
              value={searchQuery}
              onChange={handleSearch}
              className="bg-transparent border-none outline-none text-xs sm:text-sm text-slate-800 w-full placeholder:text-slate-400"
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                className="p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* SEARCH RESULTS DROPDOWN */}
          {searchQuery.length >= 2 && (
            <div className="absolute top-full mt-2 w-full lg:w-96 bg-white border border-slate-200 shadow-xl rounded-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Hasil Pencarian</span>
                <span className="text-[10px] text-slate-400">Tekan ESC untuk tutup</span>
              </div>

              {isSearching ? (
                <div className="p-6 text-xs text-slate-500 text-center flex items-center justify-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Mencari data...</span>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {searchResults.map((item) => (
                    <div 
                      key={`${item.type}-${item.id}`} 
                      onClick={() => handleSelectSearchResult(item)}
                      className="p-3 hover:bg-emerald-50/50 cursor-pointer transition flex flex-col space-y-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 truncate pr-2">{item.title}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider ${
                          item.type === 'penyewa' 
                            ? 'bg-indigo-100 text-indigo-700' 
                            : item.type === 'unit' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {item.badge}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 line-clamp-1">{item.subtitle}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-xs text-slate-500 text-center font-medium">
                  Data tidak ditemukan untuk kata kunci "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* HEADER RIGHT ACTIONS: TANGGAL REALTIME & PROFIL PENGGUNA */}
      <div className="flex items-center space-x-2.5 sm:space-x-4">
        {/* Mobile Search Button */}
        <button
          onClick={() => setShowMobileSearch(!showMobileSearch)}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl md:hidden transition"
          title="Cari"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* WIDGET TANGGAL & JAM REAL-TIME DI NAVBAR */}
        <div className="flex items-center space-x-2 bg-slate-50/90 border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
          <div className="p-1.5 bg-emerald-100/70 text-emerald-800 rounded-lg">
            <Calendar className="w-4 h-4 flex-shrink-0" />
          </div>
          <div className="text-left leading-tight">
            <div className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
              <span className="capitalize">{formattedDate}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse hidden sm:inline-block" />
            </div>
            <div className="text-[10px] font-mono font-bold text-emerald-700">
              {formattedTime} WIB
            </div>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

        {/* PROFIL PENGGUNA DROPDOWN */}
        <div className="relative" ref={profileRef}>
          <div 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`flex items-center space-x-3 cursor-pointer p-1.5 rounded-2xl transition ${
              showProfileMenu ? 'bg-slate-100' : 'hover:bg-slate-100'
            }`}
          >
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${avatarGradient} text-white flex items-center justify-center font-black text-sm shadow-sm flex-shrink-0`}>
              {userInitial}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-slate-800 leading-none mb-1">
                {currentUser.nama}
              </div>
              <div className="text-[10px] text-emerald-700 font-bold leading-none">
                {currentUser.role}
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>

          {/* DROPDOWN MENU */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 shadow-2xl rounded-2xl z-50 overflow-hidden py-1.5 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-3 border-b border-slate-100 mb-1 bg-slate-50/60">
                <p className="text-xs font-bold text-slate-800 truncate">{currentUser.nama}</p>
                <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                <div className="mt-1.5">
                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {currentUser.role}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => {
                  onOpenProfileModal();
                  setShowProfileMenu(false);
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center space-x-2.5 transition"
              >
                <UserIcon className="w-4 h-4 text-slate-400" />
                <span>Profil Pengguna</span>
              </button>

              <button 
                onClick={() => navigateToPengaturan('pengguna')}
                className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center space-x-2.5 transition"
              >
                <Users className="w-4 h-4 text-slate-400" />
                <span>Manajemen Pengguna</span>
              </button>

              <button 
                onClick={() => navigateToPengaturan('profil')}
                className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center space-x-2.5 transition"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span>Pengaturan Sistem</span>
              </button>

              <button 
                onClick={() => {
                  onOpenPanduanModal();
                  setShowProfileMenu(false);
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center space-x-2.5 transition"
              >
                <HelpCircle className="w-4 h-4 text-slate-400" />
                <span>Panduan Penggunaan BI</span>
              </button>

              <div className="my-1 border-t border-slate-100" />

              <button 
                onClick={() => {
                  onOpenLogoutModal();
                  setShowProfileMenu(false);
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center space-x-2.5 transition"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>Keluar Akun</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

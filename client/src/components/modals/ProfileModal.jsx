import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Shield, Lock, CheckCircle2, AlertCircle, Save, Camera } from 'lucide-react';

const AVATAR_COLORS = [
  { id: 'emerald', bg: 'from-emerald-600 to-teal-500', name: 'Emerald' },
  { id: 'blue', bg: 'from-blue-600 to-cyan-500', name: 'Blue' },
  { id: 'indigo', bg: 'from-indigo-600 to-purple-500', name: 'Indigo' },
  { id: 'rose', bg: 'from-rose-600 to-pink-500', name: 'Rose' },
  { id: 'amber', bg: 'from-amber-600 to-orange-500', name: 'Amber' },
  { id: 'slate', bg: 'from-slate-700 to-slate-900', name: 'Dark Slate' },
];

export default function ProfileModal({ isOpen, onClose, currentUser, onSave }) {
  const [formData, setFormData] = useState({
    nama: '',
    username: '',
    email: '',
    no_hp: '',
    role: 'Super Admin',
    jabatan: 'Pengelola Utama',
    avatarColor: 'emerald',
    passwordLama: '',
    passwordBaru: '',
    konfirmasiPassword: ''
  });

  const [activeTab, setActiveTab] = useState('biodata'); // 'biodata' | 'keamanan'
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        nama: currentUser.nama || 'Admin Kontrakan Buti',
        username: currentUser.username || 'admin',
        email: currentUser.email || 'admin@kontrakan.com',
        no_hp: currentUser.no_hp || '0812-3456-7890',
        role: currentUser.role || 'Super Admin',
        jabatan: currentUser.jabatan || 'Pengelola Utama',
        avatarColor: currentUser.avatarColor || 'emerald',
        passwordLama: '',
        passwordBaru: '',
        konfirmasiPassword: ''
      }));
    }
    setSuccessMsg('');
    setErrorMsg('');
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (activeTab === 'keamanan') {
      if (formData.passwordBaru) {
        if (formData.passwordBaru.length < 6) {
          setErrorMsg('Password baru minimal harus 6 karakter!');
          return;
        }
        if (formData.passwordBaru !== formData.konfirmasiPassword) {
          setErrorMsg('Konfirmasi password tidak cocok dengan password baru!');
          return;
        }
      }
    }

    setIsSaving(true);
    setTimeout(() => {
      const updatedUser = {
        ...currentUser,
        nama: formData.nama,
        username: formData.username,
        email: formData.email,
        no_hp: formData.no_hp,
        role: formData.role,
        jabatan: formData.jabatan,
        avatarColor: formData.avatarColor,
      };

      if (onSave) onSave(updatedUser);
      setIsSaving(false);
      setSuccessMsg('Profil pengguna berhasil diperbarui!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1200);
    }, 600);
  };

  const selectedColor = AVATAR_COLORS.find(c => c.id === formData.avatarColor) || AVATAR_COLORS[0];
  const initial = formData.nama ? formData.nama.charAt(0).toUpperCase() : 'A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${selectedColor.bg} text-white flex items-center justify-center font-bold text-lg shadow-sm`}>
              {initial}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Profil Pengguna</h3>
              <p className="text-xs text-slate-500">Kelola identitas akun dan keamanan Anda</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('biodata')}
            className={`pb-2.5 px-3 text-sm font-semibold border-b-2 transition ${
              activeTab === 'biodata'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Biodata & Informasi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('keamanan')}
            className={`pb-2.5 px-3 text-sm font-semibold border-b-2 transition ${
              activeTab === 'keamanan'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Keamanan & Password
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-700 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === 'biodata' ? (
            <>
              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Pilih Tema Avatar</label>
                <div className="flex items-center space-x-2">
                  {AVATAR_COLORS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setFormData({...formData, avatarColor: c.id})}
                      className={`w-8 h-8 rounded-full bg-gradient-to-tr ${c.bg} transition transform ${
                        formData.avatarColor === c.id ? 'ring-2 ring-offset-2 ring-emerald-600 scale-110 shadow-md' : 'opacity-70 hover:opacity-100'
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lengkap</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formData.nama}
                    onChange={(e) => setFormData({...formData, nama: e.target.value})}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">No. WhatsApp / HP</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formData.no_hp}
                      onChange={(e) => setFormData({...formData, no_hp: e.target.value})}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email Akun</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Peran / Role</label>
                  <div className="relative">
                    <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    >
                      <option value="Super Admin">Super Admin</option>
                      <option value="Pengelola">Pengelola</option>
                      <option value="Staf Keuangan">Staf Keuangan</option>
                      <option value="Operator">Operator</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Jabatan Tampil</label>
                  <input
                    type="text"
                    value={formData.jabatan}
                    onChange={(e) => setFormData({...formData, jabatan: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Biarkan kosong jika Anda tidak ingin mengubah password akun saat ini.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Password Saat Ini</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="Masukkan password saat ini"
                    value={formData.passwordLama}
                    onChange={(e) => setFormData({...formData, passwordLama: e.target.value})}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Password Baru</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="Minimal 6 karakter"
                    value={formData.passwordBaru}
                    onChange={(e) => setFormData({...formData, passwordBaru: e.target.value})}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Konfirmasi Password Baru</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="Ulangi password baru"
                    value={formData.konfirmasiPassword}
                    onChange={(e) => setFormData({...formData, konfirmasiPassword: e.target.value})}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

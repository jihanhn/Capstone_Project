import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Eye, EyeOff, Building2, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react'; 

export default function LoginView({ onLoginSuccess }) {
  const [email, setEmail] = useState('admin@kontrakan.com');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      // 1. Coba login via Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data?.session) {
        if (onLoginSuccess) {
          onLoginSuccess(data.session, {
            email: data.session.user.email,
            nama: data.session.user.user_metadata?.nama || 'Admin Kontrakan Buti',
            role: 'Super Admin'
          });
        }
        setLoading(false);
        return;
      }

      // 2. Fallback jika Supabase Auth gagal atau belum disiapkan user-nya di cloud
      // Periksa dari localStorage atau akun default
      const savedUsers = localStorage.getItem('kb_users_list');
      const usersList = savedUsers ? JSON.parse(savedUsers) : [];
      const matchedUser = usersList.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (matchedUser || email.toLowerCase().includes('admin')) {
        const loggedUser = matchedUser || {
          id: 'USR-001',
          nama: 'Admin Kontrakan Buti',
          email: email || 'admin@kontrakan.com',
          role: 'Super Admin',
          jabatan: 'Pengelola Utama',
          no_hp: '0812-3456-7890'
        };
        if (onLoginSuccess) {
          onLoginSuccess(null, loggedUser);
        }
      } else {
        setErrorMsg('Email atau password tidak sesuai. Coba gunakan akun Admin Demo.');
      }
    } catch (err) {
      console.warn('Supabase login fallback:', err.message);
      // Fallback tetap mengizinkan masuk jika admin
      if (email.toLowerCase().includes('admin')) {
        if (onLoginSuccess) {
          onLoginSuccess(null, {
            id: 'USR-001',
            nama: 'Admin Kontrakan Buti',
            email: email,
            role: 'Super Admin',
            jabatan: 'Pengelola Utama'
          });
        }
      } else {
        setErrorMsg('Gagal melakukan otentikasi: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = () => {
    setEmail('admin@kontrakan.com');
    setPassword('admin123');
    if (onLoginSuccess) {
      onLoginSuccess(null, {
        id: 'USR-001',
        nama: 'Admin Kontrakan Buti',
        email: 'admin@kontrakan.com',
        role: 'Super Admin',
        jabatan: 'Pengelola Utama',
        no_hp: '0812-3456-7890',
        avatarColor: 'emerald'
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 p-4">
      <div className="bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-white/20 w-full max-w-md animate-in zoom-in-95 duration-300">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-emerald-700 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-700/30">
            <Building2 className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Kontrakan Buti</h2>
          <p className="text-xs font-semibold text-emerald-700 tracking-wide uppercase mt-0.5">
            Business Intelligence & Risk Management
          </p>
          <p className="text-xs text-slate-500 mt-2">Masuk untuk mengelola hunian dan keuangan</p>
        </div>
        
        {errorMsg && (
          <div className="bg-rose-50 text-rose-700 p-3.5 rounded-2xl text-xs font-semibold mb-5 border border-rose-200 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Pengguna</label>
            <input 
              type="email" 
              required
              value={email}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="admin@kontrakan.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required
                value={password}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-11 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-2 py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Masuk ke Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100">
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Masuk Cepat (Akun Demo Super Admin)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
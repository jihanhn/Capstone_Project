import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Eye, EyeOff } from 'lucide-react'; 

export default function LoginView({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    
    // Mengecek kecocokan email dan password ke Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setErrorMsg('Email atau password salah!');
    } else {
      onLoginSuccess(data.session); 
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 w-full max-w-sm">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-extrabold text-slate-800">Kontrakan Buti</h2>
          <p className="text-sm text-slate-500 mt-1">Silakan masuk untuk melanjutkan</p>
        </div>
        
        {errorMsg && (
          <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-sm mb-4 border border-rose-100">
            {errorMsg}
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
            <input 
              type="email" 
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                onChange={(e) => setPassword(e.target.value)} 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-6 py-2.5 rounded-xl font-bold shadow-sm transition disabled:opacity-50"
        >
          {loading ? 'Memeriksa...' : 'Masuk'}
        </button>
      </form>
    </div>
  );
}
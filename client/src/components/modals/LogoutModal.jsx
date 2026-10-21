import React from 'react';
import { LogOut, AlertTriangle, X } from 'lucide-react';

export default function LogoutModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100 shadow-sm">
            <LogOut className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">Konfirmasi Keluar Akun</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            Apakah Anda yakin ingin keluar dari sistem BI Kontrakan Buti? Anda harus masuk kembali untuk mengelola data.
          </p>

          <div className="mt-6 flex items-center justify-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-sm transition flex items-center justify-center space-x-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar Sekarang</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

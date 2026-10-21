import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToastEvent = (e) => {
      const toastData = e.detail;
      if (!toastData) return;

      setToasts((prev) => [...prev, toastData]);

      // Auto dismiss setelah 4 detik
      setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== toastData.id));
      }, 4000);
    };

    window.addEventListener('kb_toast_notification', handleToastEvent);
    return () => window.removeEventListener('kb_toast_notification', handleToastEvent);
  }, []);

  const removeToast = (id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((t) => {
        const isSuccess = t.type === 'success';
        const isError = t.type === 'error';
        const isWarning = t.type === 'warning';

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start space-x-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 animate-in slide-in-from-top-3 fade-in ${
              isSuccess
                ? 'bg-emerald-950/90 text-white border-emerald-500/40 shadow-emerald-900/20'
                : isError
                ? 'bg-rose-950/90 text-white border-rose-500/40 shadow-rose-900/20'
                : isWarning
                ? 'bg-amber-950/90 text-white border-amber-500/40 shadow-amber-900/20'
                : 'bg-slate-900/90 text-white border-slate-700/60 shadow-slate-900/20'
            }`}
          >
            <div className="p-1 rounded-xl bg-white/10 flex-shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {isError && <AlertCircle className="w-5 h-5 text-rose-400" />}
              {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-indigo-400" />}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <h5 className="text-xs font-bold tracking-wide uppercase opacity-90">
                {t.title}
              </h5>
              <p className="text-xs font-medium mt-0.5 text-white/90 leading-relaxed">
                {t.message}
              </p>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition flex-shrink-0"
              title="Tutup Notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

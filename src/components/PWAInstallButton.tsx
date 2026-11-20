import React, { useState } from 'react';
import { Download, Share, WifiOff } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../lib/pwa';
import { BRAND_NAME } from '../config/brand';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#0FA958] text-white font-semibold shadow-sm hover:bg-emerald-700 transition-colors min-h-[44px] ${
          compact ? 'px-4 py-2 text-xs' : 'w-full px-5 py-3 text-sm'
        }`}
      >
        <Download className="w-4 h-4" />
        <span>Pasang Aplikasi {BRAND_NAME}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2.5 text-sm font-semibold text-emerald-800 dark:text-emerald-200"
        >
          <Share className="w-4 h-4" />
          <span>Pasang di iPhone / iPad</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Pasang {BRAND_NAME} di Safari
              </h3>
              <ol className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300 list-decimal list-inside">
                <li>Ketuk tombol <strong>Bagikan (Share)</strong> di bilah Safari.</li>
                <li>Gulir ke bawah dan pilih <strong>Tambah ke Layar Utama</strong>.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-[44px] rounded-full bg-[#0FA958] text-white font-semibold text-sm"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg"
    >
      <WifiOff className="w-3.5 h-3.5" />
      <span>Mode Offline · Menampilkan data tersimpan</span>
    </div>
  );
};

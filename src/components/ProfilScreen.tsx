import React, { useState } from 'react';
import {
  Bookmark,
  Bug,
  ChevronRight,
  CreditCard,
  LogOut,
  MapPin,
  Moon,
  Plus,
  Shield,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { BRAND_NAME } from '../config/brand';
import { SavedAddress, UserSession } from '../lib/api';
import { MotionPermissionState } from '../lib/shakeDetector';
import { MascotAvatar } from './BrandLogo';
import { PWAInstallButton } from './PWAInstallButton';

interface ProfilScreenProps {
  session: UserSession;
  darkMode: boolean;
  onToggleTheme: () => void;
  shakeEnabled: boolean;
  motionPermission: MotionPermissionState;
  onToggleShake: () => void;
  onRequestMotionPermission: () => Promise<boolean>;
  onOpenBugReport: () => void;
  addresses: SavedAddress[];
  onAddAddress: (label: string, address: string) => void;
  onDeleteAddress: (id: string) => void;
  onOpenBayar: () => void;
  onOpenAdmin: () => void;
  onLogout: () => void;
}

export const ProfilScreen: React.FC<ProfilScreenProps> = ({
  session,
  darkMode,
  onToggleTheme,
  shakeEnabled,
  motionPermission,
  onToggleShake,
  onRequestMotionPermission,
  onOpenBugReport,
  addresses,
  onAddAddress,
  onDeleteAddress,
  onOpenBayar,
  onOpenAdmin,
  onLogout,
}) => {
  const [showAddresses, setShowAddresses] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [addrLabel, setAddrLabel] = useState('');
  const [addrText, setAddrText] = useState('');

  const handleSaveAddr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrLabel.trim() || !addrText.trim()) return;
    onAddAddress(addrLabel.trim(), addrText.trim());
    setAddrLabel('');
    setAddrText('');
  };

  return (
    <div className="min-h-full bg-[#F4F6F4] dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-8">
      {/* Green curved header matching reference */}
      <div className="header-gradient-lintasku px-4 pt-4 pb-12 rounded-b-[30px] flex items-center justify-between text-white">
        <h1 className="text-xl font-extrabold">Profilku</h1>
        <MascotAvatar className="w-11 h-11 rounded-2xl border-2 border-white/60" />
      </div>

      {/* Overlapping user profile card */}
      <div className="px-4 -mt-8 space-y-5">
        <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="w-13 h-13 rounded-full bg-[#0FA958] text-white text-xl font-extrabold flex items-center justify-center shrink-0">
            {(session.displayName || 'L').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold truncate">{session.displayName}</h2>
              {session.isDemo && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                  Mode Demo
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{session.email}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {session.phone}
            </p>
          </div>
        </div>

        {/* PWA Install Prompt */}
        <PWAInstallButton />

        {/* Preferences */}
        <section className="space-y-2">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 px-1">
            Preferensi
          </h3>
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
            {/* Dark/Light Theme Toggle */}
            <button
              type="button"
              onClick={onToggleTheme}
              className="w-full min-h-[56px] px-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <span className="flex items-center gap-3 text-sm font-bold">
                {darkMode ? (
                  <Moon className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Sun className="w-5 h-5 text-amber-500" />
                )}
                <span>Tampilan {darkMode ? 'Gelap' : 'Terang'}</span>
              </span>
              <span
                className={`w-11 h-6 rounded-full p-0.5 transition-colors flex items-center ${
                  darkMode ? 'bg-[#0FA958] justify-end' : 'bg-slate-300 justify-start'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddresses(true)}
              className="w-full min-h-[56px] px-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <span className="flex items-center gap-3 text-sm font-bold">
                <Bookmark className="w-5 h-5 text-slate-500" />
                <span>Alamat Tersimpan ({addresses.length})</span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={onOpenBayar}
              className="w-full min-h-[56px] px-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <span className="flex items-center gap-3 text-sm font-bold">
                <CreditCard className="w-5 h-5 text-slate-500" />
                <span>Metode Pembayaran &amp; QRIS</span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => setShowSecurity(true)}
              className="w-full min-h-[56px] px-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <span className="flex items-center gap-3 text-sm font-bold">
                <Shield className="w-5 h-5 text-slate-500" />
                <span>Keamanan Akun</span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={onOpenAdmin}
              className="w-full min-h-[56px] px-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <span className="flex items-center gap-3 text-sm font-bold">
                <ShieldCheck className="w-5 h-5 text-[#0FA958]" />
                <span>Verifikasi Pembayaran (/admin)</span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* Shake-to-Report preference + quick open */}
            <div className="px-4 py-3 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Smartphone className="w-5 h-5 text-[#0FA958] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold">Goyang untuk Lapor Bug</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {motionPermission === 'unsupported'
                        ? 'Sensor gerak tidak tersedia di browser ini'
                        : motionPermission === 'denied'
                          ? 'Izin sensor gerak ditolak browser'
                          : 'Goyangkan ponsel untuk buka formulir laporan'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={shakeEnabled}
                  aria-label="Aktifkan goyang untuk lapor bug"
                  onClick={onToggleShake}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                    shakeEnabled ? 'bg-[#0FA958] justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {motionPermission === 'prompt' && (
                  <button
                    type="button"
                    onClick={() => void onRequestMotionPermission()}
                    className="min-h-[38px] px-3.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-bold"
                  >
                    Izinkan Sensor Gerak
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenBugReport}
                  className="min-h-[38px] px-3.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[#0FA958] dark:text-emerald-400 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Bug className="w-3.5 h-3.5" />
                  <span>Laporkan Kendala Sekarang</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <button
          type="button"
          onClick={onLogout}
          className="w-full min-h-[48px] rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 font-bold text-sm flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar dari {BRAND_NAME}</span>
        </button>
      </div>

      {/* Saved Addresses Modal */}
      {showAddresses && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Alamat Tersimpan"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
        >
          <div className="w-full max-w-[430px] rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold">Alamat Tersimpan</h3>
              <button
                type="button"
                aria-label="Tutup alamat"
                onClick={() => setShowAddresses(false)}
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {addresses.map((a) => (
                <div
                  key={a.id}
                  className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#0FA958]" />
                      {a.label}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{a.address}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Hapus ${a.label}`}
                    onClick={() => onDeleteAddress(a.id)}
                    className="p-2 text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleSaveAddr} className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <input
                type="text"
                value={addrLabel}
                onChange={(e) => setAddrLabel(e.target.value)}
                placeholder="Label (mis. Rumah / Kantor)"
                className="w-full min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs"
              />
              <input
                type="text"
                value={addrText}
                onChange={(e) => setAddrText(e.target.value)}
                placeholder="Alamat lengkap"
                className="w-full min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs"
              />
              <button
                type="submit"
                className="w-full min-h-[44px] rounded-full bg-[#0FA958] text-white font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Simpan Alamat</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Security Info Modal */}
      {showSecurity && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Keamanan Akun"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-5 space-y-3">
            <h3 className="text-base font-extrabold">Keamanan Akun</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Seluruh permintaan API dilindungi verifikasi Firebase ID Token di sisi server. Data kartu tidak pernah disimpan oleh {BRAND_NAME}.
            </p>
            <button
              type="button"
              onClick={() => setShowSecurity(false)}
              className="w-full min-h-[44px] rounded-full bg-[#0FA958] text-white font-bold text-xs"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Bug, CheckCircle2, Smartphone, X } from 'lucide-react';
import { BRAND_NAME } from '../config/brand';
import { apiRequest, BugReportRecord, UserSession } from '../lib/api';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

interface BugReportModalProps {
  session: UserSession;
  currentScreen: string;
  triggerSource: 'shake' | 'manual';
  onClose: () => void;
}

const CATEGORIES: Array<{ id: BugReportRecord['category']; label: string }> = [
  { id: 'bug', label: 'Bug Aplikasi' },
  { id: 'payment', label: 'Pembayaran / QRIS' },
  { id: 'map', label: 'Peta & Driver' },
  { id: 'performance', label: 'Performa / 3D' },
  { id: 'other', label: 'Lainnya' },
];

export const BugReportModal: React.FC<BugReportModalProps> = ({
  session,
  currentScreen,
  triggerSource,
  onClose,
}) => {
  const [category, setCategory] = useState<BugReportRecord['category']>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submittedReport, setSubmittedReport] = useState<BugReportRecord | null>(null);

  const deviceInfo =
    typeof window !== 'undefined'
      ? `${window.innerWidth}x${window.innerHeight} · ${navigator.onLine ? 'Online' : 'Offline'}`
      : 'Web Client';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanTitle = title.trim().slice(0, 120);
    const cleanDesc = description.trim().slice(0, 1000);

    if (cleanTitle.length < 3) {
      setErrorMsg('Judul kendala minimal 3 karakter.');
      return;
    }
    if (cleanDesc.length < 5) {
      setErrorMsg('Deskripsi kendala minimal 5 karakter.');
      return;
    }

    setBusy(true);
    try {
      const res = await apiRequest<{ report: BugReportRecord }>('/api/bug-reports', {
        method: 'POST',
        session,
        body: {
          category,
          title: cleanTitle,
          description: cleanDesc,
          currentScreen: currentScreen.slice(0, 80),
          deviceInfo: deviceInfo.slice(0, 240),
          triggerSource,
        },
      });

      if (!session.isDemo && session.emailVerified) {
        try {
          await setDoc(doc(db, 'bug_reports', res.report.reportId), {
            reportId: res.report.reportId,
            userId: session.uid,
            category: res.report.category,
            title: cleanTitle,
            description: cleanDesc,
            currentScreen: res.report.currentScreen || 'Home',
            deviceInfo: res.report.deviceInfo || deviceInfo,
            triggerSource: res.report.triggerSource,
            status: 'open',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `bug_reports/${res.report.reportId}`);
        }
      }

      setSubmittedReport(res.report);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mengirim laporan.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Laporkan Kendala"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-xs p-0 sm:p-4"
    >
      <div className="w-full max-w-[430px] rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-[slideUp_0.3s_var(--spring-ease)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 text-[#0FA958] flex items-center justify-center shrink-0">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                Laporkan Kendala {BRAND_NAME}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-[#0FA958]" />
                <span>
                  {triggerSource === 'shake'
                    ? 'Terpicu dari goyangan perangkat (Accelerometer)'
                    : 'Formulir laporan cepat'}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Tutup laporan bug"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submittedReport ? (
          <div className="py-4 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#0FA958] flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-extrabold">Laporan Terkirim!</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                Nomor Tiket: <strong>{submittedReport.reportId}</strong>
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">
                Terima kasih telah membantu meningkatkan layanan {BRAND_NAME}.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[46px] rounded-full bg-[#0FA958] text-white font-bold text-sm"
            >
              Selesai
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Kategori Masalah
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`min-h-[38px] px-3 rounded-full text-xs font-bold border transition-colors ${
                      category === cat.id
                        ? 'bg-[#0FA958] text-white border-[#0FA958]'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Judul Singkat
              </span>
              <input
                type="text"
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Peta tidak memuat titik jemput"
                className="mt-1 w-full min-h-[44px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 text-xs text-slate-900 dark:text-slate-100"
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Detail Kejadian
              </span>
              <textarea
                rows={3}
                maxLength={1000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Jelaskan langkah yang Anda lakukan sebelum kendala muncul..."
                className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-900 dark:text-slate-100"
              />
            </label>

            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 px-3 py-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between gap-2">
              <span className="truncate">Layar: {currentScreen}</span>
              <span className="shrink-0 tabular-nums">{deviceInfo}</span>
            </div>

            {errorMsg && (
              <div className="rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 p-2.5 text-xs text-red-700 dark:text-red-300">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full min-h-[48px] rounded-full bg-[#0FA958] hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md disabled:opacity-60 transition-colors"
            >
              {busy ? 'Mengirim Laporan...' : 'Kirim Laporan Kendala'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

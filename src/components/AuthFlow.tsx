import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, KeyRound, Mail, ShieldCheck, Smartphone } from 'lucide-react';
import { BRAND_NAME, MASCOT_NAME } from '../config/brand';
import {
  registerWithEmail,
  signInWithApple,
  signInWithEmail,
  signInWithGoogle,
} from '../lib/firebase';
import { BrandWordmark, MascotAvatar } from './BrandLogo';

interface AuthFlowProps {
  onDemoEnter: () => void;
  onAuthSuccess: () => void;
}

const SLIDES = [
  {
    title: 'Mobilitas Cepat & Nyaman',
    subtitle: `${MASCOT_NAME} siap menemani perjalananmu dengan Ojek Motor dan Taksi Mobil yang bisa kamu cek langsung dalam tampilan 3D.`,
    badge: 'Ojek & Taksi 3D',
  },
  {
    title: 'Kuliner Hangat & Belanja Segar',
    subtitle: 'Pesan hidangan favorit dari restoran terdekat hingga kebutuhan harian langsung diantar ke depan pintu.',
    badge: 'Kuliner & Mart',
  },
  {
    title: 'Bayar Praktis dengan QRIS & E-Wallet',
    subtitle: 'Satu ketukan untuk bayar QRIS dinamis, dompet digital populer, atau bayar tunai di tempat (COD).',
    badge: 'QRIS Instan',
  },
];

export const AuthFlow: React.FC<AuthFlowProps> = ({ onDemoEnter, onAuthSuccess }) => {
  const [stage, setStage] = useState<'splash' | 'onboarding' | 'login'>('splash');
  const [slideIdx, setSlideIdx] = useState(0);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'otp'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  useEffect(() => {
    if (stage !== 'splash') return;
    const t = window.setTimeout(() => setStage('onboarding'), 950);
    return () => window.clearTimeout(t);
  }, [stage]);

  const handleGoogle = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      await signInWithGoogle();
      onAuthSuccess();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Gagal masuk dengan Google. Pastikan popup diizinkan atau gunakan Mode Demo.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApple = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      await signInWithApple();
      onAuthSuccess();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? `${err.message} (Login Apple memerlukan Apple Developer Services ID aktif pada domain HTTPS)`
          : 'Login Apple belum dikonfigurasi pada proyek ini.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Email dan kata sandi wajib diisi.');
      return;
    }
    setLoading(true);
    try {
      if (authMode === 'login') {
        await signInWithEmail(email.trim(), password);
        onAuthSuccess();
      } else if (authMode === 'register') {
        await registerWithEmail(email.trim(), password, displayName || email.split('@')[0]);
        const code = String(Math.floor(100000 + Math.random() * 900000));
        setGeneratedOtp(code);
        setAuthMode('otp');
        setInfoMsg(
          `Tautan verifikasi dikirim ke ${email.trim()}. Kode OTP verifikasi sesi: ${code} (Demo OTP).`
        );
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Autentikasi email gagal.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput.trim() === generatedOtp || otpInput.trim() === '123456') {
      onAuthSuccess();
    } else {
      setErrorMsg('Kode OTP tidak sesuai. Periksa kembali kode 6 digit Anda.');
    }
  };

  if (stage === 'splash') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center header-gradient-lintasku text-white p-6">
        <div className="bg-white/15 p-4 rounded-3xl shadow-xl backdrop-blur-sm animate-bounce">
          <MascotAvatar className="w-24 h-24 rounded-2xl" />
        </div>
        <div className="mt-5">
          <BrandWordmark inverted size="lg" />
        </div>
        <p className="mt-2 text-sm text-emerald-50 font-medium">Jalan Terus, Hemat Terus</p>
        <button
          type="button"
          onClick={() => setStage('onboarding')}
          className="mt-8 text-xs font-semibold text-white/85 underline underline-offset-4 min-h-[44px] px-4"
        >
          Lanjutkan
        </button>
      </div>
    );
  }

  if (stage === 'onboarding') {
    const slide = SLIDES[slideIdx];
    return (
      <div className="min-h-screen flex flex-col justify-between bg-[#F4F6F4] dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6">
        <div className="flex items-center justify-between pt-2">
          <BrandWordmark size="sm" />
          <button
            type="button"
            onClick={() => setStage('login')}
            className="text-sm font-semibold text-[#0FA958] min-h-[44px] px-3"
          >
            Lewati
          </button>
        </div>

        <div className="my-auto py-6 text-center">
          <div className="w-48 h-48 mx-auto rounded-[32px] bg-gradient-to-br from-[#0FA958]/15 to-[#8BE04E]/25 dark:from-emerald-900/40 dark:to-lime-900/20 flex items-center justify-center p-4 shadow-sm">
            <MascotAvatar className="w-40 h-40 rounded-3xl shadow-md" />
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-wider text-[#0FA958]">
            {slide.badge}
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-balance">
            {slide.title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400 max-w-xs mx-auto">
            {slide.subtitle}
          </p>

          <div className="mt-6 flex items-center justify-center gap-2">
            {SLIDES.map((s, idx) => (
              <button
                key={s.title}
                type="button"
                aria-label={`Slide ${idx + 1}`}
                onClick={() => setSlideIdx(idx)}
                className={`h-2.5 rounded-full transition-all ${
                  idx === slideIdx ? 'w-7 bg-[#0FA958]' : 'w-2.5 bg-slate-300 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3 safe-pb">
          <button
            type="button"
            onClick={() => {
              if (slideIdx < SLIDES.length - 1) setSlideIdx(slideIdx + 1);
              else setStage('login');
            }}
            className="w-full min-h-[48px] rounded-full bg-[#0FA958] hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-transform active:scale-[0.98]"
          >
            <span>{slideIdx < SLIDES.length - 1 ? 'Lanjut' : 'Mulai Sekarang'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F4F6F4] dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6">
      <div>
        <div className="flex items-center justify-between pt-2">
          <BrandWordmark size="md" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Firebase Auth
          </span>
        </div>

        <div className="mt-6 flex items-center gap-3.5 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <MascotAvatar className="w-14 h-14 rounded-2xl shrink-0" />
          <div>
            <h1 className="text-lg font-extrabold">Selamat Datang di {BRAND_NAME}</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Masuk untuk menyimpan pesanan, alamat, dan chat real-time.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 p-3 text-xs text-red-700 dark:text-red-300">
            {errorMsg}
          </div>
        )}
        {infoMsg && (
          <div className="mt-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 p-3 text-xs text-emerald-800 dark:text-emerald-200">
            {infoMsg}
          </div>
        )}

        {/* OAuth Providers */}
        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleGoogle()}
            className="w-full min-h-[46px] rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 font-semibold text-sm text-slate-800 dark:text-slate-100 flex items-center justify-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.8-5.4 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
            </svg>
            <span>Masuk dengan Google</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => void handleApple()}
            className="w-full min-h-[46px] rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 font-semibold text-sm flex items-center justify-center gap-2.5 hover:opacity-90 transition-opacity"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M16.36 12.76c.02 2.13 1.87 2.84 1.89 2.85-.02.05-.3 1.02-.98 2.02-.59.86-1.2 1.72-2.16 1.74-.95.02-1.25-.56-2.34-.56-1.08 0-1.42.54-2.32.58-.93.04-1.64-.93-2.24-1.79-1.21-1.75-2.14-4.95-.9-7.11.62-1.07 1.72-1.75 2.92-1.77.91-.02 1.77.61 2.33.61.56 0 1.61-.75 2.71-.64.46.02 1.76.19 2.6 1.42-.07.04-1.55.9-1.51 2.65zM14.58 6.84c.49-.6.83-1.43.74-2.26-.71.03-1.57.47-2.08 1.07-.46.53-.86 1.38-.75 2.19.79.06 1.6-.4 2.09-1z" />
            </svg>
            <span>Masuk dengan Apple</span>
          </button>
        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          <span>atau email &amp; OTP</span>
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        </div>

        {authMode === 'otp' ? (
          <form onSubmit={handleOtpVerify} className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-sm font-bold">
              <ShieldCheck className="w-4 h-4 text-[#0FA958]" />
              <span>Verifikasi Kode OTP</span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value)}
              placeholder="Masukkan 6 digit kode OTP"
              className="w-full min-h-[44px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 text-sm tracking-widest text-center font-bold tabular-nums"
            />
            <button
              type="submit"
              className="w-full min-h-[44px] rounded-full bg-[#0FA958] text-white font-bold text-sm"
            >
              Verifikasi &amp; Lanjut
            </button>
          </form>
        ) : (
          <form onSubmit={handleEmailSubmit} className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800">
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                  authMode === 'login'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                  authMode === 'register'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                Daftar Baru
              </button>
            </div>

            {authMode === 'register' && (
              <label className="block">
                <span className="sr-only">Nama Lengkap</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Nama lengkap"
                  className="w-full min-h-[44px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 text-sm"
                />
              </label>
            )}

            <label className="relative block">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email aktif"
                className="w-full min-h-[44px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-4 text-sm"
              />
            </label>

            <label className="relative block">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kata sandi (min. 6 karakter)"
                className="w-full min-h-[44px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-4 text-sm"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] rounded-full bg-[#0FA958] hover:bg-emerald-700 text-white font-bold text-sm transition-colors"
            >
              {loading
                ? 'Memproses...'
                : authMode === 'login'
                  ? 'Masuk dengan Email'
                  : 'Daftar & Kirim Verifikasi'}
            </button>
          </form>
        )}
      </div>

      <div className="pt-5 safe-pb space-y-2.5">
        <button
          type="button"
          onClick={onDemoEnter}
          className="w-full min-h-[46px] rounded-full border-2 border-[#0FA958] text-[#0FA958] dark:text-emerald-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
        >
          <Smartphone className="w-4 h-4" />
          <span>Jelajahi Mode Demo (Tanpa Login)</span>
        </button>
        <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#0FA958]" />
          <span>Mode Demo menggunakan driver &amp; saldo simulasi</span>
        </p>
      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  ArrowRight,
  ChevronRight,
  Eye,
  EyeOff,
  History,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { formatRupiah, WALLET_NAME } from '../config/brand';
import { PROMO_BANNERS, RESTAURANTS, Restaurant } from '../data/catalog';
import { MascotAvatar, ServiceIcon3D } from './BrandLogo';
import { Vehicle3DStage } from './Vehicle3DStage';

export type ServiceRoute =
  | 'ojek'
  | 'taksi'
  | 'makan'
  | 'kirim'
  | 'belanja'
  | 'cepat'
  | 'hadiah';

interface HomeScreenProps {
  demoBalance: number;
  demoPoints: number;
  onOpenService: (service: ServiceRoute, restaurant?: Restaurant) => void;
  onOpenBayar: () => void;
  onOpenAktivitas: () => void;
  onDemoTopup: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  demoBalance,
  demoPoints,
  onOpenService,
  onOpenBayar,
  onOpenAktivitas,
  onDemoTopup,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [hideBalance, setHideBalance] = useState(false);
  const [showAllSheet, setShowAllSheet] = useState(false);
  const [promoIndex, setPromoIndex] = useState(0);
  const [displayBalance, setDisplayBalance] = useState(0);
  const cardsRef = useRef<HTMLDivElement>(null);

  // Count-up wallet balance animation
  useEffect(() => {
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setDisplayBalance(demoBalance);
      return;
    }
    const obj = { val: 0 };
    const tween = gsap.to(obj, {
      val: demoBalance,
      duration: 0.7,
      ease: 'power2.out',
      onUpdate: () => setDisplayBalance(Math.round(obj.val)),
    });
    return () => {
      tween.kill();
    };
  }, [demoBalance]);

  // Staggered entrance for main service cards
  useEffect(() => {
    const el = cardsRef.current;
    if (!el) return;
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;
    const items = el.querySelectorAll('.stagger-card');
    gsap.fromTo(
      items,
      { opacity: 0, y: 16, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.06, ease: 'back.out(1.4)' }
    );
  }, []);

  const filteredRestaurants = searchQuery.trim()
    ? RESTAURANTS.filter(
        (r) =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : RESTAURANTS.slice(0, 2);

  return (
    <div className="pb-6 bg-[#F4F6F4] dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Fresh green gradient header */}
      <div className="header-gradient-lintasku pt-3 pb-7 px-4 rounded-b-[28px] shadow-sm">
        {/* Search bar */}
        <label className="relative block">
          <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari layanan, makanan, & tujuan"
            className="w-full min-h-[44px] rounded-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 pl-10 pr-4 text-sm shadow-md focus:outline-none focus:ring-2 focus:ring-white/80"
          />
        </label>

        {/* Original mascot + slogan promo strip */}
        <div className="mt-3.5 flex items-center justify-between gap-3 px-2 py-2 rounded-2xl bg-white/18 backdrop-blur-xs text-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <MascotAvatar className="w-11 h-11 rounded-xl shrink-0 border-2 border-white/60" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-lime-100">
                Promo Spesial Harian
              </p>
              <p className="text-sm font-extrabold truncate">
                Jalan Terus, Hemat Terus!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenService('ojek')}
            className="shrink-0 min-h-[36px] px-3.5 py-1.5 rounded-full bg-white text-[#0FA958] font-extrabold text-xs shadow-sm active:scale-95 transition-transform"
          >
            Pakai
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div ref={cardsRef} className="px-4 -mt-4 space-y-4">
        {/* 3 Large Service Cards */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            {
              key: 'ojek' as const,
              label: 'Ojek Motor',
              chip: '~7rb',
              icon: 'ojek' as const,
            },
            {
              key: 'taksi' as const,
              label: 'Taksi Mobil',
              chip: '8rb',
              icon: 'taksi' as const,
            },
            {
              key: 'makan' as const,
              label: 'Pesan Makan',
              chip: '50%',
              icon: 'makan' as const,
            },
          ].map((svc) => (
            <button
              key={svc.key}
              type="button"
              onClick={() => onOpenService(svc.key)}
              className="stagger-card service-card-glow relative rounded-[22px] bg-white dark:bg-slate-900 p-3 flex flex-col items-center justify-center gap-1.5 min-h-[108px] transition-transform active:scale-92 hover:-translate-y-0.5"
            >
              <ServiceIcon3D kind={svc.icon} className="w-12 h-12" />
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-[#0FA958] dark:text-emerald-400 text-[10px] font-extrabold tabular-nums">
                {svc.chip}
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                {svc.label}
              </span>
            </button>
          ))}
        </div>

        {/* White rounded row of 5 services */}
        <div className="stagger-card rounded-[22px] bg-white dark:bg-slate-900 p-3 shadow-xs border border-slate-100 dark:border-slate-800 grid grid-cols-5 gap-1">
          {[
            { key: 'kirim' as const, label: 'Kirim Barang', icon: 'kirim' as const },
            { key: 'belanja' as const, label: 'Belanja', icon: 'belanja' as const },
            { key: 'cepat' as const, label: 'Antar Cepat', icon: 'cepat' as const },
            { key: 'hadiah' as const, label: 'Hadiah', icon: 'hadiah' as const },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onOpenService(item.key)}
              className="min-h-[60px] flex flex-col items-center justify-center gap-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 active:scale-92 transition-transform"
            >
              <ServiceIcon3D kind={item.icon} className="w-9 h-9" />
              <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 text-center leading-tight">
                {item.label}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowAllSheet(true)}
            className="min-h-[60px] flex flex-col items-center justify-center gap-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 active:scale-92 transition-transform"
          >
            <ServiceIcon3D kind="lainnya" className="w-9 h-9" />
            <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 text-center leading-tight">
              Lainnya
            </span>
          </button>
        </div>

        {/* Wallet card "Dompetku" (Demo) */}
        <div className="stagger-card rounded-[24px] bg-white dark:bg-slate-900 p-3.5 sm:p-4 shadow-xs border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-xs font-extrabold text-[#0FA958]">{WALLET_NAME}</span>
                <span className="text-[10px] font-semibold text-slate-400">· Demo</span>
                <button
                  type="button"
                  aria-label={hideBalance ? 'Tampilkan saldo' : 'Sembunyikan saldo'}
                  onClick={() => setHideBalance((v) => !v)}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  {hideBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-lg sm:text-xl font-extrabold tracking-tight tabular-nums mt-0.5 whitespace-nowrap">
                {hideBalance ? 'Rp ••••••' : formatRupiah(displayBalance)}
              </p>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                {demoPoints} Poin
              </p>
            </div>

            <div className="grid grid-cols-4 gap-1 shrink-0">
              <button
                type="button"
                onClick={onDemoTopup}
                className="min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-1 rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="w-7 h-7 rounded-lg bg-[#00A8CC] text-white flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-semibold">Top up</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenService('kirim')}
                className="min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-1 rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="w-7 h-7 rounded-lg bg-[#0FA958] text-white flex items-center justify-center">
                  <Send className="w-3.5 h-3.5" />
                </span>
                <span className="text-[10px] font-semibold">Kirim</span>
              </button>
              <button
                type="button"
                onClick={onOpenAktivitas}
                className="min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-1 rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-[#0FA958] flex items-center justify-center">
                  <History className="w-3.5 h-3.5" />
                </span>
                <span className="text-[10px] font-semibold">Riwayat</span>
              </button>
              <button
                type="button"
                onClick={onOpenBayar}
                className="min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-1 rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                  <MoreHorizontal className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-semibold">Lainnya</span>
              </button>
            </div>
          </div>
        </div>

        {/* Pilihan cepat buatmu */}
        <section aria-labelledby="quick-picks-heading" className="pt-1">
          <div className="flex items-center justify-between mb-2.5">
            <h2
              id="quick-picks-heading"
              className="text-base font-extrabold flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Pilihan cepat buatmu</span>
            </h2>
            <button
              type="button"
              onClick={() => onOpenService('makan')}
              className="text-xs font-bold text-[#0FA958] flex items-center gap-0.5 min-h-[36px] px-1"
            >
              <span>Lihat semua</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {filteredRestaurants.map((resto) => (
              <button
                key={resto.id}
                type="button"
                onClick={() => onOpenService('makan', resto)}
                className="text-left rounded-[22px] bg-white dark:bg-slate-900 p-2.5 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-2 active:scale-96 transition-transform"
              >
                <div className="flex items-start gap-2.5">
                  <img
                    src={resto.image}
                    alt={resto.name}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-xl object-cover shrink-0 bg-slate-100"
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-slate-400">Pesan Makan</p>
                    <p className="text-xs font-bold leading-snug line-clamp-2 text-slate-900 dark:text-slate-100">
                      {resto.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-1 pt-1">
                  <span className="text-[11px] font-bold text-red-600 dark:text-red-400 truncate">
                    {resto.promoLabel}
                  </span>
                  <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-700 dark:text-slate-200">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Soft scalloped / wavy divider */}
        <div className="py-1 -mx-4 overflow-hidden text-white dark:text-slate-900" aria-hidden="true">
          <svg viewBox="0 0 430 18" className="w-full h-4 fill-current">
            <path d="M0 9 Q 18 0 36 9 T 72 9 T 108 9 T 144 9 T 180 9 T 216 9 T 252 9 T 288 9 T 324 9 T 360 9 T 396 9 T 432 9 V18 H0 Z" />
          </svg>
        </div>

        {/* Cocok buat kamu explore + lightweight auto-rotating 3D car promo */}
        <section aria-labelledby="explore-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="explore-heading" className="text-base font-extrabold">
              Cocok buat kamu explore
            </h2>
            <div className="flex gap-1.5">
              {PROMO_BANNERS.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  aria-label={`Promo ${i + 1}`}
                  onClick={() => setPromoIndex(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === promoIndex ? 'w-5 bg-[#0FA958]' : 'w-2 bg-slate-300 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Swipeable promo banner carousel */}
          <div className="relative overflow-hidden rounded-[24px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${promoIndex * 100}%)` }}
            >
              {PROMO_BANNERS.map((banner) => (
                <div key={banner.id} className="w-full shrink-0">
                  <div className="relative h-36">
                    <img
                      src={banner.image}
                      alt={banner.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                    <div className="absolute bottom-3 left-3.5 right-3.5 flex items-end justify-between gap-2 text-white">
                      <div>
                        <p className="text-sm font-extrabold">{banner.title}</p>
                        <p className="text-[11px] text-white/85 line-clamp-1">{banner.subtitle}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenService(banner.targetService)}
                        className="shrink-0 min-h-[36px] px-3.5 py-1.5 rounded-full bg-[#0FA958] text-white text-xs font-bold shadow-md"
                      >
                        {banner.cta}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lightweight auto-rotating 3D car promo card */}
          <div className="rounded-[24px] bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-3.5 flex items-center justify-between gap-3 shadow-md">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-lime-200">
                Armada 3D Interaktif
              </p>
              <h3 className="text-sm font-extrabold mt-0.5">
                Coba Taksi Mobil &amp; Ojek Motor
              </h3>
              <p className="text-[11px] text-emerald-50 mt-1">
                Putar kendaraan 360° sebelum memesan perjalananmu.
              </p>
              <button
                type="button"
                onClick={() => onOpenService('taksi')}
                className="mt-2.5 min-h-[36px] px-4 py-1.5 rounded-full bg-white text-[#0FA958] font-bold text-xs shadow-sm"
              >
                Lihat 3D &amp; Pesan
              </button>
            </div>
            <Vehicle3DStage
              vehicle="taksi"
              miniPromo
              className="w-32 h-24 rounded-2xl bg-white/15 shrink-0"
            />
          </div>
        </section>
      </div>

      {/* Bottom Sheet for "Lainnya" all services */}
      {showAllSheet && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Semua Layanan Lintasku"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs"
          onClick={() => setShowAllSheet(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[430px] rounded-t-3xl bg-white dark:bg-slate-900 p-5 pb-8 shadow-2xl border-t border-slate-200 dark:border-slate-800 animate-[slideUp_0.35s_var(--spring-ease)]"
          >
            <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold">Semua Layanan</h3>
              <button
                type="button"
                aria-label="Tutup panel layanan"
                onClick={() => setShowAllSheet(false)}
                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {(
                [
                  { key: 'ojek', label: 'Ojek Motor', icon: 'ojek' },
                  { key: 'taksi', label: 'Taksi Mobil', icon: 'taksi' },
                  { key: 'makan', label: 'Pesan Makan', icon: 'makan' },
                  { key: 'kirim', label: 'Kirim Barang', icon: 'kirim' },
                  { key: 'belanja', label: 'Belanja', icon: 'belanja' },
                  { key: 'cepat', label: 'Antar Cepat', icon: 'cepat' },
                  { key: 'hadiah', label: 'Hadiah', icon: 'hadiah' },
                ] as const
              ).map((svc) => (
                <button
                  key={svc.key}
                  type="button"
                  onClick={() => {
                    setShowAllSheet(false);
                    onOpenService(svc.key);
                  }}
                  className="min-h-[74px] rounded-2xl bg-slate-50 dark:bg-slate-800/80 p-2 flex flex-col items-center justify-center gap-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                >
                  <ServiceIcon3D kind={svc.icon} className="w-9 h-9" />
                  <span className="text-[11px] font-bold text-center leading-tight">
                    {svc.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

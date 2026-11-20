import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ClipboardList, Home, MessageSquare, QrCode, User } from 'lucide-react';

export type TabKey = 'home' | 'aktivitas' | 'bayar' | 'chat' | 'profil';

interface BottomNavProps {
  activeTab: TabKey;
  onSelect: (tab: TabKey) => void;
  unreadChatCount: number;
}

const TAB_INDEX: Record<TabKey, number> = {
  home: 0,
  aktivitas: 1,
  bayar: 2,
  chat: 3,
  profil: 4,
};

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelect,
  unreadChatCount,
}) => {
  const indicatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = indicatorRef.current;
    if (!el) return;
    const idx = TAB_INDEX[activeTab];
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      el.style.transform = `translateX(${idx * 100}%)`;
      return;
    }
    gsap.to(el, {
      xPercent: idx * 100,
      duration: 0.52,
      ease: 'back.out(1.7)',
    });
  }, [activeTab]);

  return (
    <nav
      aria-label="Navigasi Utama"
      className="sticky bottom-0 z-30 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 safe-pb"
    >
      {/* Sliding green top indicator */}
      <div className="relative h-1 w-full overflow-hidden">
        <div
          ref={indicatorRef}
          className="absolute top-0 left-0 w-1/5 h-full flex justify-center"
        >
          <span className="w-10 h-1 rounded-full bg-[#0FA958]" />
        </div>
      </div>

      <div className="grid grid-cols-5 items-end px-1 pt-1 pb-1">
        <button
          type="button"
          onClick={() => onSelect('home')}
          aria-current={activeTab === 'home' ? 'page' : undefined}
          className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
            activeTab === 'home'
              ? 'text-[#0FA958] font-bold'
              : 'text-slate-500 dark:text-slate-400 font-medium'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[11px] whitespace-nowrap">Home</span>
        </button>

        <button
          type="button"
          onClick={() => onSelect('aktivitas')}
          aria-current={activeTab === 'aktivitas' ? 'page' : undefined}
          className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
            activeTab === 'aktivitas'
              ? 'text-[#0FA958] font-bold'
              : 'text-slate-500 dark:text-slate-400 font-medium'
          }`}
        >
          <ClipboardList className="w-5 h-5" />
          <span className="text-[11px] whitespace-nowrap">Aktivitas</span>
        </button>

        <div className="flex flex-col items-center justify-end -mt-4">
          <button
            type="button"
            onClick={() => onSelect('bayar')}
            aria-label="Bayar"
            aria-current={activeTab === 'bayar' ? 'page' : undefined}
            className="w-16 h-12 rounded-full bayar-pill-gradient bayar-gentle-pulse text-white flex flex-col items-center justify-center shadow-lg transition-transform active:scale-95"
          >
            <QrCode className="w-4 h-4" />
            <span className="text-[11px] font-bold leading-none mt-0.5">Bayar</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => onSelect('chat')}
          aria-current={activeTab === 'chat' ? 'page' : undefined}
          className={`relative min-h-[48px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
            activeTab === 'chat'
              ? 'text-[#0FA958] font-bold'
              : 'text-slate-500 dark:text-slate-400 font-medium'
          }`}
        >
          <span className="relative">
            <MessageSquare className="w-5 h-5" />
            {unreadChatCount > 0 && (
              <span
                aria-label={`${unreadChatCount} pesan belum dibaca`}
                className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center tabular-nums"
              >
                {unreadChatCount}
              </span>
            )}
          </span>
          <span className="text-[11px] whitespace-nowrap">Chat</span>
        </button>

        <button
          type="button"
          onClick={() => onSelect('profil')}
          aria-current={activeTab === 'profil' ? 'page' : undefined}
          className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
            activeTab === 'profil'
              ? 'text-[#0FA958] font-bold'
              : 'text-slate-500 dark:text-slate-400 font-medium'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[11px] whitespace-nowrap">Profil</span>
        </button>
      </div>
    </nav>
  );
};

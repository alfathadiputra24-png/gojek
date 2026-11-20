import React, { useState } from 'react';
import { BRAND_NAME, GENERATED_ASSETS, MASCOT_NAME } from '../config/brand';

export const BrandWordmark: React.FC<{
  inverted?: boolean;
  size?: 'sm' | 'md' | 'lg';
}> = ({ inverted = false, size = 'md' }) => {
  const textSize = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-lg';
  const iconSize = size === 'lg' ? 'w-9 h-9' : size === 'sm' ? 'w-6 h-6' : 'w-7 h-7';

  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 select-none">
      <svg className={iconSize} viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <rect
          width="40"
          height="40"
          rx="12"
          fill={inverted ? 'rgba(255,255,255,0.22)' : '#0FA958'}
        />
        <path
          d="M11 16c0-4.4 3.6-8 8-8h2c4.4 0 8 3.6 8 8v5c0 6.5-4.3 10.7-9 12-4.7-1.3-9-5.5-9-12v-5z"
          fill="#ffffff"
        />
        <circle cx="16.2" cy="18.2" r="2.4" fill="#0C4A2B" />
        <circle cx="23.8" cy="18.2" r="2.4" fill="#0C4A2B" />
        <path d="M20 20.5l2 2.2-2 1.8-2-1.8 2-2.2z" fill="#F59E0B" />
      </svg>
      <span
        className={`${textSize} font-extrabold tracking-tight ${
          inverted ? 'text-white' : 'text-slate-900 dark:text-white'
        }`}
      >
        {BRAND_NAME}
      </span>
    </span>
  );
};

export const MascotAvatar: React.FC<{
  className?: string;
  alt?: string;
}> = ({ className = 'w-16 h-16 rounded-2xl', alt = `${MASCOT_NAME} maskot ${BRAND_NAME}` }) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`${className} bg-gradient-to-br from-emerald-500 to-lime-400 flex items-center justify-center text-white font-bold shadow-sm`}
        aria-label={alt}
      >
        <svg className="w-2/3 h-2/3" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <circle cx="20" cy="20" r="16" fill="white" opacity="0.92" />
          <circle cx="15" cy="18" r="3" fill="#0C4A2B" />
          <circle cx="25" cy="18" r="3" fill="#0C4A2B" />
          <path d="M20 21l2.5 3-2.5 2-2.5-2 2.5-3z" fill="#F59E0B" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={GENERATED_ASSETS.mascot}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${className} object-cover bg-emerald-50 dark:bg-emerald-950/40`}
    />
  );
};

export const ServiceIcon3D: React.FC<{
  kind: 'ojek' | 'taksi' | 'makan' | 'kirim' | 'belanja' | 'cepat' | 'hadiah' | 'lainnya';
  className?: string;
}> = ({ kind, className = 'w-11 h-11' }) => {
  switch (kind) {
    case 'ojek':
      return (
        <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <ellipse cx="24" cy="40" rx="14" ry="3.5" fill="#0FA958" opacity="0.18" />
          <circle cx="14" cy="32" r="6" fill="#1E293B" />
          <circle cx="14" cy="32" r="2.6" fill="#CBD5E1" />
          <circle cx="34" cy="32" r="6" fill="#1E293B" />
          <circle cx="34" cy="32" r="2.6" fill="#CBD5E1" />
          <path d="M13 28c2-6 7-8 14-8l5-8h5" stroke="#0FA958" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="14" y="21" width="11" height="5" rx="2.5" fill="#111827" />
          <circle cx="34" cy="12" r="3" fill="#8BE04E" />
        </svg>
      );
    case 'taksi':
      return (
        <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <ellipse cx="24" cy="40" rx="16" ry="3.5" fill="#0FA958" opacity="0.18" />
          <path d="M9 26l4-9c1-2 3-3 5-3h12c2 0 4 1 5 3l4 9v7c0 1.5-1 2.5-2.5 2.5H11.5C10 35.5 9 34.5 9 33v-7z" fill="#0FA958" />
          <path d="M14 23l2.6-6h14.8l2.6 6H14z" fill="#D1FAE5" />
          <circle cx="15" cy="35" r="4.2" fill="#1E293B" />
          <circle cx="33" cy="35" r="4.2" fill="#1E293B" />
          <rect x="11" y="28" width="5" height="2.5" rx="1.2" fill="#FEF08A" />
          <rect x="32" y="28" width="5" height="2.5" rx="1.2" fill="#FEF08A" />
        </svg>
      );
    case 'makan':
      return (
        <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <ellipse cx="24" cy="40" rx="14" ry="3.5" fill="#EF4444" opacity="0.15" />
          <circle cx="24" cy="24" r="14" fill="#FEE2E2" />
          <path d="M10 24h28c0 7.7-6.3 14-14 14s-14-6.3-14-14z" fill="#EF4444" />
          <path d="M18 16v-4m6 4v-5m6 5v-4" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="20" cy="21" r="2.2" fill="#FACC15" />
          <circle cx="28" cy="21" r="2.2" fill="#22C55E" />
        </svg>
      );
    case 'kirim':
      return (
        <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <rect x="7" y="10" width="26" height="22" rx="6" fill="#0FA958" />
          <path d="M7 17h26" stroke="#8BE04E" strokeWidth="3" />
          <path d="M20 27v-7m0 0l-3 3m3-3l3 3" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'belanja':
      return (
        <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <path d="M8 14h24l-2.5 16a3 3 0 01-3 2.5h-13a3 3 0 01-3-2.5L8 14z" fill="#F97316" />
          <path d="M14 14v-2a6 6 0 0112 0v2" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="16" cy="22" r="2" fill="#FEF08A" />
          <circle cx="24" cy="22" r="2" fill="#FEF08A" />
        </svg>
      );
    case 'cepat':
      return (
        <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <rect x="6" y="8" width="28" height="24" rx="8" fill="#0EA5E9" />
          <path d="M22 12l-7 9h5l-2 7 7-9h-5l2-7z" fill="#FEF08A" />
        </svg>
      );
    case 'hadiah':
      return (
        <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <rect x="8" y="16" width="24" height="16" rx="4" fill="#EC4899" />
          <rect x="6" y="12" width="28" height="6" rx="2.5" fill="#F472B6" />
          <rect x="18" y="12" width="4" height="20" fill="#FDE047" />
          <path d="M20 12c-3-4-7-3-6 0h6zm0 0c3-4 7-3 6 0h-6z" fill="#FDE047" />
        </svg>
      );
    default:
      return (
        <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <rect x="8" y="8" width="10" height="10" rx="3" fill="#334155" />
          <rect x="22" y="8" width="10" height="10" rx="3" fill="#0FA958" />
          <rect x="8" y="22" width="10" height="10" rx="3" fill="#0FA958" />
          <rect x="22" y="22" width="10" height="10" rx="3" fill="#334155" />
        </svg>
      );
  }
};

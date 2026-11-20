import React, { useState } from 'react';
import { CheckCircle2, Clock, FileText, RefreshCw, XCircle } from 'lucide-react';
import { formatRupiah } from '../config/brand';
import { OrderRecord } from '../lib/api';

interface AktivitasScreenProps {
  orders: OrderRecord[];
  loading: boolean;
  onReorder: (order: OrderRecord) => void;
  onPayOrder: (order: OrderRecord) => void;
  onViewReceipt: (order: OrderRecord) => void;
}

const TABS = ['Riwayat', 'Dalam proses', 'Terjadwal', 'Draf'] as const;

export const AktivitasScreen: React.FC<AktivitasScreenProps> = ({
  orders,
  loading,
  onReorder,
  onPayOrder,
  onViewReceipt,
}) => {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Riwayat');

  const filtered = orders.filter((o) => {
    if (tab === 'Dalam proses') {
      return !['completed', 'cancelled'].includes(o.status);
    }
    if (tab === 'Terjadwal' || tab === 'Draf') {
      return false;
    }
    return true;
  });

  const renderStatusLabel = (o: OrderRecord) => {
    switch (o.status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0FA958]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Selesai
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-500">
            <XCircle className="w-3.5 h-3.5" />
            Dibatalkan / Kedaluwarsa
          </span>
        );
      case 'waiting_verification':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
            <Clock className="w-3.5 h-3.5" />
            Menunggu Verifikasi Mode B
          </span>
        );
      case 'pay_on_delivery':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600">
            <Clock className="w-3.5 h-3.5" />
            Bayar di Tempat (COD)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
            <Clock className="w-3.5 h-3.5" />
            Menunggu Pembayaran / Proses
          </span>
        );
    }
  };

  return (
    <div className="min-h-full bg-[#F4F6F4] dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-6">
      <div className="bg-white dark:bg-slate-900 px-4 pt-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <h1 className="text-xl font-extrabold">Aktivitas</h1>
        <div className="mt-3 flex gap-4 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`pb-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-colors min-h-[40px] ${
                tab === t
                  ? 'border-[#0FA958] text-[#0FA958]'
                  : 'border-transparent text-slate-500 dark:text-slate-400'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          [0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl bg-white dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-800 flex gap-3"
            >
              <div className="w-12 h-12 rounded-xl skeleton-shimmer shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-3/4 rounded skeleton-shimmer" />
                <div className="h-3 w-1/2 rounded skeleton-shimmer" />
                <div className="h-3 w-1/3 rounded skeleton-shimmer" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-slate-900 p-8 text-center border border-slate-100 dark:border-slate-800">
            <p className="text-sm font-bold">Belum ada aktivitas di tab {tab}</p>
            <p className="text-xs text-slate-500 mt-1">
              Pesanan Ojek, Taksi, Makan, Kirim, dan Belanja kamu akan muncul di sini.
            </p>
          </div>
        ) : (
          filtered.map((order) => (
            <div
              key={order.orderId}
              className="rounded-3xl bg-white dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-800 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-400 tabular-nums">
                    {new Date(order.createdAt).toLocaleString('id-ID', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                  <h2 className="text-sm font-extrabold truncate mt-0.5">{order.title}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                    {order.itemsSummary}
                  </p>
                </div>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums shrink-0">
                  {formatRupiah(order.total)}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
                {renderStatusLabel(order)}

                <div className="flex items-center gap-2 shrink-0">
                  {(order.status === 'pending_payment' || order.status === 'waiting_verification') && (
                    <button
                      type="button"
                      onClick={() => onPayOrder(order)}
                      className="min-h-[36px] px-3.5 py-1 rounded-full bg-amber-500 text-white text-xs font-bold"
                    >
                      Bayar
                    </button>
                  )}
                  {order.paymentStatus === 'paid' && (
                    <button
                      type="button"
                      onClick={() => onViewReceipt(order)}
                      className="min-h-[36px] px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold inline-flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Struk</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onReorder(order)}
                    className="min-h-[36px] px-3.5 py-1 rounded-full bg-[#0FA958] text-white text-xs font-bold inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Pesan Lagi</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

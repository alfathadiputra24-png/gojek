import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Download, CheckCircle2, X } from 'lucide-react';
import { formatRupiah } from '../config/brand';
import { OrderRecord } from '../lib/api';
import { downloadOrderReceiptPdf } from '../lib/pdfReceipt';

interface OrderSuccessModalProps {
  order: OrderRecord;
  onClose: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({ order, onClose }) => {
  useEffect(() => {
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReduced) {
      void confetti({
        particleCount: 70,
        spread: 65,
        origin: { y: 0.6 },
        colors: ['#0FA958', '#8BE04E', '#F59E0B', '#00A8CC'],
      });
    }
  }, [order.orderId]);

  const handleDownloadPdf = () => {
    downloadOrderReceiptPdf({
      orderId: order.orderId,
      title: order.title,
      itemsSummary: order.itemsSummary,
      paymentMethod: order.paymentProvider,
      paymentStatus: order.paymentStatus,
      subtotal: order.subtotal,
      discount: order.discount,
      fee: order.fee,
      total: order.total,
      voucherCode: order.voucherCode,
      pickupAddress: order.pickupAddress,
      dropoffAddress: order.dropoffAddress,
      driverName: order.driverName,
      createdAt: order.createdAt,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pesanan Berhasil"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
    >
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative">
        <button
          type="button"
          aria-label="Tutup struk"
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-[#0FA958] animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="mt-3 text-xl font-extrabold">Pesanan Berhasil!</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            ID: {order.orderId}
          </p>
        </div>

        {/* E-Receipt Card */}
        <div className="mt-5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 p-4 space-y-2 text-xs">
          <div className="flex justify-between gap-2">
            <span className="text-slate-500 dark:text-slate-400">Layanan</span>
            <span className="font-bold text-right">{order.title}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500 dark:text-slate-400">Metode Bayar</span>
            <span className="font-semibold">{order.paymentProvider}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
            <span className="tabular-nums">{formatRupiah(order.subtotal)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between gap-2 text-[#0FA958]">
              <span>Voucher ({order.voucherCode})</span>
              <span className="tabular-nums">-{formatRupiah(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <span className="text-slate-500 dark:text-slate-400">Biaya Layanan</span>
            <span className="tabular-nums">{formatRupiah(order.fee)}</span>
          </div>
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-sm font-extrabold">
            <span>Total</span>
            <span className="text-[#0FA958] tabular-nums">{formatRupiah(order.total)}</span>
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="w-full min-h-[46px] rounded-full bg-[#0FA958] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-emerald-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Unduh E-Receipt (PDF)</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[44px] rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    </div>
  );
};

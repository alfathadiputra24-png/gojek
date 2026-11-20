import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  QrCode,
  RefreshCw,
  ShieldAlert,
  Ticket,
  Upload,
  Wallet,
} from 'lucide-react';
import { formatRupiah } from '../config/brand';
import { apiRequest, OrderRecord, PublicConfig, UserSession } from '../lib/api';
import { VOUCHERS } from '../lib/pricing';

interface BayarHubProps {
  session: UserSession;
  orders: OrderRecord[];
  publicConfig: PublicConfig | null;
  focusedOrderId: string | null;
  onOrderUpdated: (order: OrderRecord) => void;
  onOrderPaidSuccess: (order: OrderRecord) => void;
  onOpenAdmin: () => void;
}

export const QrisCanvasCard: React.FC<{
  payload: string;
  merchantName: string;
  merchantCity?: string;
  nmid?: string;
  amount: number;
  baseTotal?: number;
  uniqueCode?: number;
  expiresAt?: number;
  mode: 'A' | 'B';
}> = ({
  payload,
  merchantName,
  merchantCity,
  nmid,
  amount,
  baseTotal,
  uniqueCode,
  expiresAt,
  mode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [secondsLeft, setSecondsLeft] = useState(900);
  const [copiedAmount, setCopiedAmount] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !payload) return;
    void QRCode.toCanvas(canvas, payload, {
      errorCorrectionLevel: 'M',
      margin: 4,
      width: 288,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  }, [payload]);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      setSecondsLeft(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  const handleCopyAmount = async () => {
    try {
      await navigator.clipboard.writeText(String(amount));
      setCopiedAmount(true);
      window.setTimeout(() => setCopiedAmount(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  const handleDownloadQr = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `QRIS-${amount}.png`;
    a.click();
  };

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 text-center shadow-sm">
      <div className="flex items-center justify-between text-xs mb-3">
        <span className="font-bold text-slate-900 dark:text-white">
          QRIS {mode === 'A' ? 'Gateway Dinamis (Mode A)' : 'GoPay Merchant Dinamis'}
        </span>
        <span className="inline-flex items-center gap-1 font-bold text-amber-600 tabular-nums">
          <Clock className="w-3.5 h-3.5" />
          {mins}:{secs}
        </span>
      </div>

      {/* Strictly black on white, >= 280px, 4-module quiet zone, zero logo overlay */}
      <div className="inline-block bg-white p-2 rounded-2xl border border-slate-200">
        <canvas
          ref={canvasRef}
          data-testid="qris-canvas"
          className="block mx-auto w-[288px] h-[288px]"
        />
      </div>

      <p className="mt-3 text-sm font-extrabold text-slate-900 dark:text-white">
        {merchantName}
      </p>
      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        NMID: {nmid || 'ID1026484173624'}
        {merchantCity ? ` · ${merchantCity}` : ''} · Standar QRIS/GPN
      </p>

      <p className="mt-2 text-2xl font-extrabold text-[#0FA958] tabular-nums">
        {formatRupiah(amount)}
      </p>

      {typeof uniqueCode === 'number' && uniqueCode > 0 && typeof baseTotal === 'number' && (
        <div className="mt-2 mx-auto max-w-[300px] rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 px-3 py-2 text-[11px] text-emerald-900 dark:text-emerald-200">
          <p className="font-bold tabular-nums">
            Tagihan {formatRupiah(baseTotal)} + Kode Unik +{formatRupiah(uniqueCode)}
          </p>
          <p className="mt-0.5 text-[10px] opacity-90">
            Transfer sesuai nominal tepat hingga 3 digit terakhir agar status otomatis lunas.
          </p>
        </div>
      )}

      <div className="mt-3 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => void handleCopyAmount()}
          className="min-h-[38px] px-3.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold inline-flex items-center gap-1.5"
        >
          {copiedAmount ? (
            <Check className="w-3.5 h-3.5 text-[#0FA958]" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          <span>{copiedAmount ? 'Nominal Disalin' : `Salin ${amount}`}</span>
        </button>
        <button
          type="button"
          onClick={handleDownloadQr}
          className="min-h-[38px] px-3.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[#0FA958] text-xs font-bold inline-flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Simpan QR</span>
        </button>
      </div>

      <p className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400">
        Scan dengan GoPay, BCA, Mandiri, BNI, BRI, OVO, DANA, ShopeePay, atau aplikasi bank peserta QRIS.
      </p>
    </div>
  );
};

export const BayarHub: React.FC<BayarHubProps> = ({
  session,
  orders,
  publicConfig,
  focusedOrderId,
  onOrderUpdated,
  onOrderPaidSuccess,
  onOpenAdmin,
}) => {
  const pendingOrders = orders.filter((o) =>
    ['pending_payment', 'waiting_verification', 'pay_on_delivery'].includes(o.status)
  );
  const paidHistory = orders.filter((o) => o.paymentStatus === 'paid');

  const [selectedId, setSelectedId] = useState<string | null>(
    focusedOrderId || pendingOrders[0]?.orderId || null
  );
  const [proofNote, setProofNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (focusedOrderId) setSelectedId(focusedOrderId);
    else if (!selectedId && pendingOrders[0]) setSelectedId(pendingOrders[0].orderId);
  }, [focusedOrderId, pendingOrders, selectedId]);

  const activeOrder =
    pendingOrders.find((o) => o.orderId === selectedId) || pendingOrders[0] || null;

  const checkOrderPaymentStatus = async (orderId: string, manual = false) => {
    if (manual) setCheckingStatus(true);
    try {
      const res = await apiRequest<{ order: OrderRecord }>(`/api/orders/${orderId}`, {
        session,
      });
      if (res.order.paymentStatus === 'paid') {
        onOrderUpdated(res.order);
        onOrderPaidSuccess(res.order);
      } else if (res.order.status !== activeOrder?.status || res.order.paymentStatus !== activeOrder?.paymentStatus) {
        onOrderUpdated(res.order);
      } else if (manual) {
        setStatusMsg('Pembayaran masih menunggu konfirmasi atau mutasi masuk.');
      }
    } catch {
      // silent during background poll
    } finally {
      if (manual) setCheckingStatus(false);
    }
  };

  // Automatic status polling every 4s while viewing a pending QRIS order
  useEffect(() => {
    if (!activeOrder || activeOrder.paymentMethod !== 'qris' || activeOrder.paymentStatus === 'paid') {
      return;
    }
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void checkOrderPaymentStatus(activeOrder.orderId, false);
      }
    }, 4000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrder?.orderId, activeOrder?.paymentMethod, activeOrder?.paymentStatus]);

  const handleProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder || !proofNote.trim()) return;
    setBusy(true);
    setErrorMsg('');
    try {
      const res = await apiRequest<{ order: OrderRecord }>(
        `/api/orders/${activeOrder.orderId}/proof`,
        {
          method: 'POST',
          body: { proofNote: proofNote.trim() },
          session,
        }
      );
      onOrderUpdated(res.order);
      setProofNote('');
      setStatusMsg('Bukti transfer terkirim. Menunggu verifikasi admin di /admin.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mengirim bukti.');
    } finally {
      setBusy(false);
    }
  };

  const handleSandboxConfirm = async () => {
    if (!activeOrder) return;
    setBusy(true);
    setErrorMsg('');
    try {
      const res = await apiRequest<{ order: OrderRecord }>('/api/sandbox/confirm-payment', {
        method: 'POST',
        body: { orderId: activeOrder.orderId },
        session,
      });
      onOrderUpdated(res.order);
      onOrderPaidSuccess(res.order);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal konfirmasi sandbox.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 space-y-5 bg-[#F4F6F4] dark:bg-slate-950 min-h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold">Pusat Bayar</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Gateway: {(publicConfig?.paymentGateway || 'midtrans').toUpperCase()} · QRIS Mode{' '}
            {publicConfig?.qrisMode || 'B'}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAdmin}
          className="min-h-[40px] px-3 py-1.5 rounded-full bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold"
        >
          Panel /admin
        </button>
      </div>

      {statusMsg && (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 p-3 text-xs text-emerald-800 dark:text-emerald-200">
          {statusMsg}
        </div>
      )}
      {errorMsg && (
        <div className="rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 p-3 text-xs text-red-700 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Pending orders */}
      <section className="space-y-3">
        <h2 className="text-sm font-extrabold">Menunggu Pembayaran ({pendingOrders.length})</h2>
        {pendingOrders.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-slate-900 p-6 text-center border border-slate-100 dark:border-slate-800">
            <QrCode className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="mt-2 text-sm font-bold">Belum ada tagihan aktif</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Buat pesanan Ojek, Makanan, Kirim Barang, atau Belanja untuk membayar lewat QRIS, E-Wallet, atau COD.
            </p>
          </div>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {pendingOrders.map((o) => (
                <button
                  key={o.orderId}
                  type="button"
                  onClick={() => setSelectedId(o.orderId)}
                  className={`shrink-0 px-3.5 py-2 rounded-2xl text-left border transition-colors ${
                    activeOrder?.orderId === o.orderId
                      ? 'bg-[#0FA958] text-white border-[#0FA958]'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <p className="text-xs font-bold truncate max-w-[160px]">{o.title}</p>
                  <p className="text-[11px] opacity-90 tabular-nums">{formatRupiah(o.total)}</p>
                </button>
              ))}
            </div>

            {activeOrder && (
              <div className="space-y-3">
                {activeOrder.paymentMethod === 'qris' && activeOrder.qrisPayload && (
                  <QrisCanvasCard
                    payload={activeOrder.qrisPayload}
                    merchantName={
                      activeOrder.qrisMerchantName ||
                      publicConfig?.qrisMerchantName ||
                      'ALSTOREE, KESEHATAN & OLAHRAGA'
                    }
                    merchantCity={activeOrder.qrisMerchantCity || publicConfig?.qrisMerchantCity}
                    nmid={activeOrder.qrisNmid || publicConfig?.qrisNmid}
                    amount={activeOrder.total}
                    baseTotal={activeOrder.baseTotal}
                    uniqueCode={activeOrder.qrisUniqueCode}
                    expiresAt={activeOrder.expiresAt}
                    mode={activeOrder.qrisMode || 'B'}
                  />
                )}

                {activeOrder.paymentMethod === 'qris' && (
                  <button
                    type="button"
                    disabled={checkingStatus}
                    onClick={() => void checkOrderPaymentStatus(activeOrder.orderId, true)}
                    className="w-full min-h-[44px] rounded-full bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-[#0FA958] font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${checkingStatus ? 'animate-spin' : ''}`} />
                    <span>
                      {checkingStatus
                        ? 'Memeriksa Status...'
                        : 'Cek Status Pembayaran (Otomatis tiap 4 dtk)'}
                    </span>
                  </button>
                )}

                {activeOrder.paymentMethod === 'qris' && activeOrder.qrisMode === 'B' && (
                  <form
                    onSubmit={handleProofSubmit}
                    className="rounded-3xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-4 space-y-2.5"
                  >
                    <div className="flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        <strong>Konfirmasi Pembayaran:</strong> Dana masuk ke QRIS GoPay Merchant{' '}
                        <strong>{activeOrder.qrisMerchantName || 'ALSTOREE, KESEHATAN & OLAHRAGA'}</strong>. Status otomatis lunas saat mutasi cocok di <strong>/admin</strong> atau webhook, atau kirim referensi transfer di bawah.
                      </span>
                    </div>
                    <input
                      type="text"
                      value={proofNote}
                      onChange={(e) => setProofNote(e.target.value)}
                      placeholder="Contoh: Transfer GoPay a.n. Al · Ref #8821"
                      className="w-full min-h-[44px] rounded-2xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 px-3.5 text-xs"
                    />
                    <button
                      type="submit"
                      disabled={busy || !proofNote.trim()}
                      className="w-full min-h-[44px] rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Saya Sudah Bayar · Kirim Referensi</span>
                    </button>
                  </form>
                )}

                {activeOrder.paymentMethod === 'qris' && activeOrder.qrisMode === 'A' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleSandboxConfirm()}
                    className="w-full min-h-[46px] rounded-full bg-[#0FA958] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Simulasi Webhook QRIS Lunas (Sandbox)</span>
                  </button>
                )}

                {activeOrder.paymentMethod === 'ewallet' && (
                  <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-500">E-Wallet Tujuan</p>
                        <p className="text-base font-extrabold">{activeOrder.paymentProvider}</p>
                      </div>
                      <p className="text-lg font-extrabold text-[#0FA958] tabular-nums">
                        {formatRupiah(activeOrder.total)}
                      </p>
                    </div>
                    {activeOrder.deeplinkUrl && (
                      <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3 text-[11px] break-all flex items-center justify-between gap-2">
                        <span>{activeOrder.deeplinkUrl}</span>
                        <ExternalLink className="w-4 h-4 shrink-0 text-slate-400" />
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleSandboxConfirm()}
                      className="w-full min-h-[46px] rounded-full bg-[#0FA958] text-white font-bold text-sm flex items-center justify-center gap-2"
                    >
                      <Wallet className="w-4 h-4" />
                      <span>Bayar &amp; Konfirmasi Webhook (Sandbox)</span>
                    </button>
                  </div>
                )}

                {activeOrder.paymentMethod === 'cod' && (
                  <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                    <p className="text-sm font-extrabold">Bayar di Tempat (COD)</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Siapkan uang pas sebesar{' '}
                      <strong className="text-slate-900 dark:text-white tabular-nums">
                        {formatRupiah(activeOrder.total)}
                      </strong>{' '}
                      untuk kurir/driver. Status pesanan: <strong>pay_on_delivery</strong>.
                    </p>
                    <p className="text-xs text-slate-500">
                      Tujuan: {activeOrder.dropoffAddress} · HP: {activeOrder.phone}
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* Vouchers */}
      <section className="space-y-2.5">
        <h2 className="text-sm font-extrabold flex items-center gap-1.5">
          <Ticket className="w-4 h-4 text-[#0FA958]" />
          <span>Voucher Tersedia</span>
        </h2>
        <div className="space-y-2">
          {VOUCHERS.map((v) => (
            <div
              key={v.code}
              className="rounded-2xl bg-white dark:bg-slate-900 p-3.5 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3"
            >
              <div>
                <p className="text-xs font-extrabold text-[#0FA958]">{v.code}</p>
                <p className="text-xs font-bold mt-0.5">{v.title}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{v.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Payment history */}
      <section className="space-y-2">
        <h2 className="text-sm font-extrabold">Riwayat Pembayaran Lunas</h2>
        {paidHistory.length === 0 ? (
          <p className="text-xs text-slate-500">Belum ada transaksi lunas.</p>
        ) : (
          paidHistory.slice(0, 5).map((h) => (
            <div
              key={h.orderId}
              className="rounded-2xl bg-white dark:bg-slate-900 p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
            >
              <div>
                <p className="font-bold">{h.title}</p>
                <p className="text-[11px] text-slate-500">{h.paymentProvider}</p>
              </div>
              <span className="font-extrabold text-[#0FA958] tabular-nums">
                {formatRupiah(h.total)}
              </span>
            </div>
          ))
        )}
      </section>
    </div>
  );
};

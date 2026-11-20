import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Lock, ShieldCheck, XCircle } from 'lucide-react';
import { formatRupiah } from '../config/brand';
import { apiRequest, OrderRecord, UserSession } from '../lib/api';

interface AdminVerifyPageProps {
  session: UserSession | null;
  onBack: () => void;
  onOrderVerified: (order: OrderRecord) => void;
}

export const AdminVerifyPage: React.FC<AdminVerifyPageProps> = ({
  session,
  onBack,
  onOrderVerified,
}) => {
  const [adminSecret, setAdminSecret] = useState('lintasku-admin-sandbox-2026');
  const [unlocked, setUnlocked] = useState(false);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [matchMsg, setMatchMsg] = useState('');
  const [mutationInput, setMutationInput] = useState('');
  const [matching, setMatching] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadOrders = async (secretToUse = adminSecret) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await apiRequest<{ orders: OrderRecord[] }>('/api/admin/orders', {
        session,
        adminSecret: secretToUse,
      });
      setOrders(res.orders);
      setUnlocked(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memuat antrean verifikasi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session && !session.isDemo) {
      void loadOrders('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAction = async (orderId: string, action: 'approve' | 'reject') => {
    setErrorMsg('');
    setMatchMsg('');
    try {
      const res = await apiRequest<{ order: OrderRecord }>(
        `/api/admin/orders/${orderId}/verify`,
        {
          method: 'POST',
          session,
          adminSecret,
          body: { action },
        }
      );
      setOrders((prev) => prev.map((o) => (o.orderId === orderId ? res.order : o)));
      onOrderVerified(res.order);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memproses verifikasi.');
    }
  };

  const handleMutationMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mutationInput.trim()) return;
    setMatching(true);
    setErrorMsg('');
    setMatchMsg('');
    try {
      const res = await apiRequest<{ ok: boolean; order: OrderRecord }>('/api/admin/qris-match', {
        method: 'POST',
        session,
        adminSecret,
        body: { text: mutationInput.trim() },
      });
      setOrders((prev) => prev.map((o) => (o.orderId === res.order.orderId ? res.order : o)));
      onOrderVerified(res.order);
      setMatchMsg(
        `Cocok! Order ${res.order.orderId} (${formatRupiah(res.order.total)}) otomatis dikonfirmasi lunas.`
      );
      setMutationInput('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Nominal mutasi tidak cocok dengan tagihan aktif.');
    } finally {
      setMatching(false);
    }
  };

  return (
    <div className="min-h-full bg-[#F4F6F4] dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-10">
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          aria-label="Kembali"
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-sm font-extrabold flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#0FA958]" />
          <span>Admin Verifikasi QRIS &amp; COD</span>
        </h1>
        <div className="w-10" />
      </div>

      <div className="p-4 space-y-4">
        {!unlocked ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void loadOrders();
            }}
            className="rounded-3xl bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 space-y-3"
          >
            <div className="flex items-center gap-2 text-sm font-extrabold">
              <Lock className="w-4 h-4 text-[#0FA958]" />
              <span>Akses Terproteksi /admin</span>
            </div>
            <p className="text-xs text-slate-500">
              Masukkan kunci admin (atau masuk dengan email admin terverifikasi) untuk mencocokkan mutasi GoPay Merchant QRIS &amp; COD.
            </p>
            <input
              type="password"
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              placeholder="ADMIN_SECRET"
              className="w-full min-h-[44px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 text-xs"
            />
            {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] rounded-full bg-[#0FA958] text-white font-bold text-xs"
            >
              {loading ? 'Memeriksa...' : 'Buka Panel Verifikasi'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Quick exact-amount auto-match by unique code */}
            <form
              onSubmit={handleMutationMatch}
              className="rounded-3xl bg-white dark:bg-slate-900 p-4 border border-emerald-200 dark:border-emerald-900 space-y-2.5 shadow-xs"
            >
              <p className="text-xs font-extrabold text-[#0FA958]">
                Auto-Cocokkan Mutasi Masuk (GoPay Merchant)
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Masukkan nominal tepat (mis. 25347) atau tempel notifikasi masuk GoPay Merchant untuk melunaskan order otomatis.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  aria-label="Nominal atau teks mutasi QRIS"
                  value={mutationInput}
                  onChange={(e) => setMutationInput(e.target.value)}
                  placeholder="Contoh: 25347 atau Rp 25.347"
                  className="flex-1 min-h-[44px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 text-xs"
                />
                <button
                  type="submit"
                  disabled={matching || !mutationInput.trim()}
                  className="min-h-[44px] px-4 rounded-full bg-[#0FA958] text-white font-bold text-xs shrink-0 disabled:opacity-50"
                >
                  {matching ? 'Mencocokkan...' : 'Cocokkan'}
                </button>
              </div>
              {matchMsg && (
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {matchMsg}
                </p>
              )}
              {errorMsg && <p className="text-xs font-semibold text-red-600">{errorMsg}</p>}
            </form>

            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold">Antrean Pesanan ({orders.length})</h2>
              <button
                type="button"
                onClick={() => void loadOrders()}
                className="text-xs font-bold text-[#0FA958]"
              >
                Segarkan
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="rounded-3xl bg-white dark:bg-slate-900 p-6 text-center text-xs text-slate-500">
                Belum ada pesanan yang masuk.
              </div>
            ) : (
              orders.map((o) => (
                <div
                  key={o.orderId}
                  className="rounded-3xl bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-slate-400 tabular-nums">
                        {o.orderId}
                      </p>
                      <p className="text-sm font-extrabold">{o.title}</p>
                      <p className="text-xs text-slate-500">
                        {o.paymentProvider} · Status: <strong>{o.status}</strong> ({o.paymentStatus})
                      </p>
                      {typeof o.qrisUniqueCode === 'number' && o.qrisUniqueCode > 0 && (
                        <p className="mt-0.5 text-[11px] font-bold text-[#0FA958] tabular-nums">
                          Kode Unik: +{formatRupiah(o.qrisUniqueCode)}
                        </p>
                      )}
                      {o.proofNote && (
                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-300 font-semibold">
                          Bukti: {o.proofNote}
                        </p>
                      )}
                    </div>
                    <p className="text-sm font-extrabold text-[#0FA958] tabular-nums shrink-0 whitespace-nowrap">
                      {formatRupiah(o.total)}
                    </p>
                  </div>

                  {o.paymentStatus !== 'paid' && o.status !== 'cancelled' && (
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => void handleAction(o.orderId, 'approve')}
                        className="flex-1 min-h-[40px] rounded-full bg-[#0FA958] text-white text-xs font-bold inline-flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Konfirmasi Lunas</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleAction(o.orderId, 'reject')}
                        className="min-h-[40px] px-4 rounded-full bg-red-50 dark:bg-red-950/50 text-red-600 text-xs font-bold inline-flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Tolak</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

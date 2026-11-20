import React, { useMemo, useState } from 'react';
import { ArrowLeft, Minus, Plus, ShoppingBag, Star } from 'lucide-react';
import { formatRupiah } from '../config/brand';
import { RESTAURANTS, Restaurant } from '../data/catalog';
import { apiRequest, OrderRecord, UserSession } from '../lib/api';
import { computeOrderTotals } from '../lib/pricing';
import { PaymentMethodType, PaymentPicker } from './PaymentPicker';

interface FoodFlowProps {
  initialRestaurant?: Restaurant;
  session: UserSession;
  onBack: () => void;
  onOrderCreated: (order: OrderRecord) => void;
  onGoToPay: (order: OrderRecord) => void;
  onCodSuccess: (order: OrderRecord) => void;
}

const CATEGORIES = ['Semua', 'Pedas', 'Kebab & Grill', 'Kopi & Roti'] as const;

export const FoodFlow: React.FC<FoodFlowProps> = ({
  initialRestaurant,
  session,
  onBack,
  onOrderCreated,
  onGoToPay,
  onCodSuccess,
}) => {
  const [filter, setFilter] = useState<(typeof CATEGORIES)[number]>('Semua');
  const [selectedResto, setSelectedResto] = useState<Restaurant | null>(initialRestaurant || null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('qris');
  const [ewalletProvider, setEwalletProvider] = useState('GoPay');
  const [voucherCode, setVoucherCode] = useState('HEMAT25');
  const [phone, setPhone] = useState(session.phone || '+6285935617640');
  const [address, setAddress] = useState('Jl. Senopati No. 48, Jakarta Selatan');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const visibleRestaurants = useMemo(
    () => (filter === 'Semua' ? RESTAURANTS : RESTAURANTS.filter((r) => r.category === filter)),
    [filter]
  );

  const subtotal = useMemo(() => {
    if (!selectedResto) return 0;
    return selectedResto.menu.reduce((sum, m) => sum + (cart[m.id] || 0) * m.price, 0);
  }, [selectedResto, cart]);

  const totalCount = useMemo(
    () => Object.values(cart).reduce((a, b) => a + b, 0),
    [cart]
  );

  const estimate = useMemo(
    () =>
      computeOrderTotals({
        serviceType: 'makan',
        subtotal,
        fee: subtotal > 0 ? 5000 : 0,
        voucherCode,
      }),
    [subtotal, voucherCode]
  );

  const adjustQty = (itemId: string, delta: number) => {
    setCart((prev) => {
      const next = Math.max(0, (prev[itemId] || 0) + delta);
      return { ...prev, [itemId]: next };
    });
  };

  const handleCheckout = async () => {
    if (!selectedResto || totalCount === 0) return;
    setErrorMsg('');
    setBusy(true);
    try {
      const items = Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([id, quantity]) => ({ id, quantity }));
      const res = await apiRequest<{ order: OrderRecord }>('/api/orders', {
        method: 'POST',
        session,
        body: {
          serviceType: 'makan',
          restaurantId: selectedResto.id,
          items,
          paymentMethod,
          paymentProvider: paymentMethod === 'ewallet' ? ewalletProvider : undefined,
          voucherCode,
          dropoffAddress: address,
          phone,
        },
      });
      onOrderCreated(res.order);
      if (paymentMethod === 'cod') {
        onCodSuccess(res.order);
      } else {
        onGoToPay(res.order);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal membuat pesanan makan.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full bg-[#F4F6F4] dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-6">
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          aria-label="Kembali"
          onClick={() => {
            if (selectedResto) {
              setSelectedResto(null);
              setCart({});
            } else {
              onBack();
            }
          }}
          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-sm font-extrabold truncate max-w-[220px]">
          {selectedResto ? selectedResto.name : 'Pesan Makan'}
        </h1>
        <div className="w-10" />
      </div>

      {!selectedResto ? (
        <div className="p-4 space-y-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilter(cat)}
                className={`shrink-0 min-h-[38px] px-4 rounded-full text-xs font-bold transition-colors ${
                  filter === cat
                    ? 'bg-[#0FA958] text-white'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {visibleRestaurants.map((resto) => (
              <button
                key={resto.id}
                type="button"
                onClick={() => setSelectedResto(resto)}
                className="w-full text-left rounded-3xl bg-white dark:bg-slate-900 p-3 border border-slate-100 dark:border-slate-800 shadow-xs flex gap-3.5 items-center active:scale-[0.98] transition-transform"
              >
                <img
                  src={resto.image}
                  alt={resto.name}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-2xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span>{resto.category}</span>
                    <span>·</span>
                    <span>{resto.area}</span>
                    <span>·</span>
                    <span>{resto.etaMinutes}</span>
                  </div>
                  <h2 className="text-sm font-extrabold truncate mt-0.5">{resto.name}</h2>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-xs font-bold text-red-600 dark:text-red-400">
                      {resto.promoLabel}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {resto.rating}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          <div className="rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <img
              src={selectedResto.image}
              alt={selectedResto.name}
              referrerPolicy="no-referrer"
              className="w-full h-40 object-cover"
            />
            <div className="p-4">
              <p className="text-xs text-slate-500">
                {selectedResto.category} · {selectedResto.area} · {selectedResto.etaMinutes}
              </p>
              <h2 className="text-lg font-extrabold mt-0.5">{selectedResto.name}</h2>
              <p className="text-xs font-bold text-red-600 dark:text-red-400 mt-1">
                {selectedResto.promoLabel}
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <h3 className="text-sm font-extrabold">Daftar Menu</h3>
            {selectedResto.menu.map((item) => {
              const qty = cart[item.id] || 0;
              return (
                <div
                  key={item.id}
                  className="rounded-2xl bg-white dark:bg-slate-900 p-3.5 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{item.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                      {item.description}
                    </p>
                    <p className="text-xs font-extrabold text-[#0FA958] mt-1.5 tabular-nums">
                      {formatRupiah(item.price)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {qty > 0 && (
                      <>
                        <button
                          type="button"
                          aria-label={`Kurangi ${item.name}`}
                          onClick={() => adjustQty(item.id, -1)}
                          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-xs font-extrabold tabular-nums">
                          {qty}
                        </span>
                      </>
                    )}
                    <button
                      type="button"
                      aria-label={`Tambah ${item.name}`}
                      onClick={() => adjustQty(item.id, 1)}
                      className="w-9 h-9 rounded-full bg-[#0FA958] text-white flex items-center justify-center"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {totalCount > 0 && (
            <div className="space-y-3 pt-2">
              <PaymentPicker
                method={paymentMethod}
                onMethodChange={setPaymentMethod}
                ewalletProvider={ewalletProvider}
                onEwalletChange={setEwalletProvider}
                voucherCode={voucherCode}
                onVoucherChange={setVoucherCode}
                suggestedVoucher="HEMAT25"
                phone={phone}
                onPhoneChange={setPhone}
                address={address}
                onAddressChange={setAddress}
                showAddressInput
              />

              <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal ({totalCount} item)</span>
                  <span className="tabular-nums font-semibold">{formatRupiah(estimate.subtotal)}</span>
                </div>
                {estimate.discount > 0 && (
                  <div className="flex justify-between text-[#0FA958]">
                    <span>Diskon ({estimate.appliedCode})</span>
                    <span className="tabular-nums font-bold">-{formatRupiah(estimate.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Ongkos Kirim</span>
                  <span className="tabular-nums">{formatRupiah(estimate.fee)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between text-sm font-extrabold">
                  <span>Total</span>
                  <span className="text-[#0FA958] tabular-nums">{formatRupiah(estimate.total)}</span>
                </div>
              </div>

              {errorMsg && (
                <div className="rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 p-3 text-xs text-red-700 dark:text-red-300">
                  {errorMsg}
                </div>
              )}

              <button
                type="button"
                disabled={busy}
                onClick={() => void handleCheckout()}
                className="w-full min-h-[48px] rounded-full bg-[#0FA958] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{busy ? 'Memproses...' : `Pesan & Bayar · ${formatRupiah(estimate.total)}`}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

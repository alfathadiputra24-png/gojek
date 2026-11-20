import React, { useMemo, useState } from 'react';
import { ArrowLeft, Gift, Minus, Package, Plus, ShoppingCart } from 'lucide-react';
import { formatRupiah } from '../config/brand';
import { SHOP_PRODUCTS } from '../data/catalog';
import { apiRequest, OrderRecord, UserSession } from '../lib/api';
import { calculateRideFare, computeOrderTotals } from '../lib/pricing';
import { PaymentMethodType, PaymentPicker } from './PaymentPicker';

interface DeliveryShopFlowProps {
  mode: 'kirim' | 'belanja' | 'cepat' | 'hadiah';
  session: UserSession;
  onBack: () => void;
  onOrderCreated: (order: OrderRecord) => void;
  onGoToPay: (order: OrderRecord) => void;
  onCodSuccess: (order: OrderRecord) => void;
  onClaimGiftPoints: (pts: number) => void;
}

export const DeliveryShopFlow: React.FC<DeliveryShopFlowProps> = ({
  mode,
  session,
  onBack,
  onOrderCreated,
  onGoToPay,
  onCodSuccess,
  onClaimGiftPoints,
}) => {
  const [pickupAddress, setPickupAddress] = useState('Jl. Medan Merdeka Timur No. 1, Jakarta');
  const [dropoffAddress, setDropoffAddress] = useState('Jl. Kemang Raya No. 12, Jakarta Selatan');
  const [packageSize, setPackageSize] = useState<'small' | 'medium' | 'large'>('small');
  const [distanceKm, setDistanceKm] = useState(4.5);
  const [cart, setCart] = useState<Record<string, number>>({ [SHOP_PRODUCTS[0].id]: 1 });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('qris');
  const [ewalletProvider, setEwalletProvider] = useState('GoPay');
  const [voucherCode, setVoucherCode] = useState(mode === 'belanja' ? 'HEMAT25' : 'KIRIM8K');
  const [phone, setPhone] = useState(session.phone || '+6285935617640');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [giftClaimed, setGiftClaimed] = useState(false);

  const shopSubtotal = useMemo(
    () => SHOP_PRODUCTS.reduce((sum, p) => sum + (cart[p.id] || 0) * p.price, 0),
    [cart]
  );

  const deliveryFare = useMemo(() => {
    const f = calculateRideFare('kirim', distanceKm, packageSize);
    return computeOrderTotals({
      serviceType: 'kirim',
      subtotal: f.subtotal,
      fee: f.fee,
      voucherCode,
    });
  }, [distanceKm, packageSize, voucherCode]);

  const shopEstimate = useMemo(
    () =>
      computeOrderTotals({
        serviceType: 'belanja',
        subtotal: shopSubtotal,
        fee: shopSubtotal > 0 ? 6000 : 0,
        voucherCode,
      }),
    [shopSubtotal, voucherCode]
  );

  const handleCheckout = async () => {
    setErrorMsg('');
    setBusy(true);
    try {
      const body =
        mode === 'belanja'
          ? {
              serviceType: 'belanja' as const,
              items: Object.entries(cart)
                .filter(([, q]) => q > 0)
                .map(([id, quantity]) => ({ id, quantity })),
              paymentMethod,
              paymentProvider: paymentMethod === 'ewallet' ? ewalletProvider : undefined,
              voucherCode,
              dropoffAddress,
              phone,
            }
          : {
              serviceType: 'kirim' as const,
              distanceKm,
              packageSize,
              paymentMethod,
              paymentProvider: paymentMethod === 'ewallet' ? ewalletProvider : undefined,
              voucherCode,
              pickupAddress,
              dropoffAddress,
              phone,
            };

      const res = await apiRequest<{ order: OrderRecord }>('/api/orders', {
        method: 'POST',
        session,
        body,
      });
      onOrderCreated(res.order);
      if (paymentMethod === 'cod') {
        onCodSuccess(res.order);
      } else {
        onGoToPay(res.order);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memproses pesanan.');
    } finally {
      setBusy(false);
    }
  };

  const title =
    mode === 'belanja'
      ? 'Belanja Harian'
      : mode === 'cepat'
        ? 'Antar Cepat Kilat'
        : mode === 'hadiah'
          ? 'Hadiah & Poin Lintasku'
          : 'Kirim Barang';

  return (
    <div className="min-h-full bg-[#F4F6F4] dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-6">
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          aria-label="Kembali"
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-sm font-extrabold">{title}</h1>
        <div className="w-10" />
      </div>

      {mode === 'hadiah' ? (
        <div className="p-4 space-y-4">
          <div className="rounded-3xl bg-gradient-to-br from-[#0FA958] to-emerald-700 text-white p-6 text-center space-y-3 shadow-lg">
            <Gift className="w-12 h-12 mx-auto" />
            <h2 className="text-lg font-extrabold">Bonus Harian Pelanggan Setia</h2>
            <p className="text-xs text-emerald-50">
              Klaim poin bonus demo setiap hari dan gunakan kode voucher JALAN7K atau MAKAN50 saat checkout.
            </p>
            <button
              type="button"
              disabled={giftClaimed}
              onClick={() => {
                setGiftClaimed(true);
                onClaimGiftPoints(100);
              }}
              className="min-h-[44px] px-6 rounded-full bg-white text-[#0FA958] font-extrabold text-sm disabled:opacity-70"
            >
              {giftClaimed ? '100 Poin Demo Diklaim!' : 'Klaim +100 Poin Demo'}
            </button>
          </div>
        </div>
      ) : mode === 'belanja' ? (
        <div className="p-4 space-y-4">
          <div className="space-y-2.5">
            {SHOP_PRODUCTS.map((prod) => {
              const qty = cart[prod.id] || 0;
              return (
                <div
                  key={prod.id}
                  className="rounded-2xl bg-white dark:bg-slate-900 p-3.5 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-[10px] font-bold text-[#0FA958]">{prod.category}</p>
                    <p className="text-sm font-bold">{prod.name}</p>
                    <p className="text-xs text-slate-500">
                      {prod.unit} · {formatRupiah(prod.price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label={`Kurangi ${prod.name}`}
                      onClick={() =>
                        setCart((p) => ({ ...p, [prod.id]: Math.max(0, (p[prod.id] || 0) - 1) }))
                      }
                      className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center text-xs font-extrabold tabular-nums">{qty}</span>
                    <button
                      type="button"
                      aria-label={`Tambah ${prod.name}`}
                      onClick={() => setCart((p) => ({ ...p, [prod.id]: (p[prod.id] || 0) + 1 }))}
                      className="w-9 h-9 rounded-full bg-[#0FA958] text-white flex items-center justify-center"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

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
            address={dropoffAddress}
            onAddressChange={setDropoffAddress}
            showAddressInput
          />

          {errorMsg && (
            <div className="rounded-2xl bg-red-50 p-3 text-xs text-red-700">{errorMsg}</div>
          )}

          <button
            type="button"
            disabled={busy || shopSubtotal === 0}
            onClick={() => void handleCheckout()}
            className="w-full min-h-[48px] rounded-full bg-[#0FA958] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{busy ? 'Memproses...' : `Checkout · ${formatRupiah(shopEstimate.total)}`}</span>
          </button>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-sm font-extrabold">
              <Package className="w-4 h-4 text-[#0FA958]" />
              <span>Detail Pengiriman</span>
            </div>
            <label className="block">
              <span className="text-[11px] font-bold text-slate-500">Alamat Penjemputan</span>
              <input
                type="text"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                className="mt-1 w-full min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold text-slate-500">Alamat Penerima</span>
              <input
                type="text"
                value={dropoffAddress}
                onChange={(e) => setDropoffAddress(e.target.value)}
                className="mt-1 w-full min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs"
              />
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'small', label: 'Kecil (<5kg)' },
                  { id: 'medium', label: 'Sedang (<12kg)' },
                  { id: 'large', label: 'Besar (<20kg)' },
                ] as const
              ).map((sz) => (
                <button
                  key={sz.id}
                  type="button"
                  onClick={() => setPackageSize(sz.id)}
                  className={`min-h-[42px] rounded-xl border text-[11px] font-bold px-2 ${
                    packageSize === sz.id
                      ? 'border-[#0FA958] bg-emerald-50 dark:bg-emerald-950/60 text-[#0FA958]'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {sz.label}
                </button>
              ))}
            </div>
            <label className="block">
              <span className="text-[11px] font-bold text-slate-500">
                Estimasi Jarak: {distanceKm.toFixed(1)} km
              </span>
              <input
                type="range"
                min={1}
                max={20}
                step={0.5}
                value={distanceKm}
                onChange={(e) => setDistanceKm(Number(e.target.value))}
                className="w-full accent-[#0FA958]"
              />
            </label>
          </div>

          <PaymentPicker
            method={paymentMethod}
            onMethodChange={setPaymentMethod}
            ewalletProvider={ewalletProvider}
            onEwalletChange={setEwalletProvider}
            voucherCode={voucherCode}
            onVoucherChange={setVoucherCode}
            suggestedVoucher="KIRIM8K"
            phone={phone}
            onPhoneChange={setPhone}
            address={dropoffAddress}
          />

          {errorMsg && (
            <div className="rounded-2xl bg-red-50 p-3 text-xs text-red-700">{errorMsg}</div>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => void handleCheckout()}
            className="w-full min-h-[48px] rounded-full bg-[#0FA958] text-white font-extrabold text-sm shadow-lg"
          >
            {busy ? 'Memproses...' : `Kirim Paket · ${formatRupiah(deliveryFare.total)}`}
          </button>
        </div>
      )}
    </div>
  );
};

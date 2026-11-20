import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { ArrowLeft, MapPin, Navigation, Star } from 'lucide-react';
import { formatRupiah } from '../config/brand';
import { DEMO_DRIVERS, JAKARTA_LANDMARKS } from '../data/catalog';
import { apiRequest, OrderRecord, UserSession } from '../lib/api';
import { fetchOsrmRoute, RouteResult } from '../lib/osrm';
import { calculateRideFare, computeOrderTotals } from '../lib/pricing';
import { MascotAvatar } from './BrandLogo';
import { PaymentMethodType, PaymentPicker } from './PaymentPicker';
import { Vehicle3DStage } from './Vehicle3DStage';

interface RideFlowProps {
  initialVehicle: 'ojek' | 'taksi';
  session: UserSession;
  onBack: () => void;
  onOrderCreated: (order: OrderRecord) => void;
  onGoToPay: (order: OrderRecord) => void;
  onTripCompleted: (order: OrderRecord) => void;
}

function createPinIcon(color: string, label: string) {
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%)">
      <div style="background:${color};color:#fff;font-size:10px;font-weight:800;padding:3px 7px;border-radius:999px;box-shadow:0 3px 8px rgba(0,0,0,0.28);white-space:nowrap">${label}</div>
      <div style="width:12px;height:12px;border-radius:999px;background:${color};border:2.5px solid #fff;margin-top:2px;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>
    </div>`,
    iconSize: [0, 0],
  });
}

export const RideFlow: React.FC<RideFlowProps> = ({
  initialVehicle,
  session,
  onBack,
  onOrderCreated,
  onGoToPay,
  onTripCompleted,
}) => {
  const [step, setStep] = useState<'map' | 'vehicle' | 'searching' | 'tracking' | 'rating'>('map');
  const [vehicle, setVehicle] = useState<'ojek' | 'taksi'>(initialVehicle);
  const [pickup, setPickup] = useState(JAKARTA_LANDMARKS[0]);
  const [dropoff, setDropoff] = useState(JAKARTA_LANDMARKS[2]);
  const [route, setRoute] = useState<RouteResult>({
    distanceKm: 6.2,
    durationMin: 18,
    coordinates: [
      [JAKARTA_LANDMARKS[0].lat, JAKARTA_LANDMARKS[0].lng],
      [JAKARTA_LANDMARKS[2].lat, JAKARTA_LANDMARKS[2].lng],
    ],
    source: 'fallback',
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('cod');
  const [ewalletProvider, setEwalletProvider] = useState('GoPay');
  const [voucherCode, setVoucherCode] = useState('');
  const [phone, setPhone] = useState(session.phone || '+6285935617640');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeOrder, setActiveOrder] = useState<OrderRecord | null>(null);
  const [driverProgress, setDriverProgress] = useState(0);
  const [rating, setRating] = useState(5);
  const [tipAmount, setTipAmount] = useState(5000);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);

  const demoDriver = useMemo(
    () => (vehicle === 'ojek' ? DEMO_DRIVERS[0] : DEMO_DRIVERS[1]),
    [vehicle]
  );

  // Fetch OSRM route whenever pickup/dropoff changes
  useEffect(() => {
    let cancelled = false;
    void fetchOsrmRoute(pickup, dropoff).then((res) => {
      if (!cancelled) setRoute(res);
    });
    return () => {
      cancelled = true;
    };
  }, [pickup, dropoff]);

  // Initialize Leaflet map on map/tracking steps
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || (step !== 'map' && step !== 'tracking')) return;

    const map = L.map(container, {
      zoomControl: false,
      attributionControl: true,
    }).setView([pickup.lat, pickup.lng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    const pickupMarker = L.marker([pickup.lat, pickup.lng], {
      draggable: step === 'map',
      icon: createPinIcon('#0FA958', 'Jemput'),
    }).addTo(map);

    const dropoffMarker = L.marker([dropoff.lat, dropoff.lng], {
      draggable: step === 'map',
      icon: createPinIcon('#EF4444', 'Tujuan'),
    }).addTo(map);

    if (step === 'map') {
      pickupMarker.on('dragend', () => {
        const pos = pickupMarker.getLatLng();
        setPickup((prev) => ({
          ...prev,
          label: 'Titik Jemput Map',
          address: `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`,
          lat: pos.lat,
          lng: pos.lng,
        }));
      });
      dropoffMarker.on('dragend', () => {
        const pos = dropoffMarker.getLatLng();
        setDropoff((prev) => ({
          ...prev,
          label: 'Titik Tujuan Map',
          address: `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`,
          lat: pos.lat,
          lng: pos.lng,
        }));
      });
    }

    const polyline = L.polyline(route.coordinates, {
      color: '#0FA958',
      weight: 5,
      opacity: 0.85,
    }).addTo(map);
    routeLayerRef.current = polyline;

    if (step === 'tracking') {
      driverMarkerRef.current = L.marker(route.coordinates[0], {
        icon: createPinIcon('#0F172A', vehicle === 'ojek' ? 'Motor' : 'Mobil'),
      }).addTo(map);
    }

    const bounds = polyline.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [36, 36] });
    }

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      routeLayerRef.current = null;
      driverMarkerRef.current = null;
    };
    // Re-init cleanly when switching between map & tracking steps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Update polyline when route coordinates update
  useEffect(() => {
    const map = mapRef.current;
    const poly = routeLayerRef.current;
    if (!map || !poly) return;
    poly.setLatLngs(route.coordinates);
    const bounds = poly.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [36, 36] });
    }
  }, [route]);

  // Smoothly move driver marker along OSRM route during tracking
  useEffect(() => {
    if (step !== 'tracking' || route.coordinates.length < 2) return;
    setDriverProgress(0);
    const totalMs = 7000;
    const start = performance.now();
    const id = window.setInterval(() => {
      const pct = Math.min(1, (performance.now() - start) / totalMs);
      setDriverProgress(Math.round(pct * 100));
      const idxFloat = pct * (route.coordinates.length - 1);
      const i0 = Math.floor(idxFloat);
      const i1 = Math.min(route.coordinates.length - 1, i0 + 1);
      const t = idxFloat - i0;
      const [lat0, lng0] = route.coordinates[i0];
      const [lat1, lng1] = route.coordinates[i1];
      driverMarkerRef.current?.setLatLng([lat0 + (lat1 - lat0) * t, lng0 + (lng1 - lng0) * t]);
      if (pct >= 1) {
        window.clearInterval(id);
      }
    }, 120);
    return () => window.clearInterval(id);
  }, [step, route]);

  const fareOjek = useMemo(() => {
    const f = calculateRideFare('ojek', route.distanceKm);
    return computeOrderTotals({
      serviceType: 'ojek',
      subtotal: f.subtotal,
      fee: f.fee,
      voucherCode,
    });
  }, [route.distanceKm, voucherCode]);

  const fareTaksi = useMemo(() => {
    const f = calculateRideFare('taksi', route.distanceKm);
    return computeOrderTotals({
      serviceType: 'taksi',
      subtotal: f.subtotal,
      fee: f.fee,
      voucherCode,
    });
  }, [route.distanceKm, voucherCode]);

  const activeFare = vehicle === 'ojek' ? fareOjek : fareTaksi;

  const handleBookRide = async () => {
    setErrorMsg('');
    setBusy(true);
    try {
      const res = await apiRequest<{ order: OrderRecord }>('/api/orders', {
        method: 'POST',
        session,
        body: {
          serviceType: vehicle,
          distanceKm: route.distanceKm,
          paymentMethod,
          paymentProvider: paymentMethod === 'ewallet' ? ewalletProvider : undefined,
          voucherCode,
          pickupAddress: pickup.address,
          dropoffAddress: dropoff.address,
          phone,
        },
      });
      setActiveOrder(res.order);
      onOrderCreated(res.order);

      if (paymentMethod === 'qris' || paymentMethod === 'ewallet') {
        onGoToPay(res.order);
        return;
      }

      setStep('searching');
      window.setTimeout(async () => {
        try {
          const updated = await apiRequest<{ order: OrderRecord }>(
            `/api/orders/${res.order.orderId}/status`,
            {
              method: 'PATCH',
              session,
              body: { status: 'active', driverName: `${demoDriver.name} (Mode Demo)` },
            }
          );
          setActiveOrder(updated.order);
          onOrderCreated(updated.order);
        } catch {
          // proceed smoothly
        }
        setStep('tracking');
      }, 1600);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal membuat perjalanan.');
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteTrip = async () => {
    if (!activeOrder) return;
    setBusy(true);
    try {
      const res = await apiRequest<{ order: OrderRecord }>(
        `/api/orders/${activeOrder.orderId}/status`,
        {
          method: 'PATCH',
          session,
          body: { status: 'completed', rating, tipAmount },
        }
      );
      onTripCompleted(res.order);
    } catch {
      onTripCompleted({ ...activeOrder, status: 'completed', rating, tipAmount });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full bg-[#F4F6F4] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          aria-label="Kembali"
          onClick={() => {
            if (step === 'vehicle') setStep('map');
            else onBack();
          }}
          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <h1 className="text-sm font-extrabold">
            {vehicle === 'ojek' ? 'Ojek Motor' : 'Taksi Mobil'}
          </h1>
          <p className="text-[11px] text-slate-500 tabular-nums">
            {route.distanceKm.toFixed(1)} km · ~{route.durationMin} mnt ({route.source.toUpperCase()})
          </p>
        </div>
        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
          Demo Mode
        </span>
      </div>

      {/* Step 1: Map & Route */}
      {step === 'map' && (
        <div className="p-4 space-y-4 flex-1">
          <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm h-64 bg-slate-200 dark:bg-slate-800">
            <div ref={mapContainerRef} data-testid="leaflet-map" className="w-full h-full" />
          </div>

          <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div>
              <label className="text-[11px] font-bold text-[#0FA958] flex items-center gap-1 mb-1">
                <Navigation className="w-3.5 h-3.5" />
                <span>Titik Jemput (Pin bisa digeser di peta)</span>
              </label>
              <select
                aria-label="Pilih lokasi jemput"
                value={pickup.id}
                onChange={(e) => {
                  const found = JAKARTA_LANDMARKS.find((l) => l.id === e.target.value);
                  if (found) setPickup(found);
                }}
                className="w-full min-h-[44px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs font-semibold"
              >
                {JAKARTA_LANDMARKS.map((lm) => (
                  <option key={lm.id} value={lm.id}>
                    {lm.label} — {lm.address}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-red-500 flex items-center gap-1 mb-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>Lokasi Tujuan</span>
              </label>
              <select
                aria-label="Pilih lokasi tujuan"
                value={dropoff.id}
                onChange={(e) => {
                  const found = JAKARTA_LANDMARKS.find((l) => l.id === e.target.value);
                  if (found) setDropoff(found);
                }}
                className="w-full min-h-[44px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs font-semibold"
              >
                {JAKARTA_LANDMARKS.map((lm) => (
                  <option key={lm.id} value={lm.id}>
                    {lm.label} — {lm.address}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStep('vehicle')}
            className="w-full min-h-[48px] rounded-full bg-[#0FA958] text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25"
          >
            Pilih Armada 3D &amp; Tarif ({formatRupiah(activeFare.total)})
          </button>
        </div>
      )}

      {/* Step 2: 3D Vehicle Selection */}
      {step === 'vehicle' && (
        <div className="p-4 space-y-4 flex-1">
          <Vehicle3DStage vehicle={vehicle} onChangeVehicle={setVehicle} />

          {/* Vehicle cards */}
          <div className="grid grid-cols-2 gap-2.5">
            {(
              [
                { id: 'ojek', name: 'Ojek Motor', eta: '3 mnt', fare: fareOjek },
                { id: 'taksi', name: 'Taksi Mobil', eta: '5 mnt', fare: fareTaksi },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setVehicle(opt.id)}
                className={`rounded-2xl p-3.5 text-left border transition-all ${
                  vehicle === opt.id
                    ? 'border-[#0FA958] bg-emerald-50 dark:bg-emerald-950/50 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold">{opt.name}</span>
                  <span className="text-[11px] text-slate-500">{opt.eta}</span>
                </div>
                <p className="mt-1.5 text-base font-extrabold text-[#0FA958] tabular-nums">
                  {formatRupiah(opt.fare.total)}
                </p>
                {opt.fare.discount > 0 && (
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold">
                    Hemat {formatRupiah(opt.fare.discount)}
                  </p>
                )}
              </button>
            ))}
          </div>

          <PaymentPicker
            method={paymentMethod}
            onMethodChange={setPaymentMethod}
            ewalletProvider={ewalletProvider}
            onEwalletChange={setEwalletProvider}
            voucherCode={voucherCode}
            onVoucherChange={setVoucherCode}
            suggestedVoucher="JALAN7K"
            phone={phone}
            onPhoneChange={setPhone}
            address={dropoff.address}
          />

          {errorMsg && (
            <div className="rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 p-3 text-xs text-red-700 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => void handleBookRide()}
            className="w-full min-h-[48px] rounded-full bg-[#0FA958] hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg"
          >
            {busy ? 'Memproses...' : `Pesan ${vehicle === 'ojek' ? 'Ojek' : 'Taksi'} · ${formatRupiah(activeFare.total)}`}
          </button>
        </div>
      )}

      {/* Step 3: Finding Driver Animation */}
      {step === 'searching' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-emerald-500/15 animate-ping absolute inset-0" />
            <div className="w-32 h-32 rounded-full bg-white dark:bg-slate-900 border-4 border-[#0FA958] flex items-center justify-center relative z-10 shadow-xl">
              <MascotAvatar className="w-20 h-20 rounded-2xl" />
            </div>
          </div>
          <h2 className="mt-6 text-lg font-extrabold">Mencari Mitra Driver...</h2>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 max-w-xs">
            Menghubungkan ke driver terdekat di sekitar {pickup.label}. (Simulasi Driver Mode Demo)
          </p>
        </div>
      )}

      {/* Step 4: Live Trip Tracking */}
      {step === 'tracking' && (
        <div className="p-4 space-y-4 flex-1">
          <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm h-64">
            <div ref={mapContainerRef} className="w-full h-full" />
          </div>

          <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-amber-600">
                  Driver Ditemukan · Demo Mode
                </span>
                <h2 className="text-base font-extrabold">{demoDriver.name}</h2>
                <p className="text-xs text-slate-500">
                  {demoDriver.vehicle} · <strong>{demoDriver.plate}</strong>
                </p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {demoDriver.rating}
                </span>
                <p className="text-[11px] font-bold text-[#0FA958] tabular-nums mt-0.5">
                  Progres {driverProgress}%
                </p>
              </div>
            </div>

            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-[#0FA958] transition-all duration-200"
                style={{ width: `${driverProgress}%` }}
              />
            </div>

            <button
              type="button"
              onClick={() => setStep('rating')}
              className="w-full min-h-[46px] rounded-full bg-[#0FA958] text-white font-bold text-sm"
            >
              {driverProgress >= 100 ? 'Tiba di Tujuan · Beri Rating' : 'Selesaikan Perjalanan (Simulasi Tiba)'}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Rating & Tip */}
      {step === 'rating' && (
        <div className="p-6 flex-1 flex flex-col justify-center space-y-5">
          <div className="rounded-3xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 text-center space-y-4">
            <MascotAvatar className="w-16 h-16 rounded-2xl mx-auto" />
            <div>
              <h2 className="text-lg font-extrabold">Perjalanan Selesai!</h2>
              <p className="text-xs text-slate-500 mt-1">
                Bagaimana perjalananmu bersama {demoDriver.name}?
              </p>
            </div>

            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`Beri ${n} bintang`}
                  onClick={() => setRating(n)}
                  className="p-1.5"
                >
                  <Star
                    className={`w-8 h-8 ${
                      n <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            <div>
              <p className="text-xs font-bold mb-2">Tip Apresiasi Driver (Opsional)</p>
              <div className="grid grid-cols-4 gap-2">
                {[0, 5000, 10000, 20000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTipAmount(amt)}
                    className={`min-h-[40px] rounded-xl text-xs font-bold border ${
                      tipAmount === amt
                        ? 'bg-[#0FA958] text-white border-[#0FA958]'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {amt === 0 ? 'Rp 0' : formatRupiah(amt)}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => void handleCompleteTrip()}
              className="w-full min-h-[48px] rounded-full bg-[#0FA958] text-white font-extrabold text-sm shadow-md"
            >
              Kirim Rating &amp; Lihat E-Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

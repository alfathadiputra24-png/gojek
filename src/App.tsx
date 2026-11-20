import React, { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { WifiOff } from 'lucide-react';
import { AdminVerifyPage } from './components/AdminVerifyPage';
import { AktivitasScreen } from './components/AktivitasScreen';
import { AuthFlow } from './components/AuthFlow';
import { BayarHub } from './components/BayarHub';
import { BottomNav, TabKey } from './components/BottomNav';
import { BugReportModal } from './components/BugReportModal';
import { ChatScreen } from './components/ChatScreen';
import { DeliveryShopFlow } from './components/DeliveryShopFlow';
import { FoodFlow } from './components/FoodFlow';
import { HomeScreen, ServiceRoute } from './components/HomeScreen';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { ProfilScreen } from './components/ProfilScreen';
import { RideFlow } from './components/RideFlow';
import { BRAND_NAME } from './config/brand';
import { Restaurant } from './data/catalog';
import { apiRequest, OrderRecord, PublicConfig, SavedAddress, UserSession } from './lib/api';
import { auth, db, handleFirestoreError, logoutFirebase, OperationType } from './lib/firebase';
import { useOnlineStatus } from './lib/pwa';
import { useShakeToReport } from './lib/shakeDetector';

type ActiveView =
  | { kind: 'tab'; tab: TabKey }
  | { kind: 'ride'; vehicle: 'ojek' | 'taksi' }
  | { kind: 'food'; restaurant?: Restaurant }
  | { kind: 'delivery'; mode: 'kirim' | 'belanja' | 'cepat' | 'hadiah' }
  | { kind: 'admin' };

const DEMO_SESSION: UserSession = {
  uid: 'demo-user-lintasku',
  displayName: 'Al (Demo)',
  email: 'demo@lintasku.id',
  phone: '+6285935617640',
  isDemo: true,
  emailVerified: true,
};

const DEFAULT_DEMO_ADDRESSES: SavedAddress[] = [
  {
    id: 'addr-home',
    label: 'Rumah',
    address: 'Jl. Kemang Raya No. 12, Jakarta Selatan',
    lat: -6.2607,
    lng: 106.8135,
    isDefault: true,
  },
  {
    id: 'addr-office',
    label: 'Kantor',
    address: 'Jl. Jend. Sudirman Kav. 52, SCBD Jakarta',
    lat: -6.2246,
    lng: 106.8095,
    isDefault: false,
  },
];

function getInitialDarkMode(): boolean {
  try {
    const saved = window.localStorage.getItem('lintasku_theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
  } catch {
    // ignore storage restriction
  }
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

function getInitialShakeEnabled(): boolean {
  try {
    const saved = window.localStorage.getItem('lintasku_shake_report');
    if (saved === 'false') return false;
    if (saved === 'true') return true;
  } catch {
    // ignore storage restriction
  }
  return true;
}

export default function App() {
  const isOnline = useOnlineStatus();
  const [darkMode, setDarkMode] = useState<boolean>(getInitialDarkMode);
  const [shakeEnabled, setShakeEnabled] = useState<boolean>(getInitialShakeEnabled);
  const [bugModal, setBugModal] = useState<{ open: boolean; triggerSource: 'shake' | 'manual' }>({
    open: false,
    triggerSource: 'shake',
  });
  const [session, setSession] = useState<UserSession | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return DEMO_SESSION;
      }
    }
    return null;
  });
  const [authReady, setAuthReady] = useState<boolean>(false);

  const [view, setView] = useState<ActiveView>(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/admin') {
      return { kind: 'admin' };
    }
    return { kind: 'tab', tab: 'home' };
  });
  const [transitionDir, setTransitionDir] = useState<'forward' | 'back'>('forward');

  const [publicConfig, setPublicConfig] = useState<PublicConfig | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(false);
  const [focusedPayOrderId, setFocusedPayOrderId] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<OrderRecord | null>(null);
  const [addresses, setAddresses] = useState<SavedAddress[]>(DEFAULT_DEMO_ADDRESSES);
  const [demoBalance, setDemoBalance] = useState<number>(125000);
  const [demoPoints, setDemoPoints] = useState<number>(443);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(1);
  const [toastMsg, setToastMsg] = useState<string>('');

  const mainScrollRef = useRef<HTMLElement>(null);
  const screenAnimRef = useRef<HTMLDivElement>(null);
  const profileSyncPromiseRef = useRef<Promise<void> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((curr) => (curr === msg ? '' : curr));
    }, 2800);
  }, []);

  const { permissionState: motionPermission, requestPermission: requestMotionPermission } =
    useShakeToReport({
      enabled: shakeEnabled,
      paused: bugModal.open || !session,
      onShake: () => {
        setBugModal({ open: true, triggerSource: 'shake' });
      },
    });

  // Theme & Shake-to-Report preference persistence
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try {
      window.localStorage.setItem('lintasku_theme', darkMode ? 'dark' : 'light');
    } catch {
      // ignore storage errors
    }
  }, [darkMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem('lintasku_shake_report', String(shakeEnabled));
    } catch {
      // ignore storage errors
    }
  }, [shakeEnabled]);

  // Browser history sync for /admin
  useEffect(() => {
    const onPopState = () => {
      if (window.location.pathname === '/admin') {
        setTransitionDir('forward');
        setView({ kind: 'admin' });
      } else {
        setTransitionDir('back');
        setView({ kind: 'tab', tab: 'home' });
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Public gateway & QRIS config
  useEffect(() => {
    fetch('/api/config/public')
      .then((r) => r.json())
      .then((cfg: PublicConfig) => setPublicConfig(cfg))
      .catch(() => {
        // fallback defaults
      });
  }, []);

  // Firebase Auth listener + Firestore user profile sync
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const safeDisplayName =
          (fbUser.displayName || fbUser.email?.split('@')[0] || 'Pengguna').trim().slice(0, 100) ||
          'Pengguna';
        const rawEmail = (fbUser.email || '').trim();
        const safeEmail =
          rawEmail.length >= 3 ? rawEmail.slice(0, 160) : `${fbUser.uid}@lintasku.id`.slice(0, 160);
        const safePhone = (fbUser.phoneNumber || '+6285935617640').trim().slice(0, 32);

        const nextSession: UserSession = {
          uid: fbUser.uid,
          displayName: safeDisplayName,
          email: fbUser.email || '',
          phone: safePhone,
          isDemo: false,
          emailVerified: fbUser.emailVerified,
        };
        setSession(nextSession);

        if (fbUser.emailVerified) {
          const syncTask = (async () => {
            const userRef = doc(db, 'users', fbUser.uid);
            let existingSnap;
            try {
              existingSnap = await getDoc(userRef);
            } catch (err) {
              handleFirestoreError(err, OperationType.GET, `users/${fbUser.uid}`);
            }

            if (!existingSnap.exists()) {
              try {
                await setDoc(userRef, {
                  userId: fbUser.uid,
                  displayName: safeDisplayName,
                  email: safeEmail,
                  phone: safePhone,
                  demoBalance: 125000,
                  demoPoints: 443,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });
              } catch (err) {
                handleFirestoreError(err, OperationType.CREATE, `users/${fbUser.uid}`);
              }
            } else {
              const existingData = existingSnap.data();
              if (typeof existingData.demoBalance === 'number') {
                setDemoBalance(existingData.demoBalance);
              }
              if (typeof existingData.demoPoints === 'number') {
                setDemoPoints(existingData.demoPoints);
              }
              try {
                await updateDoc(userRef, {
                  displayName: safeDisplayName,
                  phone: safePhone,
                  updatedAt: serverTimestamp(),
                });
              } catch (err) {
                handleFirestoreError(err, OperationType.UPDATE, `users/${fbUser.uid}`);
              }
            }
          })();

          profileSyncPromiseRef.current = syncTask;
          try {
            await syncTask;
          } finally {
            if (profileSyncPromiseRef.current === syncTask) {
              profileSyncPromiseRef.current = null;
            }
          }
        }
      } else {
        profileSyncPromiseRef.current = null;
        setSession((curr) => (curr?.isDemo ? curr : null));
      }
      setAuthReady(true);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Firestore addresses real-time listener for verified authenticated users
  useEffect(() => {
    if (!session || session.isDemo || !session.emailVerified) {
      setAddresses(DEFAULT_DEMO_ADDRESSES);
      return;
    }

    const q = query(
      collection(db, 'users', session.uid, 'addresses'),
      where('userId', '==', session.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: SavedAddress[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            label: String(data.label || 'Alamat'),
            address: String(data.address || ''),
            lat: Number(data.lat || -6.2),
            lng: Number(data.lng || 106.81),
            isDefault: Boolean(data.isDefault),
          };
        });
        setAddresses(items.length > 0 ? items : DEFAULT_DEMO_ADDRESSES);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${session.uid}/addresses`)
    );

    return () => unsub();
  }, [session]);

  const refreshOrders = useCallback(async () => {
    if (!session) return;
    setOrdersLoading(true);
    try {
      const res = await apiRequest<{ orders: OrderRecord[] }>('/api/orders', { session });
      setOrders(res.orders);
    } catch {
      // keep current orders
    } finally {
      setOrdersLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      void refreshOrders();
    }
  }, [session, refreshOrders]);

  // GSAP spring page transition
  useEffect(() => {
    const el = screenAnimRef.current;
    if (!el) return;
    mainScrollRef.current?.scrollTo({ top: 0 });

    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const offsetX = transitionDir === 'forward' ? 32 : -32;
    gsap.fromTo(
      el,
      { opacity: 0.72, x: offsetX, scale: 0.975 },
      { opacity: 1, x: 0, scale: 1, duration: 0.52, ease: 'back.out(1.25)', clearProps: 'transform' }
    );
  }, [view, transitionDir]);

  const navigateTo = (next: ActiveView, dir: 'forward' | 'back' = 'forward') => {
    if (next.kind === 'admin' && window.location.pathname !== '/admin') {
      window.history.pushState({}, '', '/admin');
    } else if (next.kind !== 'admin' && window.location.pathname === '/admin') {
      window.history.pushState({}, '', '/');
    }
    setTransitionDir(dir);
    setView(next);
  };

  const handleOpenService = (service: ServiceRoute, restaurant?: Restaurant) => {
    if (service === 'ojek' || service === 'taksi') {
      navigateTo({ kind: 'ride', vehicle: service }, 'forward');
    } else if (service === 'makan') {
      navigateTo({ kind: 'food', restaurant }, 'forward');
    } else {
      navigateTo({ kind: 'delivery', mode: service }, 'forward');
    }
  };

  const upsertOrder = (order: OrderRecord) => {
    setOrders((prev) => {
      const idx = prev.findIndex((o) => o.orderId === order.orderId);
      if (idx === -1) return [order, ...prev];
      const next = [...prev];
      next[idx] = order;
      return next;
    });
  };

  const handleGoToPay = (order: OrderRecord) => {
    upsertOrder(order);
    setFocusedPayOrderId(order.orderId);
    navigateTo({ kind: 'tab', tab: 'bayar' }, 'forward');
  };

  const handleOrderPaidOrCompleted = (order: OrderRecord) => {
    upsertOrder(order);
    setSuccessOrder(order);
  };

  const handleReorder = (order: OrderRecord) => {
    if (order.serviceType === 'ojek' || order.serviceType === 'taksi') {
      navigateTo({ kind: 'ride', vehicle: order.serviceType }, 'forward');
    } else if (order.serviceType === 'makan') {
      navigateTo({ kind: 'food' }, 'forward');
    } else if (order.serviceType === 'belanja') {
      navigateTo({ kind: 'delivery', mode: 'belanja' }, 'forward');
    } else {
      navigateTo({ kind: 'delivery', mode: 'kirim' }, 'forward');
    }
  };

  const handleAddAddress = async (label: string, address: string) => {
    const cleanLabel = label.trim().slice(0, 60);
    const cleanAddress = address.trim().slice(0, 240);
    if (!cleanLabel) {
      showToast('Label alamat tidak boleh kosong.');
      return;
    }
    if (cleanAddress.length < 3) {
      showToast('Alamat lengkap minimal 3 karakter.');
      return;
    }

    const newId = `addr-${Date.now()}`;
    const nextItem: SavedAddress = {
      id: newId,
      label: cleanLabel,
      address: cleanAddress,
      lat: -6.2088,
      lng: 106.8456,
      isDefault: false,
    };

    if (!session || session.isDemo || !session.emailVerified) {
      setAddresses((prev) => [...prev, nextItem]);
      showToast(`Alamat "${cleanLabel}" disimpan.`);
      return;
    }

    if (profileSyncPromiseRef.current) {
      await profileSyncPromiseRef.current.catch(() => undefined);
    }

    try {
      await setDoc(doc(db, 'users', session.uid, 'addresses', newId), {
        userId: session.uid,
        label: cleanLabel,
        address: cleanAddress,
        lat: nextItem.lat,
        lng: nextItem.lng,
        isDefault: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast(`Alamat "${cleanLabel}" tersinkronisasi ke akun.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${session.uid}/addresses/${newId}`);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!session || session.isDemo || !session.emailVerified) {
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', session.uid, 'addresses', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${session.uid}/addresses/${id}`);
    }
  };

  const handleLogout = async () => {
    if (session && !session.isDemo) {
      await logoutFirebase();
    }
    setSession(null);
    setOrders([]);
    navigateTo({ kind: 'tab', tab: 'home' }, 'back');
  };

  const showBottomNav = view.kind === 'tab' && session !== null;

  return (
    <div className="min-h-screen w-full bg-slate-200/80 dark:bg-slate-950 md:py-4 md:px-4 flex items-center justify-center">
      {/* Mobile-first 430px centered phone frame on desktop, fullscreen on mobile */}
      <div
        className="w-full max-w-[430px] h-screen md:h-[min(860px,92vh)] bg-[#F4F6F4] dark:bg-slate-950 md:rounded-[40px] md:border-[8px] md:border-slate-900 dark:md:border-slate-800 md:shadow-2xl overflow-hidden flex flex-col relative [transform:translateZ(0)]"
        data-app-brand={BRAND_NAME}
      >
        {!isOnline && (
          <div className="bg-amber-500 text-white text-[11px] font-bold px-4 py-1.5 flex items-center justify-center gap-1.5 z-40">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Koneksi offline — menampilkan cache aplikasi</span>
          </div>
        )}

        {toastMsg && (
          <div
            role="status"
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-bold shadow-lg whitespace-nowrap"
          >
            {toastMsg}
          </div>
        )}

        {view.kind === 'admin' ? (
          <main ref={mainScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
            <div ref={screenAnimRef} className="min-h-full">
              <AdminVerifyPage
                session={session}
                onBack={() =>
                  navigateTo(
                    { kind: 'tab', tab: session ? 'profil' : 'home' },
                    'back'
                  )
                }
                onOrderVerified={(order) => {
                  upsertOrder(order);
                  showToast(`Order ${order.orderId} diperbarui.`);
                }}
              />
            </div>
          </main>
        ) : !session ? (
          <main ref={mainScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
            <div ref={screenAnimRef} className="min-h-full">
              {authReady ? (
                <AuthFlow
                  onDemoEnter={() => {
                    setSession(DEMO_SESSION);
                    navigateTo({ kind: 'tab', tab: 'home' }, 'forward');
                  }}
                  onAuthSuccess={() => {
                    navigateTo({ kind: 'tab', tab: 'home' }, 'forward');
                  }}
                />
              ) : (
                <div className="min-h-screen flex items-center justify-center header-gradient-lintasku text-white text-sm font-bold">
                  Memuat {BRAND_NAME}...
                </div>
              )}
            </div>
          </main>
        ) : (
          <>
            <main ref={mainScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
              <div ref={screenAnimRef} className="min-h-full">
                {view.kind === 'tab' && view.tab === 'home' && (
                  <HomeScreen
                    demoBalance={demoBalance}
                    demoPoints={demoPoints}
                    onOpenService={handleOpenService}
                    onOpenBayar={() => navigateTo({ kind: 'tab', tab: 'bayar' }, 'forward')}
                    onOpenAktivitas={() =>
                      navigateTo({ kind: 'tab', tab: 'aktivitas' }, 'forward')
                    }
                    onDemoTopup={() => {
                      setDemoBalance((b) => b + 100000);
                      showToast('Saldo Demo +Rp 100.000 ditambahkan');
                    }}
                  />
                )}

                {view.kind === 'tab' && view.tab === 'aktivitas' && (
                  <AktivitasScreen
                    orders={orders}
                    loading={ordersLoading}
                    onReorder={handleReorder}
                    onPayOrder={handleGoToPay}
                    onViewReceipt={(order) => setSuccessOrder(order)}
                  />
                )}

                {view.kind === 'tab' && view.tab === 'bayar' && (
                  <BayarHub
                    session={session}
                    orders={orders}
                    publicConfig={publicConfig}
                    focusedOrderId={focusedPayOrderId}
                    onOrderUpdated={upsertOrder}
                    onOrderPaidSuccess={handleOrderPaidOrCompleted}
                    onOpenAdmin={() => navigateTo({ kind: 'admin' }, 'forward')}
                  />
                )}

                {view.kind === 'tab' && view.tab === 'chat' && (
                  <ChatScreen
                    session={session}
                    onUnreadCountChange={setUnreadChatCount}
                  />
                )}

                {view.kind === 'tab' && view.tab === 'profil' && (
                  <ProfilScreen
                    session={session}
                    darkMode={darkMode}
                    onToggleTheme={() => setDarkMode((d) => !d)}
                    shakeEnabled={shakeEnabled}
                    motionPermission={motionPermission}
                    onToggleShake={() => {
                      setShakeEnabled((s) => !s);
                      showToast(
                        !shakeEnabled
                          ? 'Goyang untuk lapor bug diaktifkan.'
                          : 'Goyang untuk lapor bug dinonaktifkan.'
                      );
                    }}
                    onRequestMotionPermission={requestMotionPermission}
                    onOpenBugReport={() =>
                      setBugModal({ open: true, triggerSource: 'manual' })
                    }
                    addresses={addresses}
                    onAddAddress={(label, address) => void handleAddAddress(label, address)}
                    onDeleteAddress={(id) => void handleDeleteAddress(id)}
                    onOpenBayar={() => navigateTo({ kind: 'tab', tab: 'bayar' }, 'forward')}
                    onOpenAdmin={() => navigateTo({ kind: 'admin' }, 'forward')}
                    onLogout={() => void handleLogout()}
                  />
                )}

                {view.kind === 'ride' && (
                  <RideFlow
                    initialVehicle={view.vehicle}
                    session={session}
                    onBack={() => navigateTo({ kind: 'tab', tab: 'home' }, 'back')}
                    onOrderCreated={upsertOrder}
                    onGoToPay={handleGoToPay}
                    onTripCompleted={handleOrderPaidOrCompleted}
                  />
                )}

                {view.kind === 'food' && (
                  <FoodFlow
                    initialRestaurant={view.restaurant}
                    session={session}
                    onBack={() => navigateTo({ kind: 'tab', tab: 'home' }, 'back')}
                    onOrderCreated={upsertOrder}
                    onGoToPay={handleGoToPay}
                    onCodSuccess={handleOrderPaidOrCompleted}
                  />
                )}

                {view.kind === 'delivery' && (
                  <DeliveryShopFlow
                    mode={view.mode}
                    session={session}
                    onBack={() => navigateTo({ kind: 'tab', tab: 'home' }, 'back')}
                    onOrderCreated={upsertOrder}
                    onGoToPay={handleGoToPay}
                    onCodSuccess={handleOrderPaidOrCompleted}
                    onClaimGiftPoints={(pts) => {
                      setDemoPoints((p) => p + pts);
                      showToast(`+${pts} Poin Demo berhasil diklaim!`);
                    }}
                  />
                )}
              </div>
            </main>

            {showBottomNav && view.kind === 'tab' && (
              <BottomNav
                activeTab={view.tab}
                onSelect={(nextTab) => {
                  const order: TabKey[] = ['home', 'aktivitas', 'bayar', 'chat', 'profil'];
                  const dir = order.indexOf(nextTab) >= order.indexOf(view.tab) ? 'forward' : 'back';
                  navigateTo({ kind: 'tab', tab: nextTab }, dir);
                }}
                unreadChatCount={unreadChatCount}
              />
            )}
          </>
        )}

        {successOrder && (
          <OrderSuccessModal
            order={successOrder}
            onClose={() => {
              setSuccessOrder(null);
              navigateTo({ kind: 'tab', tab: 'home' }, 'back');
            }}
          />
        )}

        {bugModal.open && session && (
          <BugReportModal
            session={session}
            currentScreen={
              view.kind === 'tab'
                ? view.tab
                : view.kind === 'ride'
                  ? view.vehicle
                  : view.kind === 'delivery'
                    ? view.mode
                    : view.kind
            }
            triggerSource={bugModal.triggerSource}
            onClose={() => setBugModal((prev) => ({ ...prev, open: false }))}
          />
        )}
      </div>
    </div>
  );
}

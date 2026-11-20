import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import dotenv from 'dotenv';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { RESTAURANTS, SHOP_PRODUCTS, PROMO_BANNERS, DEMO_DRIVERS } from './src/data/catalog.ts';
import { calculateRideFare, computeOrderTotals, VOUCHERS } from './src/lib/pricing.ts';
import {
  allocateUniqueQrisAmount,
  parseMutationAmount,
  toDynamic,
  validateStatic,
} from './server/qris.ts';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const QRIS_MODE = (process.env.QRIS_MODE || 'B').toUpperCase() === 'A' ? 'A' : 'B';
const QRIS_UNIQUE_CODE = (process.env.QRIS_UNIQUE_CODE ?? 'true').toLowerCase() === 'true';
const QRIS_MERCHANT_NAME = (process.env.QRIS_MERCHANT_NAME || 'ALSTOREE, KESEHATAN & OLAHRAGA').trim();
const QRIS_NMID = (process.env.QRIS_NMID || 'ID1026484173624').trim();
const QRIS_STATIC_PAYLOAD = (process.env.QRIS_STATIC_PAYLOAD || '').trim();

let validatedStaticQris: ReturnType<typeof validateStatic>;
try {
  validatedStaticQris = validateStatic(QRIS_STATIC_PAYLOAD, {
    expectedMerchantName: QRIS_MERCHANT_NAME,
    expectedNmid: QRIS_NMID,
  });
} catch (err) {
  console.error(
    `[FATAL QRIS STARTUP ERROR] ${err instanceof Error ? err.message : String(err)}`
  );
  process.exit(1);
}

const PAYMENT_GATEWAY = (process.env.PAYMENT_GATEWAY || 'midtrans').toLowerCase() === 'xendit' ? 'xendit' : 'midtrans';
const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY || '';
const XENDIT_CALLBACK_TOKEN = process.env.XENDIT_CALLBACK_TOKEN || '';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'lintasku-admin-sandbox-2026';
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'alfathadiputra24@gmail.com')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// Initialize Firebase Admin (only verifyIdToken is used, which works without IAM on all projects)
let firebaseProjectId = '';
try {
  const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    firebaseProjectId = cfg.projectId || '';
  }
} catch {
  firebaseProjectId = '';
}

if (firebaseProjectId) {
  if (!getApps().length) {
    initializeApp({ projectId: firebaseProjectId });
  } else {
    getApp();
  }
}

export interface ServerOrder {
  orderId: string;
  userId: string;
  userEmail?: string;
  isDemoUser: boolean;
  serviceType: 'ojek' | 'taksi' | 'makan' | 'kirim' | 'belanja';
  title: string;
  itemsSummary: string;
  status:
    | 'pending_payment'
    | 'waiting_verification'
    | 'pay_on_delivery'
    | 'finding_driver'
    | 'active'
    | 'arrived'
    | 'completed'
    | 'cancelled';
  paymentMethod: 'qris' | 'ewallet' | 'cod';
  paymentProvider: string;
  paymentStatus: 'unpaid' | 'waiting_verification' | 'paid' | 'expired';
  subtotal: number;
  discount: number;
  fee: number;
  baseTotal?: number;
  qrisUniqueCode?: number;
  total: number;
  voucherCode: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  phone?: string;
  driverName?: string;
  rating?: number;
  tipAmount?: number;
  qrisMode?: 'A' | 'B';
  qrisPayload?: string;
  qrisMerchantName?: string;
  qrisMerchantCity?: string;
  qrisNmid?: string;
  paidAt?: number;
  paidByMatch?: string;
  deeplinkUrl?: string;
  proofNote?: string;
  expiresAt?: number;
  createdAt: number;
  updatedAt: number;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const BUG_REPORTS_FILE = path.join(DATA_DIR, 'bug_reports.json');

interface ServerBugReport {
  reportId: string;
  userId: string;
  category: 'bug' | 'payment' | 'map' | 'performance' | 'other';
  title: string;
  description: string;
  currentScreen?: string;
  deviceInfo?: string;
  triggerSource: 'shake' | 'manual';
  status: 'open' | 'resolved';
  createdAt: number;
  updatedAt: number;
}

const ordersStore = new Map<string, ServerOrder>();
const bugReportsStore: ServerBugReport[] = [];
const processedWebhooks = new Set<string>();

function loadPersistedOrders() {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
      if (Array.isArray(raw)) {
        for (const order of raw) {
          if (order && typeof order.orderId === 'string') {
            ordersStore.set(order.orderId, order);
          }
        }
      }
    }
    if (fs.existsSync(BUG_REPORTS_FILE)) {
      const rawReports = JSON.parse(fs.readFileSync(BUG_REPORTS_FILE, 'utf8'));
      if (Array.isArray(rawReports)) {
        for (const r of rawReports) {
          if (r && typeof r.reportId === 'string') {
            bugReportsStore.push(r);
          }
        }
      }
    }
  } catch {
    // ignore corrupted cache
  }
}

function savePersistedOrders() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(Array.from(ordersStore.values()), null, 2));
  } catch {
    // non-fatal in read-only env
  }
}

function savePersistedBugReports() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(BUG_REPORTS_FILE, JSON.stringify(bugReportsStore.slice(0, 200), null, 2));
  } catch {
    // non-fatal in read-only env
  }
}

loadPersistedOrders();

function expireStaleOrders() {
  const now = Date.now();
  let changed = false;
  for (const order of ordersStore.values()) {
    if (
      (order.status === 'pending_payment' || order.status === 'waiting_verification') &&
      order.expiresAt &&
      order.expiresAt < now
    ) {
      order.status = 'cancelled';
      order.paymentStatus = 'expired';
      order.updatedAt = now;
      changed = true;
    }
  }
  if (changed) savePersistedOrders();
}

interface AuthRequest extends express.Request {
  authUser?: {
    uid: string;
    email?: string;
    emailVerified?: boolean;
    isDemo: boolean;
  };
}

async function authenticateUser(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ') && firebaseProjectId) {
    const token = authHeader.slice(7).trim();
    try {
      const decoded = await getAuth().verifyIdToken(token);
      req.authUser = {
        uid: decoded.uid,
        email: decoded.email,
        emailVerified: decoded.email_verified,
        isDemo: false,
      };
      return next();
    } catch {
      return res.status(401).json({ error: 'Token Firebase tidak valid atau kedaluwarsa.' });
    }
  }

  const demoUserId = req.headers['x-demo-user'];
  if (typeof demoUserId === 'string' && /^[a-zA-Z0-9_-]{3,64}$/.test(demoUserId)) {
    req.authUser = {
      uid: demoUserId,
      email: 'demo@lintasku.id',
      emailVerified: true,
      isDemo: true,
    };
    return next();
  }

  return res.status(401).json({ error: 'Autentikasi diperlukan untuk mengakses endpoint ini.' });
}

function authenticateAdmin(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  const secretHeader = req.headers['x-admin-secret'];
  if (typeof secretHeader === 'string' && secretHeader.length > 0) {
    const a = Buffer.from(secretHeader);
    const b = Buffer.from(ADMIN_SECRET);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return next();
    }
    return res.status(403).json({ error: 'Kunci admin tidak valid.' });
  }

  if (req.authUser && !req.authUser.isDemo && req.authUser.email && req.authUser.emailVerified) {
    if (ADMIN_EMAILS.includes(req.authUser.email.toLowerCase())) {
      return next();
    }
  }

  return res.status(403).json({ error: 'Akses khusus admin verifikasi diperlukan.' });
}

function computeServerSubtotal(body: {
  serviceType: ServerOrder['serviceType'];
  distanceKm?: number;
  packageSize?: 'small' | 'medium' | 'large';
  restaurantId?: string;
  items?: Array<{ id: string; quantity: number }>;
}): { subtotal: number; fee: number; title: string; itemsSummary: string } {
  const { serviceType } = body;
  if (serviceType === 'ojek' || serviceType === 'taksi' || serviceType === 'kirim') {
    const km = Number(body.distanceKm || 2.5);
    const fare = calculateRideFare(serviceType, km, body.packageSize || 'small');
    const title =
      serviceType === 'ojek'
        ? `Ojek Motor (${km.toFixed(1)} km)`
        : serviceType === 'taksi'
          ? `Taksi Mobil (${km.toFixed(1)} km)`
          : `Kirim Paket (${km.toFixed(1)} km)`;
    return {
      subtotal: fare.subtotal,
      fee: fare.fee,
      title,
      itemsSummary: `${title} · Estimasi jarak ${km.toFixed(1)} km`,
    };
  }

  if (serviceType === 'makan') {
    const resto = RESTAURANTS.find((r) => r.id === body.restaurantId) || RESTAURANTS[0];
    const requested = Array.isArray(body.items) ? body.items : [];
    if (requested.length === 0) {
      throw new Error('Keranjang makanan tidak boleh kosong.');
    }
    let subtotal = 0;
    const summaryParts: string[] = [];
    for (const item of requested) {
      const menuItem = resto.menu.find((m) => m.id === item.id);
      const qty = Math.max(1, Math.min(20, Math.round(Number(item.quantity || 1))));
      if (!menuItem) throw new Error(`Menu ${item.id} tidak ditemukan.`);
      subtotal += menuItem.price * qty;
      summaryParts.push(`${qty}x ${menuItem.name}`);
    }
    return {
      subtotal,
      fee: 5000,
      title: `Pesan Makan · ${resto.name}`,
      itemsSummary: summaryParts.join(', '),
    };
  }

  // belanja
  const requested = Array.isArray(body.items) ? body.items : [];
  if (requested.length === 0) {
    throw new Error('Keranjang belanja tidak boleh kosong.');
  }
  let subtotal = 0;
  const summaryParts: string[] = [];
  for (const item of requested) {
    const product = SHOP_PRODUCTS.find((p) => p.id === item.id);
    const qty = Math.max(1, Math.min(20, Math.round(Number(item.quantity || 1))));
    if (!product) throw new Error(`Produk ${item.id} tidak ditemukan.`);
    subtotal += product.price * qty;
    summaryParts.push(`${qty}x ${product.name}`);
  }
  return {
    subtotal,
    fee: 6000,
    title: 'Belanja Harian · Lintasku Mart',
    itemsSummary: summaryParts.join(', '),
  };
}

async function createGatewayCharge(params: {
  orderId: string;
  amount: number;
  method: 'qris' | 'ewallet';
  provider: string;
  customerEmail?: string;
}): Promise<{
  qrString?: string;
  deeplinkUrl?: string;
  isSandbox: boolean;
}> {
  if (PAYMENT_GATEWAY === 'midtrans' && MIDTRANS_SERVER_KEY) {
    const baseUrl = MIDTRANS_IS_PRODUCTION
      ? 'https://api.midtrans.com/v2/charge'
      : 'https://api.sandbox.midtrans.com/v2/charge';
    const auth = Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString('base64');
    const paymentType =
      params.method === 'qris'
        ? 'qris'
        : params.provider.toLowerCase() === 'shopeepay'
          ? 'shopeepay'
          : 'gopay';
    const resp = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        payment_type: paymentType,
        transaction_details: {
          order_id: params.orderId,
          gross_amount: params.amount,
        },
        customer_details: {
          email: params.customerEmail || 'pelanggan@lintasku.id',
        },
      }),
    });
    if (resp.ok) {
      const json = (await resp.json()) as {
        qr_string?: string;
        actions?: Array<{ name: string; url: string }>;
      };
      const deeplink = json.actions?.find((a) => a.name.includes('deeplink'))?.url;
      return {
        qrString: json.qr_string,
        deeplinkUrl: deeplink,
        isSandbox: !MIDTRANS_IS_PRODUCTION,
      };
    }
  }

  if (PAYMENT_GATEWAY === 'xendit' && XENDIT_SECRET_KEY) {
    const auth = Buffer.from(`${XENDIT_SECRET_KEY}:`).toString('base64');
    if (params.method === 'qris') {
      const resp = await fetch('https://api.xendit.co/qr_codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
          'api-version': '2022-07-31',
        },
        body: JSON.stringify({
          reference_id: params.orderId,
          type: 'DYNAMIC',
          currency: 'IDR',
          amount: params.amount,
        }),
      });
      if (resp.ok) {
        const json = (await resp.json()) as { qr_string?: string };
        return { qrString: json.qr_string, isSandbox: true };
      }
    }
  }

  // Never fabricate fake QR strings: fall back to real merchant static->dynamic conversion if gateway keys are unset
  if (params.method === 'qris') {
    const converted = toDynamic(QRIS_STATIC_PAYLOAD, params.amount, {
      expectedMerchantName: QRIS_MERCHANT_NAME,
      expectedNmid: QRIS_NMID,
    });
    return { qrString: converted.dynamicPayload, isSandbox: true };
  }
  return {
    deeplinkUrl: `https://sandbox.lintasku.id/ewallet/${encodeURIComponent(params.provider.toLowerCase())}?order=${encodeURIComponent(params.orderId)}&amount=${params.amount}`,
    isSandbox: true,
  };
}

function getActiveQrisPendingAllocations(now: number): {
  usedCodes: Set<number>;
  usedAmounts: Set<number>;
} {
  const usedCodes = new Set<number>();
  const usedAmounts = new Set<number>();
  for (const o of ordersStore.values()) {
    const isPending = o.status === 'pending_payment' || o.status === 'waiting_verification';
    const notExpired = !o.expiresAt || o.expiresAt >= now;
    if (o.paymentMethod === 'qris' && o.paymentStatus !== 'paid' && isPending && notExpired) {
      if (typeof o.qrisUniqueCode === 'number' && o.qrisUniqueCode > 0) {
        usedCodes.add(o.qrisUniqueCode);
      }
      usedAmounts.add(o.total);
    }
  }
  return { usedCodes, usedAmounts };
}

function matchAndMarkOrderPaidByAmount(
  amount: number,
  source: 'qris_mutation' | 'admin',
  reference?: string
):
  | { status: 'matched'; order: ServerOrder; idempotent?: boolean }
  | { status: 'not_found' }
  | { status: 'ambiguous'; count: number } {
  expireStaleOrders();
  const candidates = Array.from(ordersStore.values()).filter(
    (o) =>
      o.paymentMethod === 'qris' &&
      o.paymentStatus !== 'paid' &&
      (o.status === 'pending_payment' || o.status === 'waiting_verification') &&
      o.total === amount
  );

  if (candidates.length === 0) {
    const recentPaid = Array.from(ordersStore.values()).find(
      (o) => o.paymentMethod === 'qris' && o.paymentStatus === 'paid' && o.total === amount
    );
    if (recentPaid) {
      return { status: 'matched', order: recentPaid, idempotent: true };
    }
    return { status: 'not_found' };
  }

  if (candidates.length > 1) {
    return { status: 'ambiguous', count: candidates.length };
  }

  const order = candidates[0];
  const now = Date.now();
  order.paymentStatus = 'paid';
  order.paidAt = now;
  order.paidByMatch = source;
  if (reference) {
    order.proofNote = reference.slice(0, 200);
  }
  order.status =
    order.serviceType === 'ojek' || order.serviceType === 'taksi' ? 'finding_driver' : 'active';
  order.updatedAt = now;
  savePersistedOrders();
  return { status: 'matched', order };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'lintasku-api',
      qrisMode: QRIS_MODE,
      qrisUniqueCodeEnabled: QRIS_UNIQUE_CODE,
      gateway: PAYMENT_GATEWAY,
    });
  });

  const handlePublicConfig = (_req: express.Request, res: express.Response) => {
    res.json({
      qrisMode: QRIS_MODE,
      qrisUniqueCodeEnabled: QRIS_UNIQUE_CODE,
      paymentGateway: PAYMENT_GATEWAY,
      sandboxMode: !MIDTRANS_SERVER_KEY && !XENDIT_SECRET_KEY,
      qrisMerchantName: QRIS_MERCHANT_NAME,
      qrisMerchantCity: validatedStaticQris.merchantCity,
      qrisNmid: validatedStaticQris.nmid,
      qrisStaticValid: true,
    });
  };

  app.get('/api/config/public', handlePublicConfig);
  app.get('/api/public-config', handlePublicConfig);

  app.get('/api/catalog', (_req, res) => {
    res.json({
      restaurants: RESTAURANTS,
      shopProducts: SHOP_PRODUCTS,
      promoBanners: PROMO_BANNERS,
      vouchers: VOUCHERS,
      demoDrivers: DEMO_DRIVERS,
    });
  });

  app.post('/api/pricing/estimate', (req, res) => {
    try {
      const calculated = computeServerSubtotal(req.body);
      const totals = computeOrderTotals({
        serviceType: req.body.serviceType,
        subtotal: calculated.subtotal,
        fee: calculated.fee,
        voucherCode: req.body.voucherCode,
      });
      res.json({
        ...totals,
        title: calculated.title,
        itemsSummary: calculated.itemsSummary,
      });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal menghitung harga.' });
    }
  });

  app.get('/api/orders', authenticateUser, (req: AuthRequest, res) => {
    expireStaleOrders();
    const uid = req.authUser!.uid;
    const list = Array.from(ordersStore.values())
      .filter((o) => o.userId === uid)
      .sort((a, b) => b.createdAt - a.createdAt);
    res.json({ orders: list });
  });

  app.get('/api/orders/:id', authenticateUser, (req: AuthRequest, res) => {
    expireStaleOrders();
    const order = ordersStore.get(req.params.id);
    if (!order || order.userId !== req.authUser!.uid) {
      return res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
    }
    res.json({ order });
  });

  app.post('/api/orders', authenticateUser, async (req: AuthRequest, res) => {
    try {
      expireStaleOrders();
      const {
        serviceType,
        paymentMethod,
        paymentProvider = '',
        voucherCode,
        pickupAddress,
        dropoffAddress,
        phone,
        qrisModeOverride,
      } = req.body as {
        serviceType: ServerOrder['serviceType'];
        paymentMethod: 'qris' | 'ewallet' | 'cod';
        paymentProvider?: string;
        voucherCode?: string;
        pickupAddress?: string;
        dropoffAddress?: string;
        phone?: string;
        qrisModeOverride?: 'A' | 'B';
      };

      if (!['ojek', 'taksi', 'makan', 'kirim', 'belanja'].includes(serviceType)) {
        return res.status(400).json({ error: 'Jenis layanan tidak valid.' });
      }
      if (!['qris', 'ewallet', 'cod'].includes(paymentMethod)) {
        return res.status(400).json({ error: 'Metode pembayaran tidak valid.' });
      }

      if (paymentMethod === 'cod') {
        if (!dropoffAddress || dropoffAddress.trim().length < 5) {
          return res.status(400).json({ error: 'Pembayaran COD wajib menyertakan alamat tujuan lengkap.' });
        }
        if (!phone || phone.trim().length < 8) {
          return res.status(400).json({ error: 'Pembayaran COD wajib menyertakan nomor HP aktif.' });
        }
      }

      const calculated = computeServerSubtotal(req.body);
      const totals = computeOrderTotals({
        serviceType,
        subtotal: calculated.subtotal,
        fee: calculated.fee,
        voucherCode,
      });

      const now = Date.now();
      const orderId = `LKU-${now.toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      const effectiveQrisMode = qrisModeOverride === 'A' || qrisModeOverride === 'B' ? qrisModeOverride : QRIS_MODE;

      const order: ServerOrder = {
        orderId,
        userId: req.authUser!.uid,
        userEmail: req.authUser!.email,
        isDemoUser: req.authUser!.isDemo,
        serviceType,
        title: calculated.title,
        itemsSummary: calculated.itemsSummary,
        status: 'pending_payment',
        paymentMethod,
        paymentProvider:
          paymentMethod === 'cod'
            ? 'COD (Bayar di Tempat)'
            : paymentMethod === 'ewallet'
              ? paymentProvider || 'GoPay'
              : `QRIS Mode ${effectiveQrisMode}`,
        paymentStatus: 'unpaid',
        subtotal: totals.subtotal,
        discount: totals.discount,
        fee: totals.fee,
        total: totals.total,
        voucherCode: totals.appliedCode,
        pickupAddress: pickupAddress?.slice(0, 240),
        dropoffAddress: dropoffAddress?.slice(0, 240),
        phone: phone?.slice(0, 32),
        createdAt: now,
        updatedAt: now,
      };

      if (paymentMethod === 'cod') {
        order.status = 'pay_on_delivery';
        order.paymentStatus = 'unpaid';
      } else if (paymentMethod === 'ewallet') {
        const charge = await createGatewayCharge({
          orderId,
          amount: totals.total,
          method: 'ewallet',
          provider: paymentProvider || 'GoPay',
          customerEmail: req.authUser!.email,
        });
        order.status = 'pending_payment';
        order.paymentStatus = 'unpaid';
        order.deeplinkUrl = charge.deeplinkUrl;
        order.expiresAt = now + 15 * 60 * 1000;
      } else if (paymentMethod === 'qris') {
        const { usedCodes, usedAmounts } = getActiveQrisPendingAllocations(now);
        const alloc = allocateUniqueQrisAmount({
          baseTotal: totals.total,
          usedCodes,
          usedAmounts,
          enableUniqueCode: QRIS_UNIQUE_CODE,
        });
        order.baseTotal = alloc.baseTotal;
        order.qrisUniqueCode = alloc.uniqueCode;
        order.total = alloc.finalAmount;
        order.qrisMode = effectiveQrisMode;
        order.qrisNmid = validatedStaticQris.nmid;
        order.expiresAt = now + 15 * 60 * 1000;

        const hasLiveGatewayKey = Boolean(
          (PAYMENT_GATEWAY === 'midtrans' && MIDTRANS_SERVER_KEY) ||
            (PAYMENT_GATEWAY === 'xendit' && XENDIT_SECRET_KEY)
        );

        if (effectiveQrisMode === 'A' && hasLiveGatewayKey) {
          const charge = await createGatewayCharge({
            orderId,
            amount: order.total,
            method: 'qris',
            provider: 'QRIS',
            customerEmail: req.authUser!.email,
          });
          order.status = 'pending_payment';
          order.paymentStatus = 'unpaid';
          order.qrisPayload = charge.qrString;
          order.qrisMerchantName = QRIS_MERCHANT_NAME;
          order.qrisMerchantCity = validatedStaticQris.merchantCity;
        } else {
          const dynamic = toDynamic(QRIS_STATIC_PAYLOAD, order.total, {
            expectedMerchantName: QRIS_MERCHANT_NAME,
            expectedNmid: QRIS_NMID,
          });
          order.status = 'pending_payment';
          order.paymentStatus = 'unpaid';
          order.qrisPayload = dynamic.dynamicPayload;
          order.qrisMerchantName = QRIS_MERCHANT_NAME;
          order.qrisMerchantCity = dynamic.merchantCity;
        }
      }

      ordersStore.set(orderId, order);
      savePersistedOrders();
      res.status(201).json({ order });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal membuat pesanan.' });
    }
  });

  app.post('/api/orders/:id/proof', authenticateUser, (req: AuthRequest, res) => {
    const order = ordersStore.get(req.params.id);
    if (!order || order.userId !== req.authUser!.uid) {
      return res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
    }
    const proofNote = String(req.body.proofNote || '').trim().slice(0, 200);
    if (!proofNote) {
      return res.status(400).json({ error: 'Catatan atau referensi bukti transfer wajib diisi.' });
    }
    order.proofNote = proofNote;
    order.status = 'waiting_verification';
    order.paymentStatus = 'waiting_verification';
    order.updatedAt = Date.now();
    savePersistedOrders();
    res.json({ order });
  });

  app.patch('/api/orders/:id/status', authenticateUser, (req: AuthRequest, res) => {
    const order = ordersStore.get(req.params.id);
    if (!order || order.userId !== req.authUser!.uid) {
      return res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
    }
    const { status, driverName, rating, tipAmount } = req.body as Partial<ServerOrder>;
    if (order.status === 'completed' || order.status === 'cancelled') {
      return res.status(409).json({ error: 'Status pesanan sudah final dan terkunci.' });
    }
    if (status && ['finding_driver', 'active', 'arrived', 'completed', 'cancelled'].includes(status)) {
      order.status = status;
    }
    if (typeof driverName === 'string') order.driverName = driverName.slice(0, 80);
    if (typeof rating === 'number' && rating >= 1 && rating <= 5) order.rating = rating;
    if (typeof tipAmount === 'number' && tipAmount >= 0 && tipAmount <= 500000) order.tipAmount = tipAmount;
    order.updatedAt = Date.now();
    savePersistedOrders();
    res.json({ order });
  });

  // Midtrans signed webhook (idempotent)
  app.post('/api/webhooks/midtrans', (req, res) => {
    const { order_id, status_code, gross_amount, signature_key, transaction_status } = req.body as Record<string, string>;
    if (!order_id || !status_code || !gross_amount) {
      return res.status(400).json({ error: 'Payload webhook Midtrans tidak lengkap.' });
    }
    if (MIDTRANS_SERVER_KEY) {
      const expected = crypto
        .createHash('sha512')
        .update(`${order_id}${status_code}${gross_amount}${MIDTRANS_SERVER_KEY}`)
        .digest('hex');
      const sigBuf = Buffer.from(String(signature_key || ''));
      const expBuf = Buffer.from(expected);
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        return res.status(403).json({ error: 'Signature Midtrans tidak valid.' });
      }
    }
    const idempKey = `midtrans:${order_id}:${transaction_status}`;
    if (processedWebhooks.has(idempKey)) {
      return res.json({ ok: true, idempotent: true });
    }
    const order = ordersStore.get(order_id);
    if (!order) {
      return res.status(404).json({ error: 'Order tidak ditemukan.' });
    }
    if (['settlement', 'capture'].includes(transaction_status)) {
      order.paymentStatus = 'paid';
      order.status = order.serviceType === 'ojek' || order.serviceType === 'taksi' ? 'finding_driver' : 'active';
      order.updatedAt = Date.now();
      processedWebhooks.add(idempKey);
      savePersistedOrders();
    } else if (['expire', 'cancel', 'deny'].includes(transaction_status)) {
      order.paymentStatus = 'expired';
      order.status = 'cancelled';
      order.updatedAt = Date.now();
      processedWebhooks.add(idempKey);
      savePersistedOrders();
    }
    res.json({ ok: true, order });
  });

  // Xendit callback webhook (idempotent)
  app.post('/api/webhooks/xendit', (req, res) => {
    if (XENDIT_CALLBACK_TOKEN) {
      const token = String(req.headers['x-callback-token'] || '');
      const a = Buffer.from(token);
      const b = Buffer.from(XENDIT_CALLBACK_TOKEN);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.status(403).json({ error: 'Callback token Xendit tidak valid.' });
      }
    }
    const { external_id, reference_id, status } = req.body as Record<string, string>;
    const orderId = external_id || reference_id;
    const idempKey = `xendit:${orderId}:${status}`;
    if (processedWebhooks.has(idempKey)) {
      return res.json({ ok: true, idempotent: true });
    }
    const order = orderId ? ordersStore.get(orderId) : undefined;
    if (!order) return res.status(404).json({ error: 'Order tidak ditemukan.' });
    if (status === 'PAID' || status === 'SUCCEEDED' || status === 'COMPLETED') {
      order.paymentStatus = 'paid';
      order.status = order.serviceType === 'ojek' || order.serviceType === 'taksi' ? 'finding_driver' : 'active';
      order.updatedAt = Date.now();
      processedWebhooks.add(idempKey);
      savePersistedOrders();
    }
    res.json({ ok: true, order });
  });

  // Sandbox confirmation helper (simulates payment gateway webhook ONLY in sandbox mode)
  app.post('/api/sandbox/confirm-payment', authenticateUser, (req: AuthRequest, res) => {
    if (MIDTRANS_IS_PRODUCTION) {
      return res.status(403).json({ error: 'Simulasi sandbox dinonaktifkan pada mode produksi.' });
    }
    const { orderId } = req.body as { orderId?: string };
    const order = orderId ? ordersStore.get(orderId) : undefined;
    if (!order || order.userId !== req.authUser!.uid) {
      return res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
    }
    if (order.paymentMethod === 'qris' && order.qrisMode === 'B') {
      return res.status(400).json({ error: 'QRIS Mode B diverifikasi secara manual oleh admin di /admin.' });
    }
    order.paymentStatus = 'paid';
    order.status = order.serviceType === 'ojek' || order.serviceType === 'taksi' ? 'finding_driver' : 'active';
    order.updatedAt = Date.now();
    savePersistedOrders();
    res.json({ ok: true, order });
  });

  // Admin verification routes (Mode B QRIS & COD confirmation)
  app.get('/api/admin/orders', async (req: AuthRequest, res, next) => {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ') && firebaseProjectId) {
      try {
        const decoded = await getAuth().verifyIdToken(authHeader.slice(7).trim());
        req.authUser = { uid: decoded.uid, email: decoded.email, emailVerified: decoded.email_verified, isDemo: false };
      } catch {
        // handled by authenticateAdmin
      }
    }
    next();
  }, authenticateAdmin, (_req, res) => {
    expireStaleOrders();
    const list = Array.from(ordersStore.values()).sort((a, b) => b.createdAt - a.createdAt);
    res.json({ orders: list });
  });

  app.post('/api/admin/orders/:id/verify', async (req: AuthRequest, res, next) => {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ') && firebaseProjectId) {
      try {
        const decoded = await getAuth().verifyIdToken(authHeader.slice(7).trim());
        req.authUser = { uid: decoded.uid, email: decoded.email, emailVerified: decoded.email_verified, isDemo: false };
      } catch {
        // handled by authenticateAdmin
      }
    }
    next();
  }, authenticateAdmin, (req, res) => {
    const order = ordersStore.get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
    const { action } = req.body as { action: 'approve' | 'reject' };
    if (action === 'approve') {
      order.paymentStatus = 'paid';
      order.paidAt = Date.now();
      order.paidByMatch = 'admin';
      order.status = order.serviceType === 'ojek' || order.serviceType === 'taksi' ? 'finding_driver' : 'active';
    } else {
      order.paymentStatus = 'expired';
      order.status = 'cancelled';
    }
    order.updatedAt = Date.now();
    savePersistedOrders();
    res.json({ order });
  });

  // Merchant QRIS exact-amount mutation webhook (for notification forwarders / GoPay Merchant automation)
  app.post('/api/webhooks/qris-mutation', (req, res) => {
    const secret = String(req.headers['x-webhook-secret'] || req.headers['x-admin-secret'] || '');
    const a = Buffer.from(secret);
    const b = Buffer.from(ADMIN_SECRET);
    if (!secret || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(403).json({ error: 'Secret webhook mutasi QRIS tidak valid.' });
    }
    const { amount, text, reference } = req.body as {
      amount?: unknown;
      text?: string;
      reference?: string;
    };
    const parsedAmount = parseMutationAmount({ amount, text });
    if (!parsedAmount) {
      return res.status(400).json({ error: 'Nominal mutasi Rupiah tidak valid atau tidak terbaca.' });
    }
    const result = matchAndMarkOrderPaidByAmount(parsedAmount, 'qris_mutation', reference || text);
    if (result.status === 'not_found') {
      return res.status(404).json({ error: `Tidak ada tagihan QRIS aktif dengan nominal Rp ${parsedAmount}.` });
    }
    if (result.status === 'ambiguous') {
      return res.status(409).json({
        error: `Ditemukan ${result.count} tagihan aktif bernominal sama. Verifikasi manual di /admin.`,
      });
    }
    return res.json({ ok: true, matched: true, idempotent: Boolean(result.idempotent), order: result.order });
  });

  // Admin quick auto-match endpoint from /admin console
  app.post('/api/admin/qris-match', async (req: AuthRequest, res, next) => {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ') && firebaseProjectId) {
      try {
        const decoded = await getAuth().verifyIdToken(authHeader.slice(7).trim());
        req.authUser = { uid: decoded.uid, email: decoded.email, emailVerified: decoded.email_verified, isDemo: false };
      } catch {
        // handled by authenticateAdmin
      }
    }
    next();
  }, authenticateAdmin, (req, res) => {
    const { amount, text, reference } = req.body as {
      amount?: unknown;
      text?: string;
      reference?: string;
    };
    const parsedAmount = parseMutationAmount({ amount, text });
    if (!parsedAmount) {
      return res.status(400).json({ error: 'Masukkan nominal mutasi atau tempel teks notifikasi GoPay Merchant.' });
    }
    const result = matchAndMarkOrderPaidByAmount(parsedAmount, 'admin', reference || text);
    if (result.status === 'not_found') {
      return res.status(404).json({ error: `Tidak ada pesanan QRIS tertunda dengan nominal Rp ${parsedAmount}.` });
    }
    if (result.status === 'ambiguous') {
      return res.status(409).json({
        error: `Ada ${result.count} pesanan aktif dengan nominal Rp ${parsedAmount}. Pilih langsung pada daftar di bawah.`,
      });
    }
    return res.json({ ok: true, matched: true, idempotent: Boolean(result.idempotent), order: result.order });
  });

  // Shake-to-Report bug report endpoints
  app.get('/api/bug-reports', authenticateUser, (req: AuthRequest, res) => {
    const uid = req.authUser!.uid;
    const reports = bugReportsStore.filter((r) => r.userId === uid);
    res.json({ reports });
  });

  app.post('/api/bug-reports', authenticateUser, (req: AuthRequest, res) => {
    const { category, title, description, currentScreen, deviceInfo, triggerSource } = req.body as {
      category?: ServerBugReport['category'];
      title?: string;
      description?: string;
      currentScreen?: string;
      deviceInfo?: string;
      triggerSource?: ServerBugReport['triggerSource'];
    };

    const allowedCategories: ServerBugReport['category'][] = ['bug', 'payment', 'map', 'performance', 'other'];
    const safeCategory = category && allowedCategories.includes(category) ? category : 'bug';
    const safeTitle = String(title || '').trim().slice(0, 120);
    const safeDescription = String(description || '').trim().slice(0, 1000);
    if (safeTitle.length < 3 || safeDescription.length < 5) {
      return res.status(400).json({ error: 'Judul minimal 3 karakter dan deskripsi minimal 5 karakter.' });
    }

    const now = Date.now();
    const report: ServerBugReport = {
      reportId: `RPT-${now.toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
      userId: req.authUser!.uid,
      category: safeCategory,
      title: safeTitle,
      description: safeDescription,
      currentScreen: typeof currentScreen === 'string' ? currentScreen.slice(0, 80) : 'Home',
      deviceInfo: typeof deviceInfo === 'string' ? deviceInfo.slice(0, 240) : '',
      triggerSource: triggerSource === 'shake' ? 'shake' : 'manual',
      status: 'open',
      createdAt: now,
      updatedAt: now,
    };

    bugReportsStore.unshift(report);
    savePersistedBugReports();
    res.status(201).json({ report });
  });

  // Mount Vite in dev, or serve static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lintasku server running on http://0.0.0.0:${PORT} (QRIS Mode ${QRIS_MODE}, Gateway ${PAYMENT_GATEWAY})`);
  });
}

startServer();

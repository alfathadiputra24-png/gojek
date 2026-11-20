import { auth } from './firebase';

export interface UserSession {
  uid: string;
  displayName: string;
  email: string;
  phone: string;
  isDemo: boolean;
  emailVerified: boolean;
}

export interface SavedAddress {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  isDefault: boolean;
}

export interface OrderRecord {
  orderId: string;
  userId: string;
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

export interface PublicConfig {
  qrisMode: 'A' | 'B';
  qrisUniqueCodeEnabled: boolean;
  paymentGateway: 'midtrans' | 'xendit';
  sandboxMode: boolean;
  qrisMerchantName: string;
  qrisMerchantCity: string;
  qrisNmid: string;
  qrisStaticValid: boolean;
}

export interface ChatThread {
  conversationId: string;
  participantName: string;
  participantRole: 'driver' | 'merchant' | 'support';
  lastMessage: string;
  unreadCount: number;
  updatedAt: number;
}

export interface ChatMessageItem {
  id: string;
  conversationId: string;
  senderRole: 'user' | 'partner';
  senderName: string;
  text: string;
  createdAt: number;
}

export interface BugReportRecord {
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

async function getAuthHeaders(session: UserSession | null): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  } else if (session?.isDemo) {
    headers['X-Demo-User'] = session.uid;
  }
  return headers;
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    session?: UserSession | null;
    adminSecret?: string;
  } = {}
): Promise<T> {
  const headers = await getAuthHeaders(options.session || null);
  if (options.adminSecret) {
    headers['x-admin-secret'] = options.adminSecret;
  }

  const resp = await fetch(path, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error((data as { error?: string }).error || `Permintaan gagal (${resp.status})`);
  }
  return data as T;
}

export type ServiceKind = 'ojek' | 'taksi' | 'makan' | 'kirim' | 'belanja';

export interface VoucherRule {
  code: string;
  title: string;
  description: string;
  services: ServiceKind[];
  type: 'percent' | 'flat';
  value: number;
  maxDiscount: number;
  minSubtotal: number;
}

export const VOUCHERS: VoucherRule[] = [
  {
    code: 'HEMAT25',
    title: 'Diskon 25% Kuliner & Belanja',
    description: 'Potongan 25% maks Rp 15.000 min. belanja Rp 25.000',
    services: ['makan', 'belanja'],
    type: 'percent',
    value: 25,
    maxDiscount: 15000,
    minSubtotal: 25000,
  },
  {
    code: 'JALAN7K',
    title: 'Hemat Perjalanan Rp 7.000',
    description: 'Potongan langsung Rp 7.000 untuk Ojek & Taksi',
    services: ['ojek', 'taksi'],
    type: 'flat',
    value: 7000,
    maxDiscount: 7000,
    minSubtotal: 12000,
  },
  {
    code: 'KIRIM8K',
    title: 'Ongkir Kirim Hemat Rp 8.000',
    description: 'Potongan Rp 8.000 untuk Kirim Barang & Antar Cepat',
    services: ['kirim'],
    type: 'flat',
    value: 8000,
    maxDiscount: 8000,
    minSubtotal: 15000,
  },
  {
    code: 'MAKAN50',
    title: 'Diskon 50% Menu Pilihan',
    description: 'Potongan 50% maks Rp 20.000 untuk pesanan Pesan Makan',
    services: ['makan'],
    type: 'percent',
    value: 50,
    maxDiscount: 20000,
    minSubtotal: 30000,
  },
];

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(0.5, Number((R * c).toFixed(2)));
}

export function calculateRideFare(
  vehicleType: 'ojek' | 'taksi' | 'kirim',
  distanceKm: number,
  packageSize: 'small' | 'medium' | 'large' = 'small'
): { subtotal: number; fee: number } {
  const safeKm = Math.max(0.5, Math.min(200, distanceKm));
  if (vehicleType === 'ojek') {
    const base = 7000;
    const perKm = 3000;
    const subtotal = Math.round((base + Math.max(0, safeKm - 1) * perKm) / 500) * 500;
    return { subtotal, fee: 2000 };
  }
  if (vehicleType === 'taksi') {
    const base = 12000;
    const perKm = 5500;
    const subtotal = Math.round((base + Math.max(0, safeKm - 1) * perKm) / 500) * 500;
    return { subtotal, fee: 3000 };
  }
  const sizeMultiplier = packageSize === 'large' ? 1.6 : packageSize === 'medium' ? 1.25 : 1;
  const raw = (9000 + Math.max(0, safeKm - 1) * 3500) * sizeMultiplier;
  const subtotal = Math.round(raw / 500) * 500;
  return { subtotal, fee: 2000 };
}

export function applyVoucher(
  serviceType: ServiceKind,
  subtotal: number,
  voucherCode?: string
): { discount: number; appliedCode: string; error?: string } {
  const normalized = (voucherCode || '').trim().toUpperCase();
  if (!normalized) {
    return { discount: 0, appliedCode: '' };
  }
  const voucher = VOUCHERS.find((v) => v.code === normalized);
  if (!voucher) {
    return { discount: 0, appliedCode: '', error: 'Kode voucher tidak ditemukan.' };
  }
  if (!voucher.services.includes(serviceType)) {
    return {
      discount: 0,
      appliedCode: '',
      error: `Voucher ${voucher.code} tidak berlaku untuk layanan ini.`,
    };
  }
  if (subtotal < voucher.minSubtotal) {
    return {
      discount: 0,
      appliedCode: '',
      error: `Minimal transaksi Rp ${voucher.minSubtotal.toLocaleString('id-ID')} untuk voucher ini.`,
    };
  }

  const rawDiscount =
    voucher.type === 'percent'
      ? Math.round((subtotal * voucher.value) / 100)
      : voucher.value;
  const discount = Math.min(subtotal, voucher.maxDiscount, rawDiscount);
  return { discount, appliedCode: voucher.code };
}

export function computeOrderTotals(params: {
  serviceType: ServiceKind;
  subtotal: number;
  fee: number;
  voucherCode?: string;
}): {
  subtotal: number;
  discount: number;
  fee: number;
  total: number;
  appliedCode: string;
  voucherError?: string;
} {
  const cleanSubtotal = Math.max(0, Math.round(params.subtotal));
  const cleanFee = Math.max(0, Math.round(params.fee));
  const { discount, appliedCode, error } = applyVoucher(
    params.serviceType,
    cleanSubtotal,
    params.voucherCode
  );
  const total = Math.max(1000, cleanSubtotal - discount + cleanFee);
  return {
    subtotal: cleanSubtotal,
    discount,
    fee: cleanFee,
    total,
    appliedCode,
    voucherError: error,
  };
}

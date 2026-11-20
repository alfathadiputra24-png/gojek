export const BRAND_NAME = 'Lintasku';
export const WALLET_NAME = 'Dompetku';
export const MASCOT_NAME = 'Kuku';

export const MODEL_PATHS = {
  motorbike: '/models/motorbike.glb',
  car: '/models/car.glb',
} as const;

export const GENERATED_ASSETS = {
  mascot: '/src/assets/images/mascot_owl_1795161643544.jpg',
  promoRide: '/src/assets/images/promo_banner_ride_clean_1795161798837.jpg',
  promoFood: '/src/assets/images/promo_banner_food_clean_1795161798972.jpg',
  bakmi: '/src/assets/images/resto_bakmi_pedas_1795161643438.jpg',
  kebab: '/src/assets/images/resto_kebab_rempah_1795161644638.jpg',
  kopi: '/src/assets/images/resto_kopi_senja_1795161643259.jpg',
} as const;

export function formatRupiah(amount: number): string {
  const rounded = Math.max(0, Math.round(amount));
  return 'Rp ' + rounded.toLocaleString('id-ID');
}

export function formatCompactRupiah(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded >= 1000) {
    return `${Math.round(rounded / 1000)}rb`;
  }
  return `${rounded}`;
}

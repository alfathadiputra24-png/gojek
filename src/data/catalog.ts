import { GENERATED_ASSETS } from '../config/brand';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  popular?: boolean;
}

export interface Restaurant {
  id: string;
  name: string;
  area: string;
  category: 'Pedas' | 'Kebab & Grill' | 'Kopi & Roti';
  rating: number;
  etaMinutes: string;
  distanceKm: number;
  promoLabel: string;
  image: string;
  menu: MenuItem[];
}

export interface ShopProduct {
  id: string;
  name: string;
  unit: string;
  category: 'Sembako' | 'Minuman' | 'Camilan' | 'Kesehatan';
  price: number;
  storeName: string;
}

export interface PromoBanner {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  targetService: 'ojek' | 'taksi' | 'makan' | 'kirim' | 'belanja';
  voucherCode: string;
  image: string;
  accent: string;
}

export interface JakartaLandmark {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
}

export const JAKARTA_LANDMARKS: JakartaLandmark[] = [
  {
    id: 'monas',
    label: 'Stasiun Gambir / Monas',
    address: 'Jl. Medan Merdeka Timur No. 1, Jakarta Pusat',
    lat: -6.1766,
    lng: 106.8306,
  },
  {
    id: 'bundaran-hi',
    label: 'Bundaran HI',
    address: 'Jl. M.H. Thamrin, Menteng, Jakarta Pusat',
    lat: -6.195,
    lng: 106.823,
  },
  {
    id: 'senopati',
    label: 'Distrik Senopati',
    address: 'Jl. Senopati No. 48, Kebayoran Baru, Jakarta Selatan',
    lat: -6.2297,
    lng: 106.8091,
  },
  {
    id: 'kemang',
    label: 'Kemang Raya',
    address: 'Jl. Kemang Raya No. 12, Mampang, Jakarta Selatan',
    lat: -6.2607,
    lng: 106.8135,
  },
  {
    id: 'kota-tua',
    label: 'Taman Fatahillah',
    address: 'Jl. Taman Fatahillah No. 1, Jakarta Barat',
    lat: -6.1352,
    lng: 106.8133,
  },
];

export const RESTAURANTS: Restaurant[] = [
  {
    id: 'bakmi-nusantara',
    name: 'Bakmi Pedas Nusantara',
    area: 'Menteng',
    category: 'Pedas',
    rating: 4.9,
    etaMinutes: '18–25 mnt',
    distanceKm: 1.8,
    promoLabel: 'Diskon 25%, maks 15rb',
    image: GENERATED_ASSETS.bakmi,
    menu: [
      {
        id: 'bakmi-lv3',
        name: 'Bakmi Chili Oil Pangsit Goreng',
        description: 'Mie kenyal racikan bawang goreng, minyak cabai aromatik, dan 4 pangsit renyah.',
        price: 28000,
        popular: true,
      },
      {
        id: 'bakmi-manis',
        name: 'Bakmi Ayam Jamur Kecap',
        description: 'Topping ayam cincang jamur shiitake gurih dengan kaldu terpisah.',
        price: 25000,
      },
      {
        id: 'udang-keju',
        name: 'Udang Rambutan Keju (4 pcs)',
        description: 'Bola udang krispi isi keju lumer dan saus sambal manis.',
        price: 18000,
      },
    ],
  },
  {
    id: 'kebab-rempah',
    name: 'Kebab Rempah Premium',
    area: 'Senopati',
    category: 'Kebab & Grill',
    rating: 4.8,
    etaMinutes: '20–30 mnt',
    distanceKm: 2.4,
    promoLabel: 'Diskon 50%, maks 20rb',
    image: GENERATED_ASSETS.kebab,
    menu: [
      {
        id: 'kebab-sapi',
        name: 'Kebab Daging Panggang Komplit',
        description: 'Tortilla panggang isi daging sapi asap, selada segar, saus yoghurt bawang putih.',
        price: 34000,
        popular: true,
      },
      {
        id: 'kebab-wedges',
        name: 'Paket Kebab + Kentang Rempah',
        description: '1 Kebab reguler lengkap dengan kentang panggang bumbu paprika.',
        price: 44000,
      },
      {
        id: 'salad-bowl',
        name: 'Bowl Daging Panggang Herb',
        description: 'Nasi basmati rempah dengan irisan daging panggang dan saus tzatziki.',
        price: 39000,
      },
    ],
  },
  {
    id: 'kopi-senja',
    name: 'Kopi Senja & Roti Pandan',
    area: 'Kemang',
    category: 'Kopi & Roti',
    rating: 4.9,
    etaMinutes: '15–22 mnt',
    distanceKm: 1.4,
    promoLabel: 'Hemat 25% Paket Pagi',
    image: GENERATED_ASSETS.kopi,
    menu: [
      {
        id: 'es-aren',
        name: 'Es Kopi Susu Gula Aren',
        description: 'Espresso house blend Arabika dengan susu segar dan gula aren organik.',
        price: 24000,
        popular: true,
      },
      {
        id: 'croissant-pandan',
        name: 'Croissant Lapis Pandan',
        description: 'Pastry renyah mentega Prancis dengan isian kaya pandan hangat.',
        price: 26000,
      },
      {
        id: 'matcha-oat',
        name: 'Iced Uji Matcha Oat',
        description: 'Matcha Jepang pekat dikocok dingin dengan susu oat lembut.',
        price: 32000,
      },
    ],
  },
];

export const SHOP_PRODUCTS: ShopProduct[] = [
  {
    id: 'beras-pandan',
    name: 'Beras Pandan Wangi Premium',
    unit: '5 kg',
    category: 'Sembako',
    price: 78000,
    storeName: 'Lintasku Mart Segar',
  },
  {
    id: 'minyak-kelapa',
    name: 'Minyak Goreng Kelapa Murni',
    unit: '2 liter',
    category: 'Sembako',
    price: 38000,
    storeName: 'Lintasku Mart Segar',
  },
  {
    id: 'air-mineral',
    name: 'Air Mineral Pegunungan (1 Dus)',
    unit: '24 x 600 ml',
    category: 'Minuman',
    price: 45000,
    storeName: 'Lintasku Mart Segar',
  },
  {
    id: 'granola-madu',
    name: 'Granola Panggang Madu Hutan',
    unit: '300 gr',
    category: 'Camilan',
    price: 42000,
    storeName: 'Lintasku Mart Segar',
  },
  {
    id: 'vitamin-c',
    name: 'Suplemen Vitamin C + Zinc',
    unit: '30 tablet',
    category: 'Kesehatan',
    price: 52000,
    storeName: 'Apotek Mitra Lintasku',
  },
];

export const PROMO_BANNERS: PromoBanner[] = [
  {
    id: 'promo-jalan',
    title: 'Jalan Terus, Hemat Terus',
    subtitle: 'Pakai voucher JALAN7K untuk Ojek Motor & Taksi Mobil seharian.',
    cta: 'Pesan Sekarang',
    targetService: 'ojek',
    voucherCode: 'JALAN7K',
    image: GENERATED_ASSETS.promoRide,
    accent: '#0FA958',
  },
  {
    id: 'promo-makan',
    title: 'Traktiran Makan Siang 50%',
    subtitle: 'Gunakan kode MAKAN50 buat menu favorit pilihanmu.',
    cta: 'Jelajahi Menu',
    targetService: 'makan',
    voucherCode: 'MAKAN50',
    image: GENERATED_ASSETS.promoFood,
    accent: '#D97706',
  },
];

export const DEMO_DRIVERS = [
  { name: 'Raka Pratama', plate: 'B 4821 LKU', vehicle: 'Honda Vario 160 · Hitam', rating: 4.95 },
  { name: 'Bagus Santoso', plate: 'B 1930 KUT', vehicle: 'Toyota Avanza · Putih', rating: 4.92 },
  { name: 'Dina Maharani', plate: 'B 3309 LNT', vehicle: 'Yamaha NMAX · Hijau Emerald', rating: 4.98 },
];

# Lintasku — Super-App On-Demand (PWA)

**Lintasku** adalah aplikasi web super-app mobile-first & installable PWA dengan layanan transportasi (Ojek Motor & Taksi Mobil + penampil armada 3D), pesan makanan, kirim barang, belanja harian, dompet demo **Dompetku**, chat real-time, serta pembayaran **QRIS (Mode A & Mode B)**, **E-Wallet**, dan **COD**.

> **Branding Terpusat:** Seluruh nama merek, nama dompet, dan nama maskot didefinisikan dalam satu konstanta di `src/config/brand.ts` (`BRAND_NAME = 'Lintasku'`, `WALLET_NAME = 'Dompetku'`, `MASCOT_NAME = 'Kuku'`) sehingga mudah diganti kapan saja.

---

## Arsitektur & Teknologi

- **Frontend:** Vite, React, TypeScript, Tailwind CSS v4, GSAP, Three.js (`GLTFLoader` + fallback prosedural), Leaflet + OpenStreetMap + OSRM routing, `qrcode`, `canvas-confetti`, `jspdf`, `vite-plugin-pwa`.
- **Backend:** Node.js + Express (`server.ts`) untuk perhitungan harga/voucher otoritatif di sisi server, verifikasi Firebase ID Token (`firebase-admin`), integrasi payment gateway (Midtrans / Xendit), pembuatan payload QRIS dinamis + CRC16-CCITT-FALSE, webhook terverifikasi signature & idempoten, serta panel `/admin`.
- **Database & Auth:** Firebase Authentication + Cloud Firestore (`firestore.rules`).

---

## Checklist Konfigurasi Firebase Authentication (Google, Apple, Email)

1. Buka [Firebase Console](https://console.firebase.google.com/) dan pilih proyek aplikasi Anda.
2. Masuk ke menu **Authentication -> Sign-in method**:
   - **Email/Password**: Aktifkan *Email/Password* (verifikasi email dikirim otomatis saat pendaftaran).
   - **Google**: Aktifkan *Google*, isi *Project support email*, lalu simpan.
   - **Apple** *(opsional, wajib jika ingin login dengan Apple aktif di produksi)*:
     1. Buat **App ID** dan **Services ID** di Apple Developer Portal (centang *Sign in with Apple*).
     2. Buat **Private Key (`.p8`)** di Apple Developer Portal dan catat **Key ID** serta **Apple Team ID**.
     3. Di Firebase Console -> *Apple* provider, masukkan **Services ID**, **Apple Team ID**, **Key ID**, dan isi kunci `.p8`.
     4. Tambahkan Return URL HTTPS Firebase ke konfigurasi Apple Services ID:
        `https://<project-id>.firebaseapp.com/__/auth/handler`
3. Masuk ke **Authentication -> Settings -> Authorized domains** dan pastikan domain production/preview Anda terdaftar.
4. Catatan pengujian lokal: *Sign in with Apple* hanya bekerja penuh di domain HTTPS yang terdaftar pada Apple Developer Portal; untuk pengujian cepat tanpa domain HTTPS, gunakan **Google**, **Email/Password**, atau **Mode Demo**.

---

## Mode Driver Demo vs Aplikasi Driver Produksi

- Layanan Ojek Motor dan Taksi Mobil pada web app ini menggunakan **Simulasi Driver (Demo Mode)** yang ditandai secara eksplisit pada antarmuka pengguna (`Demo Mode`).
- Untuk operasi pengemudi nyata di produksi, dibutuhkan **aplikasi pendamping driver terpisah** (mobile app driver dengan GPS background stream) dan **backend dispatch real-time** (matching driver terdekat, manajemen status armada, dan notifikasi push).

---

## Konfigurasi Pembayaran & QRIS (Mode A vs Mode B)

Salin `.env.example` menjadi `.env` dan isi variabel sesuai kebutuhan:

| Variabel | Keterangan |
| --- | --- |
| `QRIS_MODE` | `A` = QRIS dinamis otomatis via Midtrans/Xendit + webhook. `B` = Konversi QRIS statis milik merchant (`QRIS_STATIC_PAYLOAD`) menjadi dinamis per transaksi + upload bukti transfer + verifikasi manual di `/admin`. |
| `PAYMENT_GATEWAY` | `midtrans` atau `xendit` |
| `MIDTRANS_SERVER_KEY` | Server Key Midtrans Sandbox/Production |
| `MIDTRANS_IS_PRODUCTION` | `false` untuk Sandbox, `true` untuk Production |
| `XENDIT_SECRET_KEY` | Secret API Key Xendit |
| `XENDIT_CALLBACK_TOKEN` | Token verifikasi webhook `x-callback-token` Xendit |
| `QRIS_STATIC_PAYLOAD` | String QRIS statis asli milik toko/merchant Anda untuk Mode B (default contoh ber-CRC valid tersedia untuk demo) |
| `ADMIN_SECRET` | Kunci rahasia untuk membuka halaman verifikasi manual `/admin` |
| `ADMIN_EMAILS` | Daftar email Firebase terverifikasi yang otomatis diizinkan membuka `/admin` |

### Model 3D Kustom (.glb)
Letakkan file `.glb` pada:
- `public/models/motorbike.glb`
- `public/models/car.glb`

Jika file `.glb` tidak tersedia, aplikasi otomatis merender model kendaraan 3D prosedural dengan pencahayaan studio (`RoomEnvironment`), rotasi drag dengan inersia, zoom, reset double-tap, dan pilihan warna cat.

---

## Menjalankan Aplikasi & Pengujian

```bash
# Install dependensi
npm install

# Jalankan unit test (QRIS CRC16, kalkulasi tarif/voucher, validasi Firestore rules)
npx --yes tsx --test src/lib/qris.test.ts src/lib/pricing.test.ts firestore.rules.test.ts

# Jalankan dev server (Express + Vite pada port 3000)
npm run dev

# Build produksi
npm run build
npm start
```

### Pengujian Sandbox Webhook / Mode B
- Di tab **Bayar**, pilih pesanan QRIS Mode B -> kirim catatan bukti transfer -> buka **`/admin`** (kunci default sandbox ada di `.env.example`) -> klik **Konfirmasi Lunas**.
- Untuk QRIS Mode A / E-Wallet di Sandbox, gunakan tombol **Simulasi Webhook Lunas (Sandbox)** pada tab **Bayar** atau kirim POST ke `/api/webhooks/midtrans` / `/api/webhooks/xendit` dengan signature valid.

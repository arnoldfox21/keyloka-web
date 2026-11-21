# Keyloka Web

Frontend web application untuk platform pencarian, survei, dan booking hunian **Keyloka** (`KOST`, `APARTEMEN`, `KONTRAKAN`, dan `HUNIAN_HARIAN`), dibangun dengan **Next.js 16 (App Router)**, **React 19**, dan **Tailwind CSS v4**, serta mendukung deployment ke **Cloudflare Workers** via OpenNext.

## Teknologi Utama
- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 + Lucide Icons
- **Real-time Chat:** `socket.io-client`
- **Peta Interaktif:** Leaflet (`leaflet`)
- **Deployment:** `@opennextjs/cloudflare` & `wrangler`
- **E2E Testing:** Playwright (`@playwright/test`)

## Fitur Utama
- **Eksplorasi & Pencarian Properti:** Filter kategori (`Kost`, `Apartemen`, `Kontrakan`, `Hunian Harian`), harga, fasilitas, tampilan peta interaktif, perbandingan properti, dan halaman SEO `/sewa/[slug]`.
- **Tanyakan Ketersediaan & Booking Escrow:** Pengajuan jadwal survei dan booking langsung dengan pembayaran Midtrans Escrow serta sistem poin loyalti (`/kost/[id]`, `/bookings`).
- **Chat Real-Time & Grup Penghuni Kost (`/chat`):**
  - Chat pribadi 1-on-1 dengan pemilik/penyewa.
  - Pemilik dapat **Setujui**, **Tolak**, atau **Batalkan** pengajuan langsung dari kartu pesan pengajuan di dalam chat.
  - **Grup Penghuni Kost** khusus untuk properti kategori `KOST`.
- **Dashboard Pemilik & Staff (`/dashboard`):** Kelola iklan properti, persetujuan pengajuan booking, boost iklan, laporan, verifikasi pemilik, dan pengajuan tarik saldo.
- **API Proxy & Auth (`/api/proxy/[...path]`, `/api/auth/*`):** BFF layer menuju `keyloka-api` dengan cookie session JWT.

## Menjalankan Secara Lokal
```bash
npm install
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser.

## Script Tersedia
- `npm run dev` — Menjalankan development server
- `npm run build` — Build aplikasi Next.js untuk production
- `npm run start` — Menjalankan production server
- `npm run lint` — Menjalankan ESLint
- `npm run cf:build` / `npm run cf:preview` / `npm run cf:deploy` — Build, preview, dan deploy ke Cloudflare Workers
- `npm run test:e2e` — Menjalankan Playwright end-to-end tests

## Deploy DEV (Cloudflare Workers Builds)

Branch `dev` → Worker `keyloka-web-dev` → https://dev.keyloka.com (API: https://api-dev.keyloka.com/api).

Setup di dashboard Cloudflare (Workers & Pages → Create → Import repository `keyloka-web`):
1. Project/Worker name: `keyloka-web-dev` (harus sama dengan `env.dev.name` di `wrangler.jsonc`).
2. Production branch: `dev`.
3. Build command: `npx opennextjs-cloudflare build`
4. Deploy command: `npx opennextjs-cloudflare deploy -- --env dev`
5. Build variables:
   - `NEXT_PUBLIC_SITE_URL=https://dev.keyloka.com`
   - `NEXT_PUBLIC_API_URL=https://api-dev.keyloka.com/api`
   - `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION=false`
   - `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=<sandbox key>`
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID=<client id>`
   - `NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<recaptcha site key>`
6. Domain `dev.keyloka.com` dibuat otomatis dari `routes` (custom_domain) di `wrangler.jsonc`.

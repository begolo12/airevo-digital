# 05 — Routing, Deployment, dan Domain

## 1. Tujuan

- `https://airevo-digital.my.id` menjadi satu pintu masuk.
- `/aplikasi` menjadi hub yang mendaftar semua aplikasi.
- Aplikasi lama tetap di deployment masing-masing; dibuka lewat tautan.
- Aplikasi baru (Keluarga) hidup di `/keluarga` pada aplikasi ini.
- Deploy dari GitHub ke Vercel otomatis, dengan preview per PR.
- Domain, SSL, dan redirect `www` berfungsi tanpa perawatan manual.
- Ada jalur rollback jika deploy bermasalah.

## 2. Routing yang direkomendasikan

**Satu Next.js app, satu project Vercel, satu hub.**

```text
/                        → marketing home
/aplikasi                → hub semua aplikasi
/aplikasi/keluarga       → halaman marketing Keluarga
/aplikasi/ops            → halaman marketing Ops (app lama)
/aplikasi/keuangan       → halaman marketing Keuangan (app lama)
/keluarga                → app Keluarga (login)
/keluarga/keuangan       → modul keuangan
```

Aplikasi lama **tidak** berada di path `/ops` atau `/keuangan` pada fase ini. Tombol di hub mengarah ke URL deployment masing-masing.

### Kenapa begitu

- Aplikasi lama sudah berjalan; memindahkannya berisiko tanpa manfaat langsung.
- Satu hub + satu aplikasi baru memberi hampir semua nilai dengan usaha jauh lebih kecil.
- Kalau nanti ingin benar-benar satu domain, Microfrontends bisa ditambahkan tanpa membongkar hub.

### Keuntungan

- Tidak ada konfigurasi routing khusus di Vercel untuk fase awal.
- Session login konsisten di seluruh halaman aplikasi ini.
- Shared navbar/sidebar/design system.
- Satu `next build`, satu preview URL.
- Tidak ada masalah asset prefix atau `basePath`.

### Konsekuensi

- Pengguna berpindah domain saat membuka aplikasi lama.
- Login aplikasi lama belum tentu sama dengan hub.
- Mitigasi: tampilkan domain tujuan dengan jelas; pertimbangkan SSO/microfrontends nanti.

### Yang harus disiapkan di registry

Setiap aplikasi butuh:

```ts
{
  id: "ops",
  name: "Ops",
  href: "https://ops-xxxx.vercel.app",
  external: true,
  requiresAuth: true,
  status: "live",
}
```

Jika `external: true`, tautan membuka tab baru dengan `rel="noopener noreferrer"` dan diberi indikator bahwa pengguna meninggalkan situs.

## 3. Jika nanti aplikasi lama ingin benar-benar satu domain

Ada empat opsi. Untuk fase awal, semuanya **belum dipakai**.

### Opsi B — Vercel Microfrontends

Vercel mendukung penggabungan beberapa project ke satu domain dengan path routing. Ini bukan rewrite biasa; routing dilakukan di jaringan Vercel berdasarkan `microfrontends.json`.

**Prasyarat:**

- Minimal dua project Vercel.
- Satu project menjadi **default app** (biasanya website utama).
- Semua project berada dalam satu Microfrontends group.
- Setiap app Next.js memasang `@vercel/microfrontends` dan membungkus config dengan `withMicrofrontends`.

**Contoh `microfrontends.json` di default app:**

```json
{
  "$schema": "https://openapi.vercel.sh/microfrontends.json",
  "applications": {
    "airevo-web": {},
    "airevo-ops": {
      "routing": [
        { "paths": ["/ops/:path*"] }
      ]
    },
    "airevo-keuangan": {
      "routing": [
        { "paths": ["/keuangan/:path*"] }
      ]
    }
  }
}
```

> Catatan: aplikasi Keluarga **tidak** perlu didaftarkan di sini selama masih berada di project `airevo-web`. Ia sudah menempati `/keluarga` sebagai route biasa.

**`next.config.ts` di setiap app:**

```ts
import type { NextConfig } from "next";
import { withMicrofrontends } from "@vercel/microfrontends/next/config";

const nextConfig: NextConfig = {};

export default withMicrofrontends(nextConfig);
```

**Langkah:**

1. Buat group di Vercel Dashboard → Settings → Microfrontends, atau `vercel microfrontends create-group`.
2. Hubungkan repo dan tentukan root directory tiap app.
3. Tambah `microfrontends.json` di default app.
4. Deploy semua app.
5. Assign domain ke group/default app.
6. Uji path, asset, login, dan preview.

**Caveat yang harus diuji:**

- `basePath` tidak didukung oleh `withMicrofrontends` saat ini.
- Asset prefix otomatis; file di `public/` perlu penanganan khusus.
- Local development memakai proxy microfrontends.
- Session/auth lintas app harus memakai cookie domain induk dan konfigurasi yang sama.
- Perubahan routing dan app tidak selalu deploy bersamaan.
- Status fitur dapat berubah; cek dokumentasi Vercel sebelum memutuskan.

**Jangan pakai microfrontends untuk MVP ini.** Gunakan hanya jika ada pemicu nyata.

### Opsi B2 — Next.js Multi Zones

Beberapa aplikasi Next.js terpisah, disatukan dengan `rewrites` di app utama dan `basePath` di app anak.

```ts
// app utama: next.config.ts
const nextConfig = {
  async rewrites() {
    return [
      { source: "/ops/:path*", destination: "https://airevo-ops.vercel.app/ops/:path*" },
      { source: "/keuangan/:path*", destination: "https://airevo-keuangan.vercel.app/keuangan/:path*" },
    ];
  },
};
```

```ts
// app anak: next.config.ts
const nextConfig = { basePath: "/ops" };
```

Cocok jika semua app memakai Next.js dan ingin tetap terpisah. Kekurangan:

- `basePath` mengubah semua link/asset; harus konsisten.
- Auth/session lintas deployment perlu diuji.
- Navigasi antar zone biasanya full page load.
- Lebih rawan salah konfigurasi dibanding satu app.

Untuk aplikasi Keluarga yang baru, **tidak perlu** Multi Zones — ia sudah jadi route biasa.

### Opsi C — Proxy project

Satu project hanya berisi `vercel.json` dengan rewrite:

```json
{
  "rewrites": [
    { "source": "/ops/:match*", "destination": "https://airevo-ops.vercel.app/:match*" },
    { "source": "/keuangan/:match*", "destination": "https://airevo-keuangan.vercel.app/:match*" },
    { "source": "/:match*", "destination": "https://airevo-web.vercel.app/:match*" }
  ]
}
```

Cocok untuk aplikasi lama, tetapi:

- Perlu `basePath` di app Next.js.
- Cookie/auth lintas deployment lebih rawan.
- Ada dua hop request.
- Asset dan redirect bisa rumit.
- Tidak direkomendasikan untuk proyek baru.

### Opsi D — Subdomain

`ops.airevo-digital.my.id` dan `keuangan.airevo-digital.my.id` masing-masing ke project Vercel. Ini pilihan paling bersih jika app benar-benar independen, tetapi tidak memenuhi keinginan path `/ops` dan `/keuangan`.

## 4. Rekomendasi final

| Kebutuhan | Pilihan |
| --- | --- |
| **Sekarang: hub + aplikasi Keluarga** | **Satu Next.js app + hub (Opsi A)** |
| Aplikasi lama | **Hub + tautan** |
| Nanti: app lama ingin satu domain | Microfrontends |
| Semua app Next.js, tetap terpisah | Multi Zones |
| App lama yang tidak bisa dipindah | Proxy project |
| App benar-benar terpisah, path tidak penting | Subdomain |

## 5. Setup domain di Vercel

### 5.1 Pilih host kanonik

Rekomendasi: **apex** `https://airevo-digital.my.id` sebagai kanonik, dan `www` redirect ke apex.

Alasan:

- Lebih pendek dan mudah diingat.
- Cocok untuk brand.
- `www` tetap didukung dan di-redirect.

Alternatif: `www` kanonik, apex redirect ke `www`. Pilih satu dan konsisten.

### 5.2 Metode DNS

#### Metode A — Vercel Nameservers (paling mudah)

1. Buka Vercel → Project → **Settings → Domains**.
2. Tambahkan `airevo-digital.my.id` dan `www.airevo-digital.my.id`.
3. Vercel menampilkan nameserver, biasanya:
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`
4. Di registrar, ganti nameserver domain ke nilai tersebut.
5. Tunggu propagasi (bisa beberapa menit–48 jam).
6. Vercel mengurus A/CNAME, SSL, dan renew.

**Penting sebelum pindah nameserver:**

- Salin semua record yang masih dipakai: MX (email), SPF, DKIM, DMARC, TXT verifikasi, CNAME lain.
- Jika email bisnis aktif, jangan pindah nameserver tanpa menyalin record email.
- Turunkan TTL record utama menjadi 300 detik sehari sebelumnya.

#### Metode B — DNS di registrar/Cloudflare

1. Di Vercel, tambahkan domain; Vercel menampilkan nilai record.
2. Di DNS provider:
   - Apex: `A @ → 76.76.21.21` (atau nilai yang ditampilkan Vercel).
   - `www`: `CNAME www → cname.vercel-dns-0.com` (atau nilai project).
3. Jika memakai Cloudflare:
   - Gunakan mode **DNS only** (awan abu-abu) untuk record Vercel, kecuali kamu paham konfigurasi proxy.
   - Jangan aktifkan "Always Use HTTPS" yang bertabrakan dengan redirect Vercel tanpa diuji.
4. Tunggu verifikasi; SSL diterbitkan otomatis.

> Selalu gunakan nilai yang ditampilkan dashboard Vercel untuk project kamu, bukan nilai contoh di dokumen ini.

### 5.3 Redirect www

Di Vercel → Settings → Domains:

- Jadikan `airevo-digital.my.id` sebagai **primary**.
- Tambahkan `www.airevo-digital.my.id` dan set redirect ke primary (308).
- Atau sebaliknya, jika memilih `www` sebagai kanonik.

Uji:

```bash
curl -I https://www.airevo-digital.my.id
# Expect: 308/301 ke https://airevo-digital.my.id
```

### 5.4 SSL

- Vercel menerbitkan sertifikat otomatis setelah DNS valid.
- Pastikan tidak ada record A/AAAA/CNAME konflik untuk hostname yang sama.
- Uji HTTPS, redirect HTTP → HTTPS, dan HSTS setelah stabil.
- Jangan aktifkan HSTS sebelum yakin semua subdomain siap HTTPS.

### 5.5 Email

Jika memakai Resend atau Google Workspace:

- Tambahkan SPF, DKIM, dan DMARC di DNS.
- Jangan hapus MX saat pindah nameserver.
- Uji kirim ke Gmail/Outlook sebelum mengumumkan domain.
- Pisahkan subdomain email (`mail.`) jika perlu.

## 6. Setup project Vercel

### 6.1 Import repo

1. Push repo ke GitHub.
2. Vercel → Add New → Project → Import Git Repository.
3. Framework preset: **Next.js**.
4. Root directory: `.` (root repo).
5. Build command: `pnpm build`.
6. Install command: `pnpm install --frozen-lockfile`.
7. Output: default `.next`.
8. Node.js version: 24.x (sesuai `.nvmrc`).

### 6.2 Environment variables

Set di Vercel untuk **Production**, **Preview**, dan **Development**:

- `DATABASE_URL`
- `DATABASE_URL_UNPOOLED`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_SITE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `RESEND_API_KEY`
- `CONTACT_EMAIL_TO`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`

**Jangan** memakai database production untuk preview. Buat branch Neon `preview` dan set `DATABASE_URL` preview ke branch itu.

### 6.3 Domain

- Assign `airevo-digital.my.id` ke project production.
- Assign `www` dan redirect.
- Pastikan `BETTER_AUTH_URL` dan `NEXT_PUBLIC_SITE_URL` memakai `https://airevo-digital.my.id`.
- Tambahkan callback URL OAuth:
  - `https://airevo-digital.my.id/api/auth/callback/google`
  - `http://localhost:3000/api/auth/callback/google`

## 7. CI/CD

### GitHub Actions — `ci.yml`

Trigger: pull request dan push ke `main`.

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 12
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test:unit
      - run: pnpm build
```

### E2E

- Jalankan Playwright pada PR tertentu atau setelah deploy preview.
- Gunakan database test terpisah.
- Simpan trace/screenshot saat gagal.

### Branch protection

- Require PR review (atau self-review checklist).
- Require status checks: lint, typecheck, unit, build.
- Require branch up to date.
- Squash merge; conventional commit message.

### Deploy flow

```text
Feature branch → PR → CI + Vercel Preview → review → merge main
→ Vercel Production deploy → smoke test → monitor
```

- Production auto-deploy dari `main`.
- Preview deployment untuk setiap PR.
- Gunakan Vercel Deployment Protection untuk preview agar tidak publik.

## 8. Database dan migrasi

- `main` branch Neon = production.
- `preview` branch Neon = preview.
- `dev` branch Neon = local (opsional; bisa pakai Docker Postgres).
- Migrasi dibuat dengan `drizzle-kit generate`, dijalankan dengan `drizzle-kit migrate`.
- **Jangan** `db push` ke production.
- Migrasi harus backward-compatible:
  1. Tambah kolom nullable.
  2. Deploy kode yang mengisi kolom.
  3. Baru jadikan wajib.
- Backup sebelum migrasi besar.
- Uji restore minimal sekali sebelum launch.

## 9. Rollback

### Rollback aplikasi

- Vercel → Deployments → pilih deployment stabil → **Promote to Production** / **Instant Rollback**.
- Rollback tidak otomatis me-rollback migrasi database. Pastikan migrasi kompatibel.

### Rollback database

- Neon → Branches → Restore/PITR sesuai plan.
- Atau restore dari `pg_dump` harian.
- Dokumentasikan waktu restore dan data yang hilang.

## 10. Monitoring

- Vercel Analytics: page view, referrer, device.
- Speed Insights: LCP, INP, CLS.
- Sentry: error, release, performance.
- Uptime: Vercel checks atau Better Stack free.
- Database: Neon dashboard (connections, storage, slow query).
- Log: Vercel Functions logs; jangan log data sensitif.

## 11. Checklist domain & deploy

- [ ] Domain aktif di registrar.
- [ ] Nameserver/DNS mengarah ke Vercel.
- [ ] Apex dan `www` terverifikasi.
- [ ] Redirect `www` → apex (atau sebaliknya) 308.
- [ ] SSL valid dan auto-renew.
- [ ] HTTP → HTTPS redirect.
- [ ] `NEXT_PUBLIC_SITE_URL` benar.
- [ ] `BETTER_AUTH_URL` benar.
- [ ] OAuth callback production terdaftar.
- [ ] Email DNS (SPF/DKIM/DMARC) valid.
- [ ] Preview deployment terlindungi.
- [ ] Database preview terpisah dari production.
- [ ] Backup dan restore diuji.
- [ ] Rollback deployment diuji.
- [ ] `robots.txt` dan `sitemap.xml` benar.
- [ ] `/keluarga` `noindex`.
- [ ] Semua tautan aplikasi lama di hub bisa dibuka.
- [ ] Sentry menerima test error.
- [ ] Analytics menerima page view.

## 12. Referensi

- Vercel Microfrontends: <https://vercel.com/docs/microfrontends>
- Vercel Microfrontends routing: <https://vercel.com/docs/microfrontends/routing>
- Vercel: multiple projects under one domain: <https://vercel.com/kb/guide/how-can-i-serve-multiple-projects-under-a-single-domain>
- Vercel custom domain: <https://vercel.com/docs/domains/working-with-domains/add-a-domain>
- Next.js Proxy (pengganti Middleware di v16): <https://nextjs.org/docs/app/getting-started/proxy>

# 03 — Tech Stack

## 1. Prinsip pemilihan

1. **Sedikit moving parts.** Setiap layanan tambahan harus punya alasan yang jelas.
2. **Standar industri.** Mudah cari bantuan, mudah cari orang, mudah dirawat.
3. **Type-safe dari database sampai UI.** Kesalahan diketahui saat build, bukan saat produksi.
4. **Portable.** Jangan mengunci data ke API proprietary yang tidak punya jalur ekspor.
5. **Cukup untuk 1–3 pengguna, siap untuk 50.** Jangan membangun infrastruktur enterprise untuk aplikasi internal.

## 2. Stack final

| Kategori | Pilihan | Versi baseline | Peran |
| --- | --- | --- | --- |
| Runtime | Node.js | 24 LTS | Build dan server |
| Package manager | pnpm | 12.x | Dependency dan lockfile |
| Framework | Next.js | 16.4.x | Routing, RSC, server actions, API |
| UI runtime | React | 19.x | Komponen |
| Bahasa | TypeScript | 5.x, `strict: true` | Type safety |
| Styling | Tailwind CSS | 4.x | Utility-first CSS |
| Components | shadcn/ui + Radix | latest | Aksesibel, bisa dikustom |
| Metode desain | **Oil UI** (skill, bukan paket) | latest | Eksplorasi arah, perbandingan, penyempurnaan berbasis screenshot |
| Ikon | lucide-react | latest | Ikon konsisten |
| Animasi | motion | latest | Micro-interaction |
| Auth | Better Auth | latest | Session, OAuth, passkey |
| Database | Neon PostgreSQL | 17.x | Data |
| ORM | Drizzle ORM + drizzle-kit | latest | Query, schema, migration |
| Validasi | Zod | 4.x | Schema form/env/API |
| Form | React Hook Form | 7.x | State form |
| Tabel | TanStack Table | 8.x | Data table |
| Chart | Recharts | 3.x | Dashboard |
| Tanggal | date-fns | 4.x | Format dan kalkulasi tanggal |
| Uang | decimal.js | 10.x | Aritmetika uang tanpa floating point |
| Email | Resend + React Email | latest | Email transaksional |
| Rate limit | Upstash Redis + Ratelimit | latest | Proteksi endpoint |
| File | Vercel Blob | latest | Dokumen keluarga (fase C) |
| Error | Sentry | latest | Error monitoring |
| Analytics | Vercel Analytics + Speed Insights | latest | Traffic dan CWV |
| Unit test | Vitest + Testing Library | latest | Test cepat |
| E2E | Playwright + axe | latest | Alur nyata dan a11y |
| Lint/format | ESLint 9 flat + Prettier | latest | Konsistensi |
| Git hooks | Husky + lint-staged + commitlint | latest | Cegah commit bermasalah |
| Deploy | Vercel | — | Hosting, preview, domain, SSL |

> Versi di atas adalah baseline saat dokumen dibuat. Selalu kunci versi di `pnpm-lock.yaml` dan perbarui lewat PR, bukan `latest` di produksi.

## 3. Alasan per pilihan

### Next.js 16 App Router

- Satu framework untuk marketing site dan aplikasi.
- Server Components mengurangi JavaScript di client.
- Server Actions menghilangkan banyak API route untuk mutasi form.
- Route groups memungkinkan layout marketing, auth, dan app yang berbeda dalam satu aplikasi.
- Metadata API, `sitemap.ts`, `robots.ts`, dan OG image built-in.
- Deploy Vercel hampir zero-config.

**Catatan Next.js 16:** `middleware.ts` diganti menjadi `proxy.ts`. Gunakan `proxy.ts` hanya untuk redirect optimistis; otorisasi sebenarnya tetap di server component/action.

### TypeScript strict

- Schema database, form, dan response harus saling cocok.
- Refactor aman saat aplikasi bertambah.
- `noUncheckedIndexedAccess` dan `exactOptionalPropertyTypes` disarankan.

### Tailwind CSS v4 + shadcn/ui

- Tailwind v4 lebih cepat dan konfigurasi via CSS (`@theme`).
- shadcn/ui bukan library yang di-install sebagai dependency besar; komponen disalin ke repo sehingga bisa dikustom.
- Radix primitives memberi aksesibilitas dasar (dialog, dropdown, tabs, tooltip).
- Cocok untuk desain custom seperti Mekari, bukan template SaaS generik.

### Oil UI — metode desain, bukan dependency

**Yang perlu dipahami:** Oil UI bukan library komponen dan tidak masuk `package.json`. Ia adalah skill desain untuk AI agent.

Cara memasang (sekali):

```bash
npx skills add oil-oil/oil-ui
```

Jika memakai DeepSeek Harness, plugin native-nya:

```bash
dsh plugin --profile web add github:oil-oil/dsh-oil-ui
```

Alur yang dipakai:

1. **Pahami produk** — kategori, audiens, tone, pembanding.
2. **Tiga arah** — tulis 3 arah yang berbeda di tipografi, warna, dan komposisi.
3. **Pilih** — dari deskripsi, atau dari halaman perbandingan `style-explorer.html`.
4. **Implementasi** — tulis di Next.js + Tailwind, mengikuti arah terpilih.
5. **Bukti** — screenshot desktop dan mobile, perbaiki hierarki dan kontras.
6. **Review** — reviewer independen atau self-review.
7. **Kurangi** — hapus elemen yang tidak menambah pemahaman.

Yang dihasilkan Oil UI: keputusan visual, arah desain, halaman perbandingan, dan catatan perbaikan. **Kode tetap milik proyek.**

**Kapan dipakai:** saat membuat halaman baru, arah desain, atau perbaikan visual besar. **Tidak dipakai** untuk perubahan kecil yang sudah jelas (ganti teks, ubah angka, hapus elemen).

**Alternatif:** tanpa Oil UI, desain tetap bisa dikerjakan, tetapi keputusan visualnya akan lebih cepat jatuh ke pola generik.

Detail: [06-design-system.md](06-design-system.md).

### Better Auth

- Auth.js sekarang menjadi bagian dari Better Auth; untuk proyek baru, Better Auth adalah pilihan yang lebih aktif dikembangkan.
- Fitur bawaan: email/password, OAuth, session, rate limit, passkey, 2FA, organization.
- TypeScript-first dan punya adapter Drizzle.
- Menghindari menulis session/cookie/CSRF sendiri.

**Alternatif:** Clerk (paling cepat, berbayar), Supabase Auth (all-in-one), Auth.js (warisan, sekarang merger ke Better Auth).

### Neon + Drizzle

- Neon: Postgres serverless, branching untuk preview, free tier cukup untuk MVP.
- Drizzle: schema sebagai TypeScript, query eksplisit, migration SQL yang bisa dibaca.
- Tidak perlu Prisma engine tambahan di serverless.
- Data tetap Postgres standar; bisa pindah ke RDS/Supabase tanpa menulis ulang query.

**Alternatif:** Supabase (DB + auth + storage + RLS), Prisma (DX bagus, engine lebih berat), Turso/SQLite (murah, tapi kurang cocok untuk relasi kompleks dan serverless Vercel).

### Vercel

- Preview deployment per PR.
- Domain, SSL, dan redirect otomatis.
- Analytics dan Speed Insights terintegrasi.
- Rollback instan.
- Microfrontends tersedia jika nanti perlu memecah app.

**Catatan biaya:** Hobby untuk personal/non-komersial. Jika Airevo Digital adalah bisnis, gunakan Pro.

### Upstash Ratelimit

- Serverless tidak punya memori persisten; rate limit in-memory tidak akurat.
- Upstash Redis REST cocok untuk Vercel Functions.
- Lindungi login, register (jika ada), contact form, dan endpoint upload.

### Sentry

- Error di server dan client terlihat sebelum user melapor.
- Source map dan release tracking.
- Free tier cukup untuk MVP.

## 4. Alternatif yang dipertimbangkan

| Keputusan | Alternatif | Kenapa tidak dipilih sekarang |
| --- | --- | --- |
| Satu app | Microfrontends | Kompleksitas belum sepadan untuk 2 app |
| Next.js | Remix/React Router, SvelteKit, Astro | Next.js paling terintegrasi dengan Vercel dan punya ekosistem besar |
| Tailwind + shadcn | MUI, Chakra, Mantine | Desain custom lebih mudah; tidak terkunci ke tema library |
| Better Auth | Clerk | Biaya dan vendor lock-in; Better Auth cukup untuk kebutuhan |
| Neon + Drizzle | Supabase | Supabase bagus, tapi kita belum butuh storage/realtime/RLS |
| Postgres | MongoDB | Data keuangan dan relasi cocok dengan SQL |
| Resend | SendGrid/Postmark | DX modern, React Email, free tier cukup |
| Vercel Blob | S3/R2 | Fase C; kalau butuh private storage murah, pertimbangkan R2 |
| Oil UI | Tanpa skill desain | Tanpa Oil UI, keputusan visual lebih cepat jatuh ke pola generik |
| Vitest/Playwright | Jest/Cypress | Vitest lebih cepat; Playwright lebih stabil untuk E2E |

## 5. Dependency yang direncanakan

### Production

```text
next
react
react-dom
typescript
tailwindcss
@tailwindcss/postcss
shadcn (CLI, dev)
class-variance-authority
clsx
tailwind-merge
lucide-react
motion
next-themes
sonner
better-auth
drizzle-orm
postgres
zod
react-hook-form
@hookform/resolvers
@tanstack/react-table
recharts
date-fns
decimal.js
resend
@react-email/components
@upstash/ratelimit
@upstash/redis
@vercel/analytics
@vercel/speed-insights
@sentry/nextjs
@t3-oss/env-nextjs
server-only
next-mdx-remote
gray-matter
shiki
```

### Development

```text
eslint
eslint-config-next
prettier
prettier-plugin-tailwindcss
husky
lint-staged
@commitlint/cli
@commitlint/config-conventional
vitest
@vitejs/plugin-react
jsdom
@testing-library/react
@testing-library/jest-dom
@testing-library/user-event
@playwright/test
@axe-core/playwright
drizzle-kit
tsx
```

### Fase C

```text
@vercel/blob
@vercel/microfrontends   (hanya jika memecah app)
posthog-js               (jika butuh product analytics)
```

> Oil UI **tidak** ada di daftar ini karena ia bukan dependency. Ia dipasang sebagai skill:
> `npx skills add oil-oil/oil-ui`.

## 6. Environment variables

Jangan pernah commit nilai asli. Gunakan `.env.example` sebagai dokumentasi.

| Variable | Scope | Wajib | Catatan |
| --- | --- | --- | --- |
| `DATABASE_URL` | Server | Ya | Neon pooled connection |
| `DATABASE_URL_UNPOOLED` | Server | Ya | Untuk migration |
| `BETTER_AUTH_SECRET` | Server | Ya | ≥ 32 karakter acak |
| `BETTER_AUTH_URL` | Server | Ya | `http://localhost:3000` / domain produksi |
| `NEXT_PUBLIC_SITE_URL` | Public | Ya | URL kanonik |
| `GOOGLE_CLIENT_ID` | Server | Ya (jika Google) | OAuth |
| `GOOGLE_CLIENT_SECRET` | Server | Ya (jika Google) | OAuth |
| `RESEND_API_KEY` | Server | Ya | Email |
| `CONTACT_EMAIL_TO` | Server | Ya | Tujuan contact form |
| `UPSTASH_REDIS_REST_URL` | Server | Ya | Rate limit |
| `UPSTASH_REDIS_REST_TOKEN` | Server | Ya | Rate limit |
| `SENTRY_DSN` | Server/Public | Disarankan | Error monitoring |
| `SENTRY_AUTH_TOKEN` | Build | Disarankan | Upload source map |
| `BLOB_READ_WRITE_TOKEN` | Server | Fase C | Upload dokumen |

Validasi environment dengan Zod di `src/lib/env.ts`; aplikasi harus gagal saat build jika variable wajib tidak ada.

## 7. Version policy

- Gunakan versi minor terbaru yang stabil, bukan `latest` di `package.json`.
- Renovate/Dependabot untuk update mingguan.
- Update major (Next.js, React, Tailwind) lewat branch terpisah + preview + E2E.
- Jangan update semua dependency sekaligus.
- Commit `pnpm-lock.yaml` selalu.

## 8. Yang sengaja tidak dipakai

| Hal | Alasan |
| --- | --- |
| Redux/Zustand global store | Sebagian besar state ada di server/URL; tambah hanya jika perlu |
| GraphQL | Server actions + RSC cukup |
| CMS headless | Konten sedikit; MDX lebih sederhana |
| Microservices | Overkill untuk 1–3 pengguna |
| Docker di produksi | Vercel menangani runtime |
| Kubernetes | Tidak relevan |
| Library UI besar (MUI) | Desain custom lebih penting |
| Realtime | Belum ada kebutuhan kolaborasi |
| Multi-currency | MVP IDR; tambah nanti dengan desain yang benar |
| Oil UI sebagai paket npm | Ia skill desain, bukan library komponen |

## 9. Ringkasan keputusan

**Next.js 16 + TypeScript + Tailwind + shadcn + Better Auth + Neon + Drizzle + Vercel + Oil UI (metode desain).**

Itu cukup untuk membangun hub aplikasi dan aplikasi Keluarga yang serius, tanpa infrastruktur berlebihan.

# 11 — Runbook

Panduan operasional dari nol sampai produksi. Perintah menggunakan PowerShell di Windows dan bash di CI/Vercel.

## 1. Prasyarat

| Tool | Versi | Cek |
| --- | --- | --- |
| Node.js | 24 LTS | `node --version` |
| pnpm | 12.x | `pnpm --version` |
| Git | 2.40+ | `git --version` |
| Docker Desktop | opsional, untuk Postgres lokal | `docker --version` |
| Vercel CLI | latest | `vercel --version` |
| GitHub CLI | opsional | `gh --version` |

Akun yang dibutuhkan:

- GitHub
- Vercel
- Neon
- Resend
- Upstash
- Sentry
- Google Cloud Console (OAuth)
- Registrar domain

Skill desain (sekali per mesin):

```bash
npx skills add oil-oil/oil-ui
```

Atau, jika memakai DeepSeek Harness:

```bash
dsh plugin --profile web add github:oil-oil/dsh-oil-ui
```

Oil UI **bukan** dependency npm; tidak ada `pnpm add`. Ia dipakai untuk menentukan arah desain sebelum menulis halaman baru.

## 2. Setup pertama kali

```bash
git clone <repo-url>
cd SaaS-Irvan
pnpm install
cp .env.example .env.local
```

Isi `.env.local` (jangan commit):

```dotenv
DATABASE_URL=postgresql://...
DATABASE_URL_UNPOOLED=postgresql://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
RESEND_API_KEY=...
CONTACT_EMAIL_TO=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
SENTRY_DSN=...
```

Generate secret:

```bash
openssl rand -base64 32
```

Jika `openssl` tidak tersedia di Windows, gunakan:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

## 3. Database

### Opsi A — Neon (disarankan)

1. Buat project Neon.
2. Buat branch `main` (production) dan `preview`.
3. Copy pooled connection string ke `DATABASE_URL`.
4. Copy direct connection string ke `DATABASE_URL_UNPOOLED`.
5. Jalankan migrasi.

### Opsi B — Postgres lokal

```bash
docker run --name airevo-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=airevo \
  -p 5432:5432 \
  -d postgres:17
```

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/airevo
DATABASE_URL_UNPOOLED=postgresql://postgres:postgres@localhost:5432/airevo
```

## 4. Script yang direncanakan

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx src/lib/db/seed.ts",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

## 5. Menjalankan lokal

```bash
pnpm db:migrate
pnpm db:seed        # hanya development
pnpm dev
```

Buka `http://localhost:3000`.

Login pertama:

1. Buat user owner lewat seed atau halaman setup internal.
2. Matikan sign-up publik.
3. Pastikan household owner dan anggota `owner` dibuat.
4. Seed kategori default (pemasukan & pengeluaran).

## 6. Migrasi

### Membuat migrasi

```bash
pnpm db:generate
```

Review file SQL di `src/lib/db/migrations/`. Jangan langsung apply tanpa membaca.

### Menjalankan

```bash
pnpm db:migrate
```

### Aturan

- Jangan `db push` ke production.
- Migrasi harus backward-compatible.
- Backup sebelum migrasi besar.
- Uji di branch Neon preview.
- Jangan mengubah migrasi yang sudah di-apply; buat migrasi baru.

## 7. Seed

- Development: data demo lengkap (household, anggota, akun, kategori, transaksi, anggaran, tagihan, tujuan).
- Production: hanya household owner + kategori default.
- Jangan pernah menjalankan seed demo di production.
- Seed harus idempotent (bisa dijalankan ulang tanpa duplikat).

## 8. Test

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
```

E2E membutuhkan:

```bash
pnpm exec playwright install
```

Gunakan database test, bukan production.

## 9. Build

```bash
pnpm build
pnpm start
```

Jika build gagal karena env, cek `src/lib/env.ts`. Jangan menambahkan fallback yang menyembunyikan konfigurasi hilang.

## 10. Deploy ke Vercel

### Pertama kali

```bash
vercel link
vercel env pull .env.local
vercel --prod
```

Atau lewat dashboard:

1. Import repo GitHub.
2. Framework: Next.js.
3. Root: `.`.
4. Build: `pnpm build`.
5. Install: `pnpm install --frozen-lockfile`.
6. Tambah env vars.
7. Deploy.

### Selanjutnya

- Push ke branch → preview otomatis.
- Merge ke `main` → production otomatis.
- Pantau build log dan smoke test.

## 11. Domain

1. Vercel → Settings → Domains.
2. Tambah `airevo-digital.my.id` dan `www.airevo-digital.my.id`.
3. Pilih DNS method:
   - Vercel nameservers, atau
   - A/CNAME di registrar.
4. Set primary domain.
5. Redirect `www` ke apex.
6. Tunggu SSL.
7. Update `BETTER_AUTH_URL` dan `NEXT_PUBLIC_SITE_URL`.
8. Update OAuth callback.
9. Uji.

```bash
curl -I https://airevo-digital.my.id
curl -I https://www.airevo-digital.my.id
```

## 12. Smoke test setelah deploy

- [ ] Home load < 3 detik.
- [ ] Navbar dan footer benar.
- [ ] `/aplikasi` menampilkan semua aplikasi.
- [ ] Aplikasi lama bisa dibuka dari hub.
- [ ] Halaman `/aplikasi/keluarga` terbuka.
- [ ] Contact form mengirim email.
- [ ] Login berhasil.
- [ ] `/keluarga` terbuka setelah login.
- [ ] Buat akun + transaksi, cek saldo.
- [ ] Buat anggaran, cek progress.
- [ ] Tandai tagihan dibayar, cek transaksi otomatis.
- [ ] Logout.
- [ ] Akses `/keluarga` tanpa login → redirect.
- [ ] `robots.txt` dan `sitemap.xml`.
- [ ] OG image.
- [ ] Sentry menerima test error.
- [ ] Analytics menerima page view.

## 13. Rollback

### Aplikasi

1. Vercel → Deployments.
2. Pilih deployment stabil.
3. Promote to Production / Instant Rollback.
4. Smoke test.
5. Catat alasan di incident log.

### Database

1. Neon → Branches → Restore/PITR.
2. Atau restore `pg_dump`.
3. Verifikasi data.
4. Jalankan smoke test.
5. Catat data yang hilang.

**Ingat:** rollback aplikasi tidak me-rollback migrasi. Pastikan migrasi kompatibel.

## 14. Backup dan restore

### Backup manual

```bash
pg_dump "$DATABASE_URL_UNPOOLED" \
  --format=custom \
  --file="backup-$(date +%Y%m%d-%H%M).dump"
```

Windows PowerShell:

```powershell
$ts = Get-Date -Format "yyyyMMdd-HHmm"
pg_dump $env:DATABASE_URL_UNPOOLED --format=custom --file="backup-$ts.dump"
```

### Restore

```bash
pg_restore --clean --if-exists --no-owner \
  --dbname="$DATABASE_URL_UNPOOLED" backup-YYYYMMDD-HHMM.dump
```

- Uji restore di database terpisah sebelum production.
- Simpan backup di storage privat, bukan repo.
- Retensi minimal 30 hari.

## 15. Troubleshooting

| Gejala | Kemungkinan | Solusi |
| --- | --- | --- |
| Build gagal: env missing | Env Vercel belum diisi | Cek `src/lib/env.ts`, tambah env |
| 500 setelah deploy | Migrasi belum jalan | Jalankan `db:migrate` |
| Login redirect loop | `BETTER_AUTH_URL` salah / cookie | Samakan URL, cek HTTPS, clear cookie |
| OAuth error | Callback URL tidak terdaftar | Tambah callback di Google Console |
| Domain invalid | DNS konflik | Cek A/CNAME, hapus record duplikat |
| Email tidak terkirim | SPF/DKIM/API key | Cek Resend dashboard + DNS |
| Gambar tidak muncul | Path/asset prefix | Cek `public/`, `next/image`, domain |
| 404 di path app | Route/file salah | Cek struktur `app/(apps)` |
| Data tidak muncul | Filter household / visibilitas | Cek `household_id` dan `visibility` di query |
| Anak melihat data dewasa | Filter visibilitas tidak diterapkan | Cek `visibilityFilter` di query |
| Saldo salah | Transfer/void | Cek query saldo, test unit |
| Rate limit false positive | Limit terlalu ketat | Sesuaikan Upstash |
| Sentry tidak menerima | DSN/build | Cek env + source map |

## 16. Maintenance

### Mingguan

- Cek Sentry errors.
- Cek uptime.
- Review analytics.
- Merge dependency updates (minor/patch).
- Cek backup berjalan.

### Bulanan

- Uji restore backup.
- Review akses Vercel/Neon/GitHub.
- Audit dependency.
- Update konten/case study.
- Cek biaya.

### Setiap major update

- Branch terpisah.
- Preview + E2E.
- Review changelog.
- Deploy bertahap.
- Siapkan rollback.

## 17. Incident checklist

1. Tentukan severity (P0–P3).
2. Amankan akses (rotate secret jika perlu).
3. Cek Vercel status, Sentry, Neon.
4. Rollback jika perubahan terakhir penyebabnya.
5. Komunikasikan status.
6. Perbaiki akar masalah.
7. Tulis post-mortem singkat.
8. Update checklist/runbook.

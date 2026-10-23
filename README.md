# Airevo Digital

Website portofolio, hub aplikasi, dan aplikasi Keluarga — semua di satu domain.

- **Domain utama:** `https://airevo-digital.my.id`
- **Status:** Bisa dijalankan di local, di-build, dan di-deploy. Data bertahan di berkas lokal.
- **Pemilik:** Irvan / Airevo Digital

## Jalankan

```bash
pnpm install
pnpm dev
```

Buka `http://localhost:3000`.

Masuk ke aplikasi Keluarga di `/login` (hanya di mode pengembangan):

| Peran | Email | Kata sandi | PIN profil |
| --- | --- | --- | --- |
| Pemilik | `irvan@airevo-digital.my.id` | `airevo123` | `1234` |
| Pasangan | `sari@airevo-digital.my.id` | `airevo123` | `1234` |

Masuk sebagai pasangan untuk melihat bagaimana data `private` milik pemilik disembunyikan.

Di produksi kata sandi akun bawaan **tidak** memakai nilai contoh di atas:
isi `AIREVO_OWNER_PASSWORD`. Bila kosong, server membuat kata sandi acak dan
mencetaknya sekali di log — kredensial contoh tidak pernah ditampilkan di UI
produksi.

Tidak perlu `.env.local` untuk mencoba. Salin `.env.example` bila ingin mengisi
`SESSION_SECRET`, `RESEND_API_KEY`, atau `DATABASE_URL`.

Penjualan otomatis hanya menyala setelah rekening tujuan diisi:

```bash
PAYMENT_BANK_NAME=BCA
PAYMENT_BANK_ACCOUNT=<nomor rekening>
PAYMENT_BANK_HOLDER=<nama pemilik rekening>
```

Tanpa ketiganya, halaman `/beli/[slug]` menutup checkout dan mengarahkan pembeli
ke kontak. Tidak ada rekening contoh sebagai cadangan.

```bash
pnpm lint        # ESLint
pnpm typecheck   # TypeScript
pnpm test        # 36 unit test (Vitest)
pnpm build       # production build
pnpm start       # jalankan hasil build
```

## Apa yang ada di sini

Aplikasi Ops dan Keuangan **sudah ada**, tetapi saat ini **disembunyikan** dari
katalog (`visible: false`) karena belum siap dijual. Yang aktif:

1. **Landing umum** — studio, produk, model harga, jasa.
2. **Katalog + penjualan** — harga per produk, checkout, lisensi, admin pesanan.
3. **Keluarga** — produk pertama: uang, rencana, waktu, catatan, belanja, laporan.

### Model bisnis

**Sekali beli, akses seumur hidup, tanpa langganan.**

| Produk | Harga | Status |
| --- | --- | --- |
| Keluarga | Rp49.000 | Dijual |
| Ops, Keuangan | — | Disembunyikan sampai siap |

Pembayaran sekarang **transfer bank manual**: pembeli checkout, dapat kode
pesanan, transfer, lalu pemilik menandai lunas di `/admin/pesanan` dan lisensi
terbit otomatis. Kerangka Xendit/Midtrans sudah ada di `src/lib/payments/`,
tinggal diisi.

Rincian: [docs/19-model-bisnis.md](docs/19-model-bisnis.md).

| Path | Isi |
| --- | --- |
| `/` | Landing umum |
| `/aplikasi` | Katalog berharga |
| `/aplikasi/[slug]` | Detail produk + kartu harga |
| `/beli/[slug]` | Checkout |
| `/pesanan/[code]` | Status pesanan + instruksi + kunci lisensi |
| `/admin/pesanan` | Verifikasi pembayaran, lisensi, pendapatan |
| `/work` | Case study |
| `/about`, `/contact` | Tentang dan kontak (form aktif) |
| `/legal/privacy`, `/legal/terms` | Legal |
| `/login` | Masuk |
| `/keluarga` | Aplikasi Keluarga (18 halaman, dijaga gate lisensi) |
| `/api/health` | Health check |

## Aplikasi Keluarga

Enam pilar, semuanya sudah punya halaman:

| Pilar | Isi |
| --- | --- |
| Uang | Akun, transaksi, kategori, anggaran, tagihan, **utang & piutang**, **aset & asuransi** |
| Rencana | Tujuan keuangan, kontribusi, proyeksi bulanan |
| Waktu | Kalender keluarga, ulang tahun otomatis |
| Rumah | Tugas rumah dengan poin per anggota |
| Belanja | Daftar belanja, estimasi vs aktual |
| Catatan | **Dokumen**, **kesehatan**, **pendidikan** |
| Laporan | Tren 12 bulan, kepatuhan anggaran, kekayaan bersih |

Aturan yang berjalan:

- Saldo otomatis dari saldo awal + pemasukan − pengeluaran + transfer.
- Transfer bukan pemasukan/pengeluaran.
- Transaksi dibatalkan tidak dihapus, hanya tidak dihitung.
- Tagihan: bayar → transaksi otomatis, tanggal 31 aman di bulan pendek, tidak bisa dobel.
- Kekayaan bersih = kas + aset + piutang − utang.
- Visibilitas data: `private` (pemilik), `household` (dewasa), `shared` (semua).

**Batasan:** data disimpan di `.data/store.json` — bertahan setelah restart, tetapi
belum multi-device. Untuk data keuangan asli, aktifkan Postgres lebih dulu
(lihat di bawah).

**Akses:** aplikasi dijaga gate lisensi. Tanpa lisensi aktif untuk email yang
sedang masuk, isi aplikasi tidak dirender — yang tampil halaman penjelasan berisi
harga dan tautan membeli.

## Stack

- Next.js 16.4 (App Router) + React 19 + TypeScript strict
- Tailwind CSS v4 dengan token di `src/app/globals.css`
- **Oil UI** sebagai metode desain (skill, bukan dependency npm)
- Zod untuk validasi server, Server Actions untuk mutasi
- Pembayaran: kontrak provider (`manual` aktif; `xendit`/`midtrans` kerangka)
- Auth: scrypt + cookie HMAC bertanda tangan
- Drizzle ORM + Postgres (schema 22 tabel siap)
- Vercel Analytics + Speed Insights
- Vitest untuk unit test

Detail: [docs/03-tech-stack.md](docs/03-tech-stack.md).

## Database (opsional)

Aplikasi berjalan tanpa database. Untuk memakai Postgres:

```bash
# isi DATABASE_URL dan DATABASE_URL_UNPOOLED di .env.local
pnpm db:migrate   # jalankan migrasi
pnpm db:seed      # salin data contoh ke Postgres
pnpm db:studio    # buka Drizzle Studio
```

Schema lengkap ada di [src/lib/db/schema.ts](src/lib/db/schema.ts), migrasi di
[drizzle/](drizzle). Saat ini halaman masih membaca store lokal; memindahkan query
ke Drizzle adalah langkah berikutnya (lihat [docs/18-implementation-status.md](docs/18-implementation-status.md)).

## Dokumentasi

Mulai dari [PLAN.md](PLAN.md), lalu [docs/README.md](docs/README.md).

Dokumen utama:

- [PLAN.md](PLAN.md) — rencana induk
- [docs/02-information-architecture.md](docs/02-information-architecture.md) — sitemap dan hub
- [docs/04-architecture.md](docs/04-architecture.md) — arsitektur dan batas modul
- [docs/05-routing-deployment-domain.md](docs/05-routing-deployment-domain.md) — routing, Vercel, domain
- [docs/06-design-system.md](docs/06-design-system.md) — metode Oil UI dan arah desain
- [docs/07-apps/keluarga.md](docs/07-apps/keluarga.md) — spesifikasi aplikasi
- [docs/08-data-auth-security.md](docs/08-data-auth-security.md) — data, auth, keamanan
- [docs/10-roadmap.md](docs/10-roadmap.md) — fase dan estimasi
- [docs/11-runbook.md](docs/11-runbook.md) — cara menjalankan dan deploy
- [docs/12-decisions.md](docs/12-decisions.md) — ADR
- [docs/16-testing.md](docs/16-testing.md) — strategi test
- [docs/18-implementation-status.md](docs/18-implementation-status.md) — **apa yang sudah jadi dan belum**

## Struktur kode

```text
src/
├── app/
│   ├── (marketing)/        halaman publik + hub + legal
│   ├── (auth)/login/       login
│   ├── (apps)/keluarga/    18 halaman aplikasi
│   ├── api/health/         health check
│   ├── layout.tsx          font, metadata, analytics
│   ├── instrumentation.ts  startup + error logging
│   ├── robots.ts, sitemap.ts, icon.tsx, opengraph-image.tsx
├── components/
│   ├── ui/                 tombol, badge, field, action-form
│   ├── app/                sidebar, page header, stat card, progress
│   └── marketing/          header, footer, kartu aplikasi
├── config/                 apps.ts (registry), site.ts
└── lib/
    ├── auth/               password (scrypt), session (HMAC)
    ├── data/               types, store, persist, queries, actions
    ├── db/                 schema (22 tabel), koneksi Drizzle
    ├── email/              Resend / outbox
    ├── session.ts          helper sesi + authenticate
    ├── format.ts           rupiah, tanggal, bulan
    └── colors.ts           kelas warna statis

drizzle/0000_init.sql       migrasi SQL
scripts/seed-db.ts          seed Postgres dari data contoh
tests/                      36 unit test
```

## Prinsip

1. **Satu domain, satu pengalaman.**
2. **Aplikasi lama ditautkan, bukan dipindahkan.**
3. **Arah desain dipilih sebelum kode.**
4. **Private by default.**
5. **Uang dan data tidak boleh salah.**
6. **Sederhana dulu, pecah belakangan.**

# 18 — Status Implementasi

> Diperbarui: 2026-10-21
> Kondisi: **bisa dijalankan di local, bisa di-build, data bertahan di berkas lokal.**

Dokumen ini menjawab satu pertanyaan: **apa yang benar-benar sudah ada di repo ini, dan apa yang belum.**

## Verifikasi terakhir

| Pemeriksaan | Hasil |
| --- | --- |
| `pnpm lint` | bersih, tanpa warning |
| `pnpm typecheck` | bersih |
| `pnpm test` | 95 test lulus (8 berkas) |
| `pnpm build` | sukses |
| `pnpm start` (production) | jalan, console bersih |
| Smoke test rute publik | semua 200 |
| Uji alur login → transaksi | saldo & total berubah benar |
| Uji bayar tagihan | transaksi otomatis, tagihan maju |
| Uji isolasi data | akun pasangan tidak melihat dokumen `private` |
| Uji persistensi | data bertahan setelah restart server |
| Uji form kontak | tersimpan ke outbox, tampil di pengaturan |
| Uji checkout → pesanan | kode `ARV-XXXXX` + instruksi transfer tampil |
| Uji gate lisensi | lisensi dicabut → isi aplikasi tidak dirender |

### Penjualan

| Pemeriksaan | Hasil |
| --- | --- |
| Katalog hanya menampilkan produk `visible` | Keluarga saja; Ops & Keuangan 404 |
| Harga tidak bisa dimanipulasi dari form | `createOrder` baca dari registry |
| Pesanan pending ganda dipakai ulang | satu pesanan per email + produk |
| `settleOrder()` idempoten | 3× panggil → 1 lisensi |
| Lisensi terikat produk | lisensi Keluarga tidak membuka Ops |
| Lisensi dicabut menutup akses | terbukti |
| Provider fallback | gateway belum dikonfigurasi → transfer manual |

---

## 1. Cara menjalankan

```bash
pnpm install
pnpm dev
```

Buka `http://localhost:3000`. Tidak perlu `.env.local` untuk mencoba.

Masuk lewat `/login`:

| Peran | Email | Kata sandi |
| --- | --- | --- |
| Pemilik | `irvan@airevo-digital.my.id` | `airevo123` |
| Pasangan | `sari@airevo-digital.my.id` | `airevo123` |

Masuk sebagai pasangan untuk melihat bagaimana data `private` milik pemilik disembunyikan.

Perintah lain:

```bash
pnpm lint          # ESLint
pnpm typecheck     # tsc --noEmit
pnpm test          # 36 unit test
pnpm build         # production build
pnpm start         # jalankan hasil build
```

Database (opsional):

```bash
pnpm db:generate   # buat migrasi dari schema
pnpm db:migrate    # jalankan migrasi
pnpm db:seed       # salin data contoh ke Postgres
pnpm db:studio     # Drizzle Studio
```

---

## 2. Yang sudah jadi

### Marketing, katalog, dan penjualan

| Route | Status | Catatan |
| --- | --- | --- |
| `/` | ✅ | Landing **umum**: studio + produk + model harga + jasa + proses |
| `/aplikasi` | ✅ | **Katalog berharga**: hanya produk `visible` |
| `/aplikasi/[slug]` | ✅ | Detail + kartu harga + isi lisensi |
| `/beli/[slug]` | ✅ | Checkout: validasi, persetujuan lisensi |
| `/pesanan/[code]` | ✅ | Instruksi transfer, status, kunci lisensi |
| `/admin/pesanan` | ✅ | Verifikasi, tandai lunas, cabut lisensi, pendapatan |
| `/work` | ✅ | Daftar case study |
| `/about` | ✅ | Profil dan prinsip kerja |
| `/contact` | ✅ | Form aktif: validasi server, rate limit, Resend/outbox |
| `/login` | ✅ | Email + kata sandi, sesi bertanda tangan |
| `/legal/privacy`, `/legal/terms` | ✅ | Legal |
| `/api/health` | ✅ | Untuk uptime monitor |
| `/icon`, `/opengraph-image` | ✅ | Digenerate dengan `next/og` |
| `/robots.txt`, `/sitemap.xml` | ✅ | App, admin, checkout diblokir dari indeks |
| 404, error boundary | ✅ | Ada jalan kembali |

**Produk aktif:** Keluarga — Rp49.000 sekali bayar, akses seumur hidup.
**Disembunyikan:** Ops, Keuangan (`visible: false`, halaman detail 404).

### Aplikasi Keluarga — 18 halaman

| Route | Isi |
| --- | --- |
| `/keluarga` | Dashboard: saldo, arus kas, anggaran, tagihan, kekayaan bersih, tujuan, agenda, tugas, transaksi |
| `/keluarga/keuangan` | Ringkasan, grafik 6 bulan, breakdown kategori, saldo akun |
| `/keluarga/keuangan/transaksi` | Catat + filter + cari + batalkan |
| `/keluarga/keuangan/akun` | CRUD akun + saldo awal + arsip |
| `/keluarga/keuangan/kategori` | CRUD kategori pemasukan/pengeluaran |
| `/keluarga/keuangan/anggaran` | Anggaran per bulan + progress + status |
| `/keluarga/keuangan/tagihan` | Tagihan rutin, bayar, lewati, majukan tanggal |
| `/keluarga/keuangan/utang` | Utang & piutang, bayar, lunas, hapus |
| `/keluarga/keuangan/aset` | Aset + asuransi, perbarui nilai |
| `/keluarga/rencana` | Tujuan + proyeksi kontribusi |
| `/keluarga/rencana/[id]` | Detail, kontribusi, riwayat, jeda/lanjut |
| `/keluarga/kalender` | Kalender bulan + agenda + ulang tahun otomatis |
| `/keluarga/tugas` | Papan tugas + poin per anggota |
| `/keluarga/belanja` | Daftar belanja + estimasi vs aktual |
| `/keluarga/dokumen` | Metadata dokumen, masa berlaku, visibilitas |
| `/keluarga/kesehatan` | Alergi, kondisi, obat, imunisasi, jadwal kontrol |
| `/keluarga/pendidikan` | Sekolah, biaya tahunan, tautan ke tujuan |
| `/keluarga/anggota` | Anggota, peran, matriks akses |
| `/keluarga/laporan` | Tren 12 bulan, kepatuhan anggaran, tujuan, kekayaan bersih |
| `/keluarga/peta` | Peta aplikasi + pintasan keyboard |

### UX aplikasi

Rincian di [20-ux-aplikasi.md](20-ux-aplikasi.md).

| Hal | Status |
| --- | --- |
| Toast in-app (ganti `alert`) | ✅ |
| Dialog konfirmasi in-app (ganti `window.confirm`) | ✅ |
| Context menu klik kanan di 4 halaman | ✅ |
| Command palette ⌘K dengan kata kunci sehari-hari | ✅ |
| Sidebar ber-ikon, grup bisa dilipat, menu pengguna | ✅ |
| Kerangka muat (skeleton) | ✅ |
| Halaman peta aplikasi + pintasan | ✅ |
| `/keluarga/pengaturan` | Nama keluarga, sesi, akun, outbox kontak, reset data |

### Aturan domain yang berjalan

- Saldo akun = saldo awal + pemasukan − pengeluaran + transfer masuk − transfer keluar.
- Transfer tidak dihitung sebagai pemasukan/pengeluaran.
- Transaksi dibatalkan tidak dihapus, hanya tidak dihitung.
- Anggaran: aman (<80%), waspada (80–100%), lewat (>100%).
- Tagihan: bayar → transaksi otomatis + tanggal maju; tanggal 31 aman di bulan pendek; periode sama tidak bisa dibayar dua kali.
- Tujuan: kontribusi menambah simpanan; saran bulanan = sisa ÷ bulan tersisa.
- Kekayaan bersih = kas + aset + piutang − utang.
- Ulang tahun anggota muncul otomatis setiap tahun.
- Visibilitas: `private` hanya pembuat + owner, `household` untuk dewasa, `shared` untuk semua.
- Semua input divalidasi Zod di server.

### Teknis

- Next.js 16.4 App Router, React 19, TypeScript strict.
- Tailwind CSS v4, token di `globals.css` (arah "Meja Dapur").
- Server Actions untuk semua mutasi.
- Auth: scrypt + cookie HMAC bertanda tangan, `HttpOnly`, `SameSite=Lax`.
- Security headers di `next.config.ts`.
- Halaman app, admin, checkout `noindex` + `Disallow` di robots.
- Analytics + Speed Insights Vercel terpasang.
- `instrumentation.ts` mencatat startup dan error request.
- **95 unit test** (Vitest) lulus, termasuk alur pesanan, lisensi, navigasi, dan context menu.
- `pnpm lint`, `pnpm typecheck`, `pnpm build` lulus tanpa error.

---

## 3. Yang belum

| Hal | Status | Dampak |
| --- | --- | --- |
| **Gateway pembayaran** | Kerangka siap, verifikasi masih manual | Akses aktif 1×24 jam, bukan otomatis |
| **Email lisensi otomatis** | Belum; kunci tampil di halaman pesanan | Pembeli harus menyimpan halaman pesanan |
| **Postgres aktif** | Schema + migrasi + seed siap, aplikasi masih pakai berkas lokal | Data belum multi-device |
| **Google OAuth / passkey** | Belum | Hanya email + kata sandi |
| **Unggah berkas dokumen** | Belum (butuh Vercel Blob privat) | Dokumen hanya metadata |
| **Ekspor CSV / PDF** | Belum | Laporan hanya di layar |
| **Notifikasi email tagihan** | Belum (butuh cron) | Pengingat masih visual |
| **Sentry** | Belum; `instrumentation.ts` sudah jadi tempatnya | Error hanya di log |
| **E2E Playwright** | Belum | Verifikasi manual + unit test |

---

## 4. Batasan penting

### Data di berkas lokal

`src/lib/data/store.ts` menyimpan data ke `.data/store.json` (di-ignore git).
Data **bertahan setelah restart**, tetapi:

- Tidak cocok untuk banyak pengguna/devices.
- Bukan pengganti database untuk data keuangan asli.

`getStore()` menambal berkas lama yang belum punya koleksi baru (`orders`,
`licenses`), jadi versi lama tidak perlu dihapus manual.

Matikan persistensi dengan `AIREVO_PERSIST=0`.

### Pembayaran masih manual

Checkout berjalan penuh, tetapi verifikasi transfer dilakukan pemilik di
`/admin/pesanan`. Lisensi terbit setelah tombol "Tandai lunas" ditekan.
Rincian cara mengaktifkan Xendit/Midtrans ada di
[19-model-bisnis.md](19-model-bisnis.md#7-cara-mengaktifkan-xendit).

### Lisensi per email

Satu pembelian = satu email. Satu keluarga dengan dua akun butuh dua lisensi.
Data contoh menyediakan keduanya agar bisa dicoba.

### Login belum multi-tenant

Satu household, dua akun. Belum ada undangan anggota atau isolasi antar household
di level query (baru satu household).

### Aplikasi lama disembunyikan

`NEXT_PUBLIC_OPS_URL` dan `NEXT_PUBLIC_KEUANGAN_URL` masih dibaca, tetapi Ops dan
Keuangan berstatus `visible: false` sehingga tidak muncul di katalog. Aktifkan
dengan mengubah flag itu saat produknya siap dijual.

---

## 5. Langkah berikutnya, berurutan

1. **Aktifkan gateway pembayaran.** Implementasikan `createPayment` di
   `src/lib/payments/xendit.ts` + webhook `POST /api/payments/xendit` yang
   memanggil `settleOrder()`. Kerangkanya sudah ada.
2. **Kirim email lisensi otomatis** setelah `settleOrder()`, memakai Resend yang
   sudah terpasang.
3. **Aktifkan Postgres.** Isi `DATABASE_URL`, jalankan `pnpm db:migrate && pnpm db:seed`.
   Ganti isi `queries.ts`/`actions.ts` agar membaca/menulis lewat Drizzle.
4. **Tambahkan `household_id` ke setiap query** saat household lebih dari satu.
5. **Pindahkan auth ke Better Auth** untuk OAuth + passkey.
6. **Unggah dokumen** dengan Vercel Blob privat.
7. **Ekspor CSV** untuk transaksi dan laporan.
8. **E2E Playwright** untuk alur beli → bayar → lisensi → pakai.
9. **Deploy + domain + rollback test.**

---

## 6. Peta file penting

```text
src/
├── app/
│   ├── (marketing)/        publik: home, katalog, detail, checkout, pesanan, legal
│   ├── (auth)/login/       login
│   ├── (apps)/keluarga/    18 halaman aplikasi (dijaga gate lisensi)
│   ├── (apps)/admin/       verifikasi pesanan & lisensi
│   ├── api/health/         health check
│   ├── layout.tsx          font, metadata, analytics
│   ├── instrumentation.ts  startup + error logging
│   ├── robots.ts
│   └── sitemap.ts
├── components/
│   ├── ui/                 tombol, badge, field, action-form
│   ├── app/                sidebar, page header, stat card, progress
│   └── marketing/          header, footer, kartu produk, form checkout
├── config/                 apps.ts (katalog + harga), site.ts
├── lib/
│   ├── auth/               password (scrypt), session (HMAC)
│   ├── data/               types, store, persist, queries, actions, orders, order-actions
│   ├── payments/           kontrak provider, manual, xendit, midtrans
│   ├── db/                 schema (22 tabel), koneksi Drizzle
    ├── email/              Resend / outbox
    ├── session.ts          helper sesi + authenticate
    ├── format.ts           rupiah, tanggal, bulan
    └── colors.ts           kelas warna statis

drizzle/0000_init.sql       migrasi SQL
scripts/seed-db.ts          seed Postgres dari data contoh
tests/                      36 unit test
```

---

## 7. Cara menambah aplikasi baru

1. Tulis spec di `docs/07-apps/<nama>.md`.
2. Tambah entri di `src/config/apps.ts`.
3. Buat `src/app/(apps)/<nama>/` dengan `layout.tsx` + halaman.
4. Buat `src/features/<nama>/` untuk query dan action.
5. Tambah `revalidatePath` untuk route baru.
6. Perbarui `sitemap.ts` bila ada halaman marketing.

Hub, home, dan `/aplikasi` otomatis ikut karena membaca registry.

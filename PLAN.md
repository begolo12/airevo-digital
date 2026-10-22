# Airevo Digital — Rencana Induk

> Dokumen ini adalah sumber kebenaran untuk arah proyek. Semua dokumen lain adalah turunan dari rencana ini.
>
> **Status:** Draft v2 — disesuaikan dengan kondisi nyata (aplikasi sudah ada)
> **Tanggal:** 21 Oktober 2026
> **Pemilik:** Irvan / Airevo Digital
> **Target:** `https://airevo-digital.my.id`

---

## 1. Ringkasan eksekutif

Airevo Digital **sudah punya beberapa aplikasi**. Yang belum ada adalah **rumahnya**: satu website yang mempresentasikan bisnis, menyatukan akses ke aplikasi-aplikasi itu, dan menjadi tempat aplikasi baru tumbuh.

Jadi yang dibangun di proyek ini bukan ulang aplikasi lama. Yang dibangun:

1. **Rumah** — website portofolio + hub aplikasi di satu domain.
2. **Fondasi** — auth, design system, app registry, deployment, observability.
3. **Penghuni pertama** — aplikasi baru **Keluarga**: perencanaan keuangan dan pengelolaan rumah tangga, selengkap mungkin.

> **Prinsip:** aplikasi lama tidak dipindahkan dulu. Mereka **ditautkan** dari hub. Integrasi lebih dalam (satu path, satu login) dilakukan bertahap setelah fondasi terbukti.

---

## 2. Kondisi saat ini vs yang dibangun

| Hal | Status | Keterangan |
| --- | --- | --- |
| Aplikasi Ops | Sudah ada | Tidak dibangun ulang; didaftarkan di hub |
| Aplikasi Keuangan | Sudah ada | Tidak dibangun ulang; didaftarkan di hub |
| Aplikasi lain | Sudah ada | Didaftarkan lewat app registry |
| Website portofolio | Belum | Dibangun di proyek ini |
| Hub aplikasi | Belum | Dibangun di proyek ini |
| Auth terpusat | Belum | Dibangun di proyek ini |
| Design system | Belum | Dibangun dengan metode Oil UI |
| Aplikasi Keluarga | Belum | Dibangun penuh di proyek ini |
| Domain + deploy | Belum | Vercel + DNS |

**Konsekuensi penting:** `docs/07-apps/ops.md` dan `docs/07-apps/keuangan.md` adalah **contoh/referensi**, bukan scope pekerjaan. Dokumen itu berguna sebagai pola spec, tetapi yang dieksekusi adalah `docs/07-apps/keluarga.md`.

---

## 3. Satu domain, banyak aplikasi

Pertanyaannya tetap sama: bisakah `airevo-digital.my.id/ops`, `/keuangan`, `/keluarga` membuka aplikasi berbeda? **Bisa**, dengan empat cara. Karena aplikasi sudah ada, ada satu opsi tambahan yang paling cepat.

| Opsi | Cara kerja | Kelebihan | Kekurangan | Kapan dipakai |
| --- | --- | --- | --- | --- |
| **A. Satu Next.js app** | Semua modul jadi route di satu aplikasi | Paling rapi; satu login; satu deploy | Aplikasi lama harus dipindah kodenya | Untuk aplikasi **baru** (Keluarga) |
| **B. Hub + tautan** | Website mendaftar aplikasi, tombol membuka URL Vercel masing-masing | **Paling cepat**; tidak menyentuh aplikasi lama | Pindah domain; login belum tentu sama | **Sekarang**, untuk aplikasi yang sudah ada |
| **C. Vercel Microfrontends** | Beberapa project digabung satu domain lewat `microfrontends.json` | Satu domain, deploy independen | Konfigurasi lebih rumit; auth lintas app harus diuji | Nanti, jika ingin `/ops` benar-benar satu domain |
| **D. Subdomain** | `ops.airevo-digital.my.id` | Bersih untuk app terpisah | Tidak memenuhi keinginan path `/ops` | Alternatif jangka panjang |

### Keputusan

**Fase 1 — Hub + tautan (Opsi B).**
Website mendaftarkan aplikasi yang sudah ada, lengkap dengan status, deskripsi, dan tombol "Buka aplikasi". Tidak ada migrasi kode. Cepat, aman, dan langsung berguna.

**Fase 2 — Keluarga sebagai aplikasi pertama di dalam hub (Opsi A).**
Karena Keluarga dibangun dari nol, ia langsung dibuat sebagai modul di dalam aplikasi Next.js yang sama: `/keluarga`.

**Fase 3 — Integrasi bertahap (opsional, Opsi C).**
Jika suatu saat aplikasi lama ingin benar-benar berada di `airevo-digital.my.id/ops`, baru pertimbangkan Microfrontends. Butuh: satu Vercel project per app, `microfrontends.json`, `withMicrofrontends`, dan pengujian auth lintas app.

### Mengapa tidak langsung Microfrontends?

- Aplikasi lama sudah berjalan; memindahkannya berisiko tanpa manfaat langsung.
- Auth lintas project butuh cookie domain induk dan konfigurasi yang sama — bukan pekerjaan sepele.
- Untuk solo builder, satu hub + satu aplikasi baru sudah memberi 90% nilai.
- Microfrontends bisa ditambahkan nanti tanpa membongkar hub.

---

## 4. Stack final

| Lapisan | Pilihan | Alasan singkat |
| --- | --- | --- |
| Framework | **Next.js 16.x App Router** + React 19 | Fullstack satu repo; RSC, server actions, metadata |
| Bahasa | **TypeScript strict** | Kontrak data aman |
| Styling | **Tailwind CSS v4** | Cepat, konsisten, mudah dikustom |
| Primitif UI | **shadcn/ui + Radix** | Aksesibel, disalin ke repo, bukan tema terkunci |
| **Metode desain** | **Oil UI** (skill) | Eksplorasi arah, perbandingan, penyempurnaan berbasis screenshot |
| Auth | **Better Auth** | Email/password, Google, session, role |
| Database | **Neon PostgreSQL** | Serverless, branching untuk preview |
| ORM | **Drizzle ORM** | Type-safe, migrasi transparan |
| Validasi | **Zod** | Satu skema untuk form/server/env |
| Form | React Hook Form + Zod | UX form yang baik |
| Tabel | TanStack Table | Data table dashboard |
| Chart | Recharts | Dashboard keuangan |
| Uang | decimal.js | Tanpa floating point |
| Email | Resend + React Email | Undangan, tagihan, contact form |
| Rate limit | Upstash Redis | Login, form publik |
| File | Vercel Blob (fase C) | Dokumen keluarga, privat |
| Error | Sentry | Monitoring |
| Analytics | Vercel Analytics + Speed Insights | Traffic dan CWV |
| Test | Vitest + Playwright + axe | Unit, E2E, a11y |
| Deploy | **Vercel** | Preview per PR, rollback, domain/SSL |

### Catatan tentang Oil UI

**Oil UI adalah skill desain untuk AI agent, bukan paket npm.** Ia tidak di-`pnpm add` ke aplikasi.

Alurnya:

1. Tentukan kategori produk, audiens, dan tone.
2. Tulis 3 arah desain yang benar-benar berbeda (tipografi, warna, komposisi).
3. Pilih satu — dari deskripsi, atau dengan membuat 3 hero dan halaman perbandingan.
4. Implementasi penuh di Next.js mengikuti arah terpilih.
5. Ambil screenshot di viewport nyata, perbaiki hierarki, kontras, dan kepadatan.
6. Review independen dan pengurangan elemen yang tidak perlu.

Versi gratis (`oil-ui`) cukup untuk membuat halaman baru. Versi Pro (US$9,99 sekali bayar) menambahkan praktik untuk **dashboard dan workspace**, perbaikan proyek yang sudah ada, dan review lebih ketat — relevan untuk aplikasi Keluarga yang berat dashboard. Keputusan beli/tidak ada di [15-costs.md](docs/15-costs.md).

Detail: [03-tech-stack.md](docs/03-tech-stack.md) dan [06-design-system.md](docs/06-design-system.md).

---

## 5. Aplikasi Keluarga — penghuni pertama

### Kenapa aplikasi ini

- Memberi **bukti nyata** bahwa Airevo bisa membangun produk, bukan hanya website.
- Berguna sehari-hari, jadi akan benar-benar dipakai dan diuji.
- Menunjukkan kemampuan yang paling sulit: data keuangan, perencanaan, multi-user, dan UI yang enak dipakai keluarga.

### Apa isinya

Enam pilar:

| Pilar | Isi |
| --- | --- |
| **Keluarga** | Anggota, peran, profil rumah tangga |
| **Uang** | Akun, transaksi, anggaran, tagihan, utang, aset |
| **Rencana** | Tujuan keuangan, dana darurat, pendidikan, rumah, pensiun |
| **Waktu** | Kalender keluarga, ulang tahun, agenda, tugas rumah |
| **Catatan** | Dokumen penting, kesehatan, pendidikan anak |
| **Belanja** | Daftar belanja, kebutuhan bulanan |

### Prinsip produk

1. **Satu layar menjawab "kondisi keluarga hari ini".**
2. **Mencatat lebih cepat daripada membuka spreadsheet.**
3. **Anak bisa ikut, tanpa melihat data sensitif.**
4. **Uang harus tepat.** Decimal, test, audit.
5. **Tidak menakut-nakuti.** Nada tenang, bukan alarm.

Spesifikasi lengkap: [docs/07-apps/keluarga.md](docs/07-apps/keluarga.md).

---

## 6. Peta rute

### Publik

| Route | Fungsi |
| --- | --- |
| `/` | Home: value, aplikasi, karya, CTA |
| `/aplikasi` | Hub semua aplikasi |
| `/aplikasi/[slug]` | Halaman marketing per aplikasi |
| `/work`, `/work/[slug]` | Portofolio / case study |
| `/about` | Tentang |
| `/contact` | Kontak |
| `/legal/privacy`, `/legal/terms` | Legal |

### Autentikasi

| Route | Fungsi |
| --- | --- |
| `/login` | Login |
| `/api/auth/[...all]` | Better Auth |

### Aplikasi Keluarga (private, noindex)

| Route | Fungsi |
| --- | --- |
| `/keluarga` | Dashboard keluarga |
| `/keluarga/keuangan` | Ringkasan keuangan |
| `/keluarga/keuangan/transaksi` | Transaksi |
| `/keluarga/keuangan/akun` | Akun |
| `/keluarga/keuangan/kategori` | Kategori |
| `/keluarga/keuangan/anggaran` | Anggaran |
| `/keluarga/keuangan/tagihan` | Tagihan & langganan |
| `/keluarga/keuangan/utang` | Utang & piutang |
| `/keluarga/keuangan/aset` | Aset |
| `/keluarga/rencana` | Tujuan keuangan |
| `/keluarga/rencana/[id]` | Detail tujuan |
| `/keluarga/kalender` | Kalender keluarga |
| `/keluarga/tugas` | Tugas rumah |
| `/keluarga/belanja` | Daftar belanja |
| `/keluarga/anggota` | Anggota keluarga |
| `/keluarga/dokumen` | Dokumen (fase C) |
| `/keluarga/kesehatan` | Kesehatan (fase C) |
| `/keluarga/pendidikan` | Pendidikan anak (fase C) |
| `/keluarga/laporan` | Laporan |
| `/keluarga/pengaturan` | Pengaturan |

### Aplikasi lama

Tidak punya route di aplikasi ini. Didaftarkan di `src/config/apps.ts` dengan `href` eksternal (URL Vercel) atau `href` internal jika nanti dipindah.

---

## 7. Arsitektur singkat

```text
Browser
   │
   ▼
Vercel Edge / CDN
   │
   ▼
Next.js App (satu project)
   ├── (marketing)      → home, aplikasi, work, about, contact
   ├── (auth)           → login
   └── (apps)/keluarga  → modul Keluarga
          │
          ├── Server Components / Server Actions
          ├── Better Auth (session)
          └── Drizzle ORM
                 │
                 ▼
          Neon PostgreSQL
          ├── public   (auth, households, members)
          ├── finance  (accounts, transactions, budgets, goals, bills, debts, assets)
          └── family   (events, chores, documents, health, education, shopping)
```

**Batas modul:**

- `features/keluarga` mengelola domain keluarga.
- Aplikasi lama **tidak** diimpor ke sini; mereka hanya tautan.
- Semua data terikat `household_id`.
- Route file tipis; logika di `features/keluarga/server`.

Detail: [docs/04-architecture.md](docs/04-architecture.md).

---

## 8. Fase pengerjaan

Estimasi untuk satu orang, part-time.

| Fase | Durasi | Output | Gate |
| --- | --- | --- | --- |
| **0. Arah & aset** | 1–2 hari | 3 arah desain dipilih, daftar aplikasi, aset | Arah desain final |
| **1. Foundation** | 2–3 hari | Repo, Next.js, Tailwind, auth, CI, Vercel | Build + preview hijau |
| **2. Rumah (hub)** | 4–6 hari | Home, `/aplikasi`, halaman per app, about, contact, SEO | Semua app lama bisa dibuka dari hub |
| **3. Design system** | 2–3 hari | Token, komponen inti, app shell, dark mode | Halaman contoh konsisten |
| **4. Keluarga inti** | 6–9 hari | Anggota, akun, kategori, transaksi, anggaran | Saldo & anggaran benar |
| **5. Keluarga rencana** | 4–6 hari | Tujuan, tagihan, utang, aset, dashboard | Proyeksi & tagihan benar |
| **6. Keluarga waktu** | 3–4 hari | Kalender, tugas, belanja | Alur harian berjalan |
| **7. Keluarga lanjutan** | 5–8 hari | Dokumen, kesehatan, pendidikan, laporan | Fase C selesai |
| **8. Hardening** | 3–4 hari | Security, a11y, performa, backup | Checklist lulus |
| **9. Deploy & domain** | 1 hari | Domain, SSL, rollback | Live |
| **10. Launch & iterasi** | ongoing | Konten, feedback | Review 2 minggu |

**Total realistis:** 7–9 minggu part-time; 4–5 minggu full-time.

Detail: [docs/10-roadmap.md](docs/10-roadmap.md).

---

## 9. Definisi selesai

### Fondasi + hub

- [ ] `https://airevo-digital.my.id` live dengan SSL.
- [ ] `www` redirect konsisten.
- [ ] Home, `/aplikasi`, about, contact bisa diakses.
- [ ] Semua aplikasi lama terdaftar dan bisa dibuka dari hub.
- [ ] Contact form mengirim email + rate limit.
- [ ] Login berfungsi; tidak ada pendaftaran publik.
- [ ] Lighthouse mobile: Performance ≥ 90, A11y ≥ 95, SEO ≥ 95.

### Keluarga (MVP)

- [ ] Bisa membuat household dan anggota keluarga.
- [ ] Bisa membuat akun, kategori, transaksi (income/expense/transfer).
- [ ] Saldo akun benar.
- [ ] Anggaran bulanan + progress benar.
- [ ] Tagihan rutin + status bayar + pengingat.
- [ ] Tujuan keuangan + kontribusi + proyeksi.
- [ ] Dashboard menampilkan kondisi keluarga hari ini.
- [ ] Data setiap household terisolasi.
- [ ] Halaman app `noindex`.
- [ ] Unit test uang/tanggal, E2E alur utama lulus.

### Keluarga (lanjutan)

- [ ] Kalender dan tugas rumah.
- [ ] Dokumen privat.
- [ ] Catatan kesehatan dan pendidikan.
- [ ] Laporan bulanan/tahunan + net worth.

---

## 10. Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Scope Keluarga membengkak | Tidak launch | MVP dikunci; fase C dipisah |
| Aplikasi lama tidak bisa diintegrasikan | Hub terasa setengah | Hub + tautan dulu; microfrontends nanti |
| Oil UI disangka library | Salah ekspektasi | Dijelaskan di dokumen; kode tetap Next.js + Tailwind |
| Desain terlalu ramai | Sulit dipakai | Satu fokus per layar; review screenshot |
| Data keuangan salah | Kepercayaan hilang | Decimal, test, audit, rekonsiliasi |
| Multi-user bocor | Privasi keluarga | Role + household scoping + test isolasi |
| DNS/email rusak | Email mati | Salin MX/SPF/DKIM sebelum pindah nameserver |
| Vercel Hobby untuk komersial | Pelanggaran ToS | Anggarkan Pro jika bisnis |
| Terlalu banyak modul sekaligus | Kualitas turun | Vertical slice per modul |

---

## 11. Keputusan yang perlu dikonfirmasi

1. **Arah desain Keluarga:** pilih satu dari tiga arah di [06-design-system.md](docs/06-design-system.md).
2. **Aplikasi lama:** cukup ditautkan dari hub, atau harus benar-benar di `/ops` dan `/keuangan`? (rekomendasi: tautkan dulu)
3. **Anggota keluarga:** siapa saja yang akan login? (owner saja, atau pasangan dan anak?)
4. **Data nyata:** apakah akan langsung memakai data keuangan asli, atau mulai dengan data contoh?
5. **Oil UI Pro:** beli atau cukup versi gratis?
6. **Registrar/domain:** dikelola di mana?
7. **“uteke”:** dokumen disimpan di `docs/`. Jika maksudnya lokasi lain, beri tahu path-nya.

---

## 12. Langkah berikutnya

1. Konfirmasi arah desain (3 pilihan di dokumen design system).
2. Scaffold Fase 1: repo, Next.js, auth, CI, Vercel preview.
3. Bangun hub + halaman aplikasi.
4. Bangun Keluarga vertical slice pertama: **anggota → akun → transaksi → saldo**.
5. Lanjut anggaran, tagihan, tujuan.
6. Hardening, domain, launch.

> **Pola kerja yang dipakai terus:** plan → arah desain → vertical slice → test → deploy → review screenshot → iterate.

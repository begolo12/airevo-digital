# 12 — Architecture Decision Records (ADR)

Format: **Context → Decision → Consequences**. ADR tidak boleh dihapus; jika berubah, buat ADR baru yang menggantikan.

---

## ADR-001 — Satu Next.js app untuk aplikasi yang dibangun di sini

**Status:** Diterima, sebagian digantikan ADR-013  
**Tanggal:** 2026-10-21

### Context

Kita perlu website portofolio dan aplikasi di satu domain. Aplikasi dikerjakan solo, dan belum ada kebutuhan tim/deploy terpisah.

### Decision

Gunakan **satu aplikasi Next.js** dan **satu project Vercel** untuk website, hub, dan aplikasi yang **dibangun di repo ini** (Keluarga).

### Consequences

- Positif: login, UI, dan deploy konsisten; konfigurasi minimal; tidak ada masalah asset/CORS.
- Negatif: semua modul deploy bersamaan; bundle bisa membesar.
- Mitigasi: batas modul, code splitting, preview, test, rollback.
- **Catatan:** aplikasi yang sudah ada tidak dipaksa masuk ke sini — lihat ADR-013.
- Migrasi ke microfrontends tetap mungkin jika ada pemicu nyata.

---

## ADR-002 — Next.js 16 App Router

**Status:** Diterima  
**Tanggal:** 2026-10-21

### Context

Butuh framework fullstack dengan routing, SSR/SSG, API, metadata, dan integrasi Vercel yang baik.

### Decision

Gunakan **Next.js 16 App Router** + React 19 + TypeScript strict.

### Consequences

- Positif: RSC mengurangi JS client; server actions menyederhanakan mutasi; metadata/SEO built-in; deploy Vercel mulus.
- Negatif: App Router punya learning curve; beberapa library belum sepenuhnya kompatibel.
- Catatan: Next.js 16 memakai `proxy.ts`, bukan `middleware.ts`.

---

## ADR-003 — Tailwind CSS v4 + shadcn/ui

**Status:** Diterima  
**Tanggal:** 2026-10-21

### Context

Butuh desain custom yang cepat, konsisten, dan aksesibel, tanpa terkunci pada tema library besar.

### Decision

Gunakan **Tailwind CSS v4** + **shadcn/ui** (Radix primitives) + Lucide + Motion.

### Consequences

- Positif: kontrol desain tinggi; komponen bisa dikustom; aksesibilitas dasar dari Radix.
- Negatif: harus maintain komponen sendiri; Tailwind v4 masih relatif baru.
- Mitigasi: design tokens, komponen shared, visual regression.

---

## ADR-004 — Neon PostgreSQL + Drizzle ORM

**Status:** Diterima  
**Tanggal:** 2026-10-21

### Context

Data aplikasi relasional (klien, proyek, transaksi, budget) dan perlu query yang aman, migrasi, serta preview database.

### Decision

Gunakan **Neon PostgreSQL** + **Drizzle ORM** + `drizzle-kit`.

### Consequences

- Positif: SQL standar; type-safe; migrasi transparan; branching untuk preview; cocok serverless.
- Negatif: perlu menulis SQL/migrasi manual; tidak ada admin UI bawaan.
- Mitigasi: Drizzle Studio, seed, backup, dokumentasi migrasi.

---

## ADR-005 — Better Auth

**Status:** Diterima  
**Tanggal:** 2026-10-21

### Context

Butuh auth yang aman untuk aplikasi private: email/password, Google, session, role, dan rate limit. Auth.js sekarang menjadi bagian dari Better Auth.

### Decision

Gunakan **Better Auth** dengan Drizzle adapter. Pendaftaran publik dimatikan setelah owner dibuat.

### Consequences

- Positif: fitur lengkap, TypeScript-first, tidak menulis session sendiri.
- Negatif: ekosistem lebih muda dari Auth.js; beberapa plugin masih berkembang.
- Mitigasi: pin versi, test auth flow, dokumentasi konfigurasi.

---

## ADR-006 — Konten marketing dengan MDX

**Status:** Diterima  
**Tanggal:** 2026-10-21

### Context

Case study dan halaman produk jumlahnya sedikit, ditulis sendiri, dan butuh komponen custom.

### Decision

Gunakan **MDX lokal** + frontmatter Zod, bukan CMS headless.

### Consequences

- Positif: simpel, versioned di Git, cepat, tidak ada biaya CMS.
- Negatif: menulis konten butuh commit; tidak ada editor visual.
- Mitigasi: struktur frontmatter jelas, preview lokal, dokumentasi konten.

---

## ADR-007 — IDR dan Asia/Jakarta untuk MVP

**Status:** Diterima  
**Tanggal:** 2026-10-21

### Context

Pengguna awal berada di Indonesia; multi-currency dan multi-timezone menambah kompleksitas besar.

### Decision

MVP hanya mendukung **IDR** dan zona waktu **Asia/Jakarta**. Uang disimpan `numeric(18,2)`; tanggal transaksi `date`.

### Consequences

- Positif: UI dan laporan sederhana; tidak ada konversi kurs.
- Negatif: belum cocok untuk klien internasional.
- Mitigasi: simpan `currency` di tabel; desain agar multi-currency bisa ditambah nanti.

---

## ADR-008 — Tidak ada pendaftaran publik

**Status:** Diterima  
**Tanggal:** 2026-10-21

### Context

Aplikasi internal hanya untuk owner/team. Pendaftaran publik memperbesar risiko abuse.

### Decision

Tidak ada `/register` publik. User dibuat lewat seed/admin/invitation.

### Consequences

- Positif: permukaan serangan kecil; data aman.
- Negatif: menambah user butuh langkah manual.
- Mitigasi: buat alur invitation saat dibutuhkan.

---

## ADR-009 — Domain kanonik apex

**Status:** Diterima  
**Tanggal:** 2026-10-21

### Context

Domain `airevo-digital.my.id` bisa diakses dengan atau tanpa `www`.

### Decision

Gunakan **apex** `https://airevo-digital.my.id` sebagai kanonik; `www` redirect 308 ke apex.

### Consequences

- Positif: URL pendek, konsisten untuk brand dan auth callback.
- Negatif: sebagian orang mengetik `www`; tetap ditangani redirect.
- Mitigasi: uji redirect dan SSL untuk kedua host.

---

## ADR-010 — Tunda microfrontends

**Status:** Diterima  
**Tanggal:** 2026-10-21

### Context

Vercel Microfrontends memungkinkan beberapa project di satu domain, tetapi menambah kompleksitas asset, auth, dan local development.

### Decision

**Tidak** memakai microfrontends untuk MVP. Gunakan satu app. Evaluasi ulang jika:

- Ada tim dengan ritme deploy berbeda.
- Ada app dengan framework berbeda.
- Build > 5 menit dan menghambat.
- Ada kebutuhan isolasi kegagalan yang nyata.

### Consequences

- Positif: lebih cepat dan sederhana.
- Negatif: belum ada deploy independen.
- Mitigasi: modular boundaries dan shared packages disiapkan untuk migrasi.

---

## ADR-011 — Analytics tanpa cookie berat

**Status:** Diterima  
**Tanggal:** 2026-10-21

### Context

Butuh data traffic dan Core Web Vitals tanpa menambah beban privasi/consent yang rumit.

### Decision

Gunakan **Vercel Analytics + Speed Insights** sebagai default. PostHog hanya jika butuh funnel/session replay, dengan consent.

### Consequences

- Positif: ringan, terintegrasi, minim cookie.
- Negatif: analisis funnel terbatas.
- Mitigasi: event kustom untuk CTA/contact; tambah PostHog nanti jika perlu.

---

## ADR-012 — Uang memakai decimal, bukan float

**Status:** Diterima  
**Tanggal:** 2026-10-21

### Context

Perhitungan uang dengan `number` JavaScript bisa menghasilkan error pembulatan.

### Decision

Simpan `numeric(18,2)`; gunakan `decimal.js` untuk aritmetika di application layer; format dengan `Intl.NumberFormat`.

### Consequences

- Positif: akurasi; audit lebih mudah.
- Negatif: tipe string dari DB harus dikonversi hati-hati.
- Mitigasi: helper `money.ts`, unit test, larangan operasi aritmetika langsung pada string.

---

## ADR-013 — Aplikasi lama ditautkan, bukan dipindahkan

**Status:** Diterima  
**Tanggal:** 2026-10-21  
**Menggantikan sebagian:** ADR-001 (untuk aplikasi yang sudah ada)

### Context

Aplikasi Ops, Keuangan, dan aplikasi lain **sudah berjalan**. Memindahkan semuanya ke satu repo/aplikasi berisiko, memakan waktu, dan tidak memberi nilai langsung. Di sisi lain, pengunjung butuh satu tempat untuk menemukan semuanya.

### Decision

Fase awal memakai **hub + tautan**:

- Website mendaftarkan aplikasi di `src/config/apps.ts`.
- Setiap aplikasi punya halaman marketing di `/aplikasi/[slug]`.
- Tombol "Buka aplikasi" mengarah ke deployment Vercel masing-masing.
- Tidak ada migrasi kode aplikasi lama.

Aplikasi **baru** (Keluarga) dibangun langsung sebagai modul di aplikasi Next.js ini.

### Consequences

- Positif: cepat, aman, tidak menyentuh sistem yang sudah berjalan.
- Negatif: pengguna berpindah domain saat membuka aplikasi lama; login belum tentu sama.
- Mitigasi: tampilkan domain tujuan dengan jelas; pertimbangkan SSO/microfrontends nanti.
- Migrasi ke path internal tetap mungkin lewat Microfrontends (ADR-010).

---

## ADR-014 — Oil UI sebagai metode desain

**Status:** Diterima  
**Tanggal:** 2026-10-21

### Context

Proyek butuh kualitas visual di atas rata-rata, bukan template SaaS generik. Ada skill **Oil UI** yang dirancang untuk eksplorasi arah desain, perbandingan, dan penyempurnaan berbasis screenshot.

### Decision

Gunakan **Oil UI** sebagai metode desain:

- Tiga arah ditulis dan dipilih sebelum implementasi.
- Halaman perbandingan (`style-explorer.html`) dipakai jika perlu melihat versi nyata.
- Implementasi tetap memakai Tailwind CSS v4 + shadcn/ui.
- Screenshot desktop/mobile dipakai sebagai bukti dan dasar perbaikan.

Oil UI **bukan** dependency npm dan tidak masuk `package.json`.

### Consequences

- Positif: keputusan visual eksplisit; kualitas naik; tidak terjebak default model.
- Negatif: menambah satu langkah sebelum coding; butuh disiplin memilih arah.
- Mitigasi: untuk perubahan kecil, langsung kerjakan tanpa upacara desain.
- Versi Pro (US$9,99) relevan untuk dashboard; keputusan terpisah di [15-costs.md](15-costs.md).

---

## ADR-015 — Keluarga sebagai aplikasi pertama yang dibangun

**Status:** Diterima  
**Tanggal:** 2026-10-21

### Context

Butuh satu aplikasi nyata untuk membuktikan fondasi: auth, data, dashboard, multi-user, dan desain. Aplikasi lama sudah ada tetapi tidak dibangun di sini.

### Decision

Bangun **aplikasi Keluarga** di `/keluarga` sebagai aplikasi pertama:

- Household + anggota + role.
- Keuangan: akun, transaksi, anggaran, tagihan.
- Rencana: tujuan dan kontribusi.
- Waktu: kalender, tugas, belanja.
- Catatan: dokumen, kesehatan, pendidikan (fase C).

### Consequences

- Positif: berguna sehari-hari; menguji semua lapisan; bukti portofolio yang kuat.
- Negatif: scope besar; bisa menggeser waktu launch hub.
- Mitigasi: hub selesai lebih dulu; Keluarga dibangun per vertical slice; fase C dipisah.

---

## ADR-016 — Model akses berbasis household dan visibilitas

**Status:** Diterima  
**Tanggal:** 2026-10-21

### Context

Aplikasi keluarga dipakai lebih dari satu orang, termasuk anak. Tidak semua data boleh terlihat semua orang, tetapi memisahkan aplikasi per anggota tidak praktis.

### Decision

- Semua data terikat `household_id`.
- Anggota punya role: `owner`, `adult`, `teen`, `child`, `viewer`.
- Data sensitif punya `visibility`: `household`, `shared`, `private`.
- Filter diterapkan di query server, bukan di UI.

### Consequences

- Positif: satu aplikasi, banyak tingkat akses; anak bisa dilibatkan dengan aman.
- Negatif: setiap query harus menyertakan filter role + visibilitas; lebih mudah salah.
- Mitigasi: helper `requireHouseholdMember`, repository wajib menerima konteks akses, test isolasi.

---

## ADR-017 — Model bisnis: sekali beli, tanpa langganan

**Status:** Diterima  
**Tanggal:** 2026-10-21

### Context

Situs ini bukan hanya portofolio, tetapi katalog produk yang dijual. Perlu
diputuskan cara menghasilkan uang. Pasar sasaran adalah rumah tangga dan bisnis
kecil Indonesia, yang umumnya enggan berlangganan untuk alat pribadi.

### Decision

Semua produk dijual **sekali bayar** dengan **akses hosted seumur hidup**.
Harga produk pertama (Keluarga) **Rp49.000**. Tidak ada tagihan berulang.

### Consequences

- Positif: janji sederhana dan mudah dipahami; tidak perlu sistem penagihan
  berulang, dunning, atau penanganan kartu gagal; keputusan pembelian lebih ringan.
- Negatif: biaya hosting ditanggung penjual selamanya. Rp49.000 hanya menutup
  beberapa tahun hosting per pembeli.
- Mitigasi: harga bisa naik untuk pembeli baru (pembeli lama tidak berubah);
  bila perlu, tawarkan paket hosted terpisah — bukan mengubah lisensi lama.
- Lisensi tidak punya `expiresAt`; pencabutan hanya manual (refund/penyalahgunaan).

---

## ADR-018 — Harga di registry, bukan di database

**Status:** Diterima  
**Tanggal:** 2026-10-21

### Context

Harga bisa disimpan di tabel `products` atau di kode. Keduanya punya konsekuensi.

### Decision

Harga, isi lisensi, dan status jual disimpan di **`src/config/apps.ts`**.
Pesanan **menyalin** `amount` dan `productName` saat checkout.

### Consequences

- Positif: harga ikut version control dan review; perubahan harga terlihat di diff;
  tidak ada risiko harga berubah diam-diam lewat UI admin.
- Positif: `createOrder` membaca harga dari registry, sehingga input form tidak
  bisa dipakai memanipulasi nominal.
- Negatif: mengubah harga butuh deploy. Untuk kebutuhan saat ini, itu justru
  pengaman, bukan hambatan.
- Positif tambahan: karena pesanan menyalin harga, riwayat pembelian tidak
  berubah saat harga produk naik.

---

## ADR-019 — Produk disembunyikan, bukan dihapus

**Status:** Diterima  
**Tanggal:** 2026-10-21

### Context

Awalnya Ops dan Keuangan tampil sebagai "aplikasi yang sudah berjalan". Setelah
model bisnis berubah, keduanya belum siap dijual. Menghapus entri berarti
kehilangan datanya.

### Decision

Tambahkan flag `visible: boolean`. Produk dengan `visible: false` hilang dari
landing, katalog, sitemap, dan halaman detail (`getVisibleApp()` → `undefined`
→ 404). Datanya tetap ada di registry.

### Consequences

- Positif: mengaktifkan kembali cukup satu baris; tidak ada kode mati yang dihapus.
- Positif: `/aplikasi/ops` menjadi 404, sehingga tidak ada halaman produk
  setengah jadi yang membingungkan pengunjung.
- Negatif: dua sumber kebenaran (`status` dan `visible`) yang harus konsisten.
- Mitigasi: `status: "soon"` selalu berpasangan dengan `visible: false`.

---

## ADR-020 — Lapisan pembayaran berinterface, manual dulu

**Status:** Diterima  
**Tanggal:** 2026-10-21

### Context

Gateway (Xendit/Midtrans) belum diurus, tetapi alur pembelian harus sudah bisa
diuji dan dipakai hari ini. Menulis kode gateway sekarang berisiko: butuh KYC,
kredensial, dan webhook yang belum bisa diverifikasi.

### Decision

Definisikan kontrak `PaymentProvider` dengan tiga implementasi: `manual`
(aktif), `xendit` dan `midtrans` (kerangka, melempar error sampai diisi).
`getPaymentProvider()` memilih berdasarkan `PAYMENT_PROVIDER` dan **jatuh ke
manual** bila provider yang diminta belum dikonfigurasi.

Penerbitan lisensi dipisahkan ke `settleOrder()` di `orders.ts` — fungsi yang
tidak bergantung pada konteks request, sehingga bisa dipanggil dari server action
maupun webhook.

### Consequences

- Positif: checkout bisa dipakai dan diuji hari ini tanpa kredensial apa pun.
- Positif: mengganti ke gateway tidak menyentuh halaman checkout, halaman pesanan,
  maupun gate akses.
- Positif: `settleOrder()` idempoten, jadi webhook yang datang dua kali tidak
  menerbitkan lisensi ganda.
- Negatif: verifikasi pembayaran manual memakan waktu pemilik (1×24 jam).
- Mitigasi: instruksi transfer jelas, kode pesanan dicantumkan, dan pembeli bisa
  konfirmasi lewat halaman kontak.

---

## ADR-021 — Akses aplikasi dijaga gate lisensi

**Status:** Diterima  
**Tanggal:** 2026-10-21

### Context

Karena produk dijual, akses tidak boleh hanya bergantung pada berhasil login.
Sebelumnya semua akun terdaftar bisa membuka `/keluarga`.

### Decision

Layout `/keluarga` memanggil `hasLicense(session.email, "keluarga")`. Tanpa
lisensi aktif, **isi aplikasi tidak dirender sama sekali** — bukan disembunyikan
dengan CSS — dan yang tampil adalah halaman penjelasan berisi harga serta tautan
membeli.

### Consequences

- Positif: pembatasan ditegakkan di server, tidak bisa dilewati dari klien.
- Positif: pengguna tanpa lisensi tetap mendapat jalan keluar yang jelas.
- Negatif: satu query tambahan di setiap render layout aplikasi.
- Mitigasi: pencarian lisensi berbasis array kecil di memori; saat pindah ke
  Postgres, beri index pada `(email, product_id, status)`.
- Catatan: lisensi terikat per email, sehingga satu keluarga dengan dua akun
  butuh dua lisensi. Saat ini data contoh menyediakan keduanya.

---

## Template ADR baru

```markdown
## ADR-XXX — Judul

**Status:** Diusulkan | Diterima | Ditolak | Digantikan oleh ADR-YYY
**Tanggal:** YYYY-MM-DD

### Context
...

### Decision
...

### Consequences
- Positif: ...
- Negatif: ...
- Mitigasi: ...
```

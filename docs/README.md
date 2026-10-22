# Dokumentasi Airevo Digital

Dokumen ini adalah **blueprint** untuk membangun, merilis, dan merawat website,
katalog produk, dan aplikasi Keluarga. Semua keputusan teknis yang mahal untuk
diubah harus tercatat di sini sebelum dieksekusi.

## Kondisi proyek

- Model bisnis: **sekali beli, akses seumur hidup, tanpa langganan.**
- Produk yang dijual saat ini: **Keluarga — Rp49.000.**
- Ops dan Keuangan **disembunyikan** (`visible: false`), bukan dihapus.
- `docs/07-apps/ops.md` dan `keuangan.md` adalah **contoh/referensi**, bukan scope.
- `docs/07-apps/keluarga.md` adalah **scope aktif**.

## Urutan baca

1. [../PLAN.md](../PLAN.md) — rencana induk.
2. [01-product-brief.md](01-product-brief.md) — kenapa proyek ini ada.
3. [19-model-bisnis.md](19-model-bisnis.md) — **harga, lisensi, alur pembelian, pembayaran.**
4. [02-information-architecture.md](02-information-architecture.md) — sitemap dan katalog.
5. [03-tech-stack.md](03-tech-stack.md) — alat yang dipakai.
6. [04-architecture.md](04-architecture.md) — struktur kode.
7. [05-routing-deployment-domain.md](05-routing-deployment-domain.md) — domain dan deploy.
8. [06-design-system.md](06-design-system.md) — metode Oil UI dan 3 arah desain.
9. [07-apps/README.md](07-apps/README.md) — status tiap aplikasi.
10. [07-apps/keluarga.md](07-apps/keluarga.md) — spesifikasi aplikasi Keluarga.
11. [08-data-auth-security.md](08-data-auth-security.md) — data, auth, keamanan.
12. [09-seo-analytics.md](09-seo-analytics.md) — ditemukan dan diukur.
13. [10-roadmap.md](10-roadmap.md) — urutan pengerjaan.
14. [11-runbook.md](11-runbook.md) — cara menjalankan dan memperbaiki.
15. [12-decisions.md](12-decisions.md) — ADR.
16. [13-checklists.md](13-checklists.md) — daftar periksa.
17. [14-content-plan.md](14-content-plan.md) — konten dan copy.
18. [15-costs.md](15-costs.md) — biaya.
19. [16-testing.md](16-testing.md) — strategi test.
20. [17-agent-workflow.md](17-agent-workflow.md) — pola kerja berulang.
21. [18-implementation-status.md](18-implementation-status.md) — **apa yang sudah jadi dan belum**.
22. [20-ux-aplikasi.md](20-ux-aplikasi.md) — pola interaksi: toast, konfirmasi, klik kanan, ⌘K, sidebar.
23. [21-profil-workspace.md](21-profil-workspace.md) — **profil ber-PIN, ruang pribadi, workspace bersama.**
24. [22-verifikasi-fe-be.md](22-verifikasi-fe-be.md) — hasil audit frontend & backend, bug yang ditemukan.
25. [23-perbaikan-antarmuka.md](23-perbaikan-antarmuka.md) — **kepadatan tata letak & presisi angka.**
26. [24-popup-transaksi-e2e.md](24-popup-transaksi-e2e.md) — **popup transaksi, audit E2E, celah backend.**
27. [25-audit-menyeluruh.md](25-audit-menyeluruh.md) — **status jujur: apa yang 10/10 dan apa yang belum.**
28. [26-neon-setup.md](26-neon-setup.md) — **Postgres, Object Storage, Neon Auth: cara pasang dan buktinya.**
29. [27-rencana-rilis.md](27-rencana-rilis.md) — **rencana lengkap: visual, fitur, pengerasan.**
30. [28-hasil-pengerjaan.md](28-hasil-pengerjaan.md) — **hasil nyata: bug yang ditemukan & diperbaiki.**
31. [29-uji-konkurensi.md](29-uji-konkurensi.md) — **uji tulis bersamaan ke Postgres: hasil & batasannya.**
32. [30-dua-jalur-auth.md](30-dua-jalur-auth.md) — **auth aplikasi vs Neon Auth: kapan masing-masing.**
33. [31-pembatas-laju-persisten.md](31-pembatas-laju-persisten.md) — **blokir login bertahan setelah restart.**

## Status dokumen

| Dokumen | Status |
| --- | --- |
| PLAN.md | Draft v3 — model penjualan |
| 01–06 | Draft |
| 07-apps/keluarga.md | Draft — scope aktif |
| 07-apps/ops.md, keuangan.md | Contoh/referensi, disembunyikan dari katalog |
| 08–17 | Draft |
| 18-implementation-status.md | **Implemented (sebagian)** — sumber kebenaran kondisi kode |
| 19-model-bisnis.md | **Disetujui** — harga dan alur pembelian |
| 20-ux-aplikasi.md | **Implemented** — pola interaksi aplikasi |
| 21-profil-workspace.md | **Implemented (sebagian)** — profil & ruang; UI undangan belum |
| 22-verifikasi-fe-be.md | **Implemented** — audit FE/BE, 4 bug diperbaiki |
| 23-perbaikan-antarmuka.md | **Implemented** — dashboard & keuangan ditata ulang |
| 24-popup-transaksi-e2e.md | **Implemented** — popup transaksi + 3 celah backend ditutup |
| 25-audit-menyeluruh.md | **Implemented** — 15 bug + 2 celah keamanan ditutup |
| 26-neon-setup.md | **Implemented** — Postgres + Object Storage + Auth tersambung |
| 27-rencana-rilis.md | **Rencana** — sebagian dikerjakan |
| 28-hasil-pengerjaan.md | **Implemented** — dark mode, tipografi, unggah dokumen |
| 29-uji-konkurensi.md | **Implemented** — konkurensi diuji, pola aman |
| 30-dua-jalur-auth.md | **Dokumentasi** — dua jalur auth dijelaskan |
| 31-pembatas-laju-persisten.md | **Implemented** — rate limit persisten |

Status: `Draft` → `Disetujui` → `Implemented` → `Deprecated`.

## Aturan maintain

- Setiap perubahan arsitektur, stack, domain, harga, atau scope harus memperbarui
  dokumen terkait **dan** menambah ADR.
- Jangan menulis rahasia di dokumen. Gunakan nama environment variable.
- Perbarui [13-checklists.md](13-checklists.md) setiap ada insiden atau pelajaran baru.
- Jika kode dan dokumen berbeda, anggap dokumen sebagai niat dan kode sebagai
  kenyataan; segera rekonsiliasi.
- Tanggal `YYYY-MM-DD`. Zona waktu aplikasi: `Asia/Jakarta`.

## Konvensi penamaan

- **Airevo Digital** — brand.
- **Keluarga** — produk yang dijual (dibangun di sini).
- **Ops**, **Keuangan** — aplikasi lama, disembunyikan dari katalog.
- **Product** — satu aplikasi yang bisa dibeli. Punya harga dan lisensi sendiri.
- **Order** — satu transaksi pembelian. Kode berformat `ARV-XXXXX`.
- **License** — hak pakai setelah pesanan lunas. Sekali terbit, tanpa kedaluwarsa.
- **Household** — ruang data satu keluarga. Semua data aplikasi terikat ke sini.
- **Katalog** — `/aplikasi`, daftar produk yang dijual.
- **App** — halaman private (`/keluarga/*`), dijaga gate lisensi.

# 10 — Roadmap

## 1. Cara membaca roadmap

- Setiap fase punya **output** dan **gate**. Jangan lanjut sebelum gate lulus.
- Estimasi untuk satu orang, part-time.
- Fokus pada **vertical slice**: satu alur end-to-end yang berfungsi.
- Setiap akhir fase: deploy preview, update dokumen, catat keputusan.
- Aplikasi lama **tidak** dikerjakan ulang. Mereka hanya didaftarkan.

## 2. Ringkasan fase

| Fase | Nama | Estimasi | Output utama |
| --- | --- | --- | --- |
| 0 | Arah desain & aset | 1–2 hari | Arah Oil UI dipilih, daftar aplikasi, aset |
| 1 | Foundation | 2–3 hari | Repo, Next.js, auth, CI, Vercel preview |
| 2 | Rumah (hub) | 4–6 hari | Home, `/aplikasi`, halaman app, about, contact, SEO |
| 3 | Design system | 2–3 hari | Token, komponen inti, app shell |
| 4 | Keluarga inti | 6–9 hari | Anggota, akun, kategori, transaksi, anggaran |
| 5 | Keluarga rencana | 4–6 hari | Tujuan, tagihan, dashboard |
| 6 | Keluarga waktu | 3–4 hari | Kalender, tugas, belanja, laporan |
| 7 | Keluarga lanjutan | 5–8 hari | Dokumen, kesehatan, pendidikan, utang, aset |
| 8 | Hardening | 3–4 hari | Security, a11y, performa, backup |
| 9 | Deploy & domain | 1 hari | Domain live, SSL, rollback |
| 10 | Launch & iterasi | ongoing | Konten, feedback, perbaikan |

**Total:** 7–9 minggu part-time; 4–5 minggu full-time.

## 3. Detail fase

### Fase 0 — Arah desain & aset

**Tugas:**

- Tentukan kategori produk, audiens, dan tone aplikasi Keluarga.
- Tulis dan pilih 1 dari 3 arah desain di [06-design-system.md](06-design-system.md).
- Kumpulkan daftar aplikasi yang sudah ada: nama, URL, status, screenshot.
- Kumpulkan logo, foto, dan case study.
- Konfirmasi domain dan akses DNS.

**Output:**

- Arah desain final (A/B/C).
- `apps.ts` versi awal.
- Daftar aset.

**Gate:**

- [ ] Arah desain dipilih.
- [ ] Semua aplikasi lama punya URL dan deskripsi.
- [ ] Domain dan DNS bisa diakses.

---

### Fase 1 — Foundation

**Tugas:**

- `git init`, repo GitHub.
- `create-next-app` + TypeScript + Tailwind + App Router + `src/`.
- pnpm, Node version, `.nvmrc`.
- shadcn/ui + komponen dasar.
- Token desain sesuai arah terpilih.
- ESLint, Prettier, Husky, commitlint.
- Vitest, Playwright.
- Env validation Zod.
- CI GitHub Actions.
- Vercel project + preview.
- Better Auth dasar.
- `.env.example`.

**Gate:**

- [ ] Lint, typecheck, test, build lulus.
- [ ] Preview Vercel bisa dibuka.
- [ ] CI hijau.
- [ ] Login dasar berfungsi.
- [ ] Tidak ada secret di repo.

---

### Fase 2 — Rumah (hub)

**Tugas:**

- `SiteHeader`, `SiteFooter`, `Container`, `SectionHeading`.
- Home: hero, aplikasi, layanan, work, proses, CTA.
- `/aplikasi` dan `/aplikasi/[slug]`.
- App registry (`src/config/apps.ts`) + kartu aplikasi.
- Work index + case study MDX.
- About, contact + Resend + rate limit.
- Legal draft.
- SEO: metadata, OG, sitemap, robots, JSON-LD.
- Analytics + Speed Insights.

**Gate:**

- [ ] Semua aplikasi lama bisa dibuka dari hub.
- [ ] Semua halaman responsive 360–1440px.
- [ ] Lighthouse mobile: Performance ≥ 90, A11y ≥ 95, SEO ≥ 95.
- [ ] Contact form mengirim email.
- [ ] OG image tampil.

---

### Fase 3 — Design system

**Tugas:**

- Token warna, tipografi, spacing, radius, shadow.
- Komponen app shell: sidebar, topbar, page header, mobile nav.
- Komponen data: stat card, table, filter bar, empty/error state.
- Komponen keuangan: currency input, amount display, budget bar, goal card.
- Dark mode (opsional).
- Halaman contoh untuk validasi visual.
- Screenshot desktop + mobile, perbaiki.

**Gate:**

- [ ] Token konsisten.
- [ ] App shell responsive.
- [ ] Kontras AA.
- [ ] Loading, empty, error state ada.
- [ ] Screenshot sudah ditinjau.

---

### Fase 4 — Keluarga inti

**Tugas:**

- Schema `households`, `household_members`.
- Schema `finance.accounts`, `categories`, `transactions`, `budgets`.
- Onboarding household.
- CRUD anggota.
- CRUD akun, kategori.
- CRUD transaksi + transfer + void.
- Anggaran bulanan.
- Perhitungan saldo di SQL.
- Visibilitas transaksi.
- Unit test uang dan saldo.
- E2E alur inti.

**Gate:**

- [ ] Saldo benar.
- [ ] Transfer tidak dihitung income/expense.
- [ ] Anggaran benar.
- [ ] Void mengembalikan saldo.
- [ ] Isolasi household.
- [ ] E2E lulus.

---

### Fase 5 — Keluarga rencana

**Tugas:**

- Schema `finance.bills`, `bill_payments`.
- Schema `finance.goals`, `goal_contributions`.
- Halaman tagihan + tandai dibayar + transaksi otomatis.
- Halaman rencana + detail + kalkulator.
- Dashboard keluarga.
- Dana darurat otomatis.
- Unit test tanggal dan proyeksi.

**Gate:**

- [ ] Tagihan berulang benar (termasuk akhir bulan).
- [ ] Tidak ada transaksi ganda.
- [ ] Proyeksi tujuan benar.
- [ ] Dashboard konsisten dengan halaman lain.

---

### Fase 6 — Keluarga waktu

**Tugas:**

- Schema `family.events`, `chores`, `shopping_lists`, `shopping_items`.
- Kalender bulan/agenda.
- Ulang tahun otomatis dari anggota.
- Tugas rumah.
- Daftar belanja.
- Laporan bulanan + net worth.
- Export CSV.

**Gate:**

- [ ] Kalender benar.
- [ ] Tugas bisa ditugaskan.
- [ ] Belanja total benar.
- [ ] Laporan benar.
- [ ] Export CSV.

---

### Fase 7 — Keluarga lanjutan

**Tugas:**

- Schema `family.documents`, `health_records`, `education_records`.
- Schema `finance.debts`, `assets`, `insurances`.
- Upload dokumen privat.
- Catatan kesehatan.
- Pendidikan + tautan ke tujuan.
- Net worth lengkap.
- Undangan anggota + role.

**Gate:**

- [ ] Dokumen aman dan hanya bisa diakses yang berhak.
- [ ] Net worth benar.
- [ ] Role berfungsi.
- [ ] Tidak ada kebocoran data privat.

---

### Fase 8 — Hardening

**Tugas:**

- Security review: household scoping, visibility, auth.
- CSP report-only.
- A11y audit.
- Performance audit.
- Error boundaries, loading, empty state.
- Backup + restore test.
- Sentry, uptime.
- Cross-browser + mobile.

**Gate:**

- [ ] Checklist [13-checklists.md](13-checklists.md) lulus.
- [ ] Tidak ada critical/high.
- [ ] Restore backup berhasil.
- [ ] E2E lulus.

---

### Fase 9 — Deploy & domain

**Tugas:**

- Vercel production.
- Neon production + preview branch.
- Env vars.
- Domain apex + www.
- SSL.
- OAuth callback.
- Email DNS.
- Smoke test.
- Rollback test.

**Gate:**

- [ ] Domain + SSL valid.
- [ ] Login production.
- [ ] Contact form.
- [ ] Rollback berhasil.

---

### Fase 10 — Launch & iterasi

- Umumkan.
- Pantau Sentry, analytics, CWV.
- Kumpulkan feedback.
- Tambah case study.
- Perbaiki friction.
- Rencanakan fitur berdasarkan data.

## 4. Sprint plan (2 minggu)

| Hari | Fokus |
| --- | --- |
| 1–2 | Fase 0: arah desain, daftar aplikasi, aset |
| 3–5 | Foundation + auth + CI + Vercel |
| 6–10 | Hub: home, `/aplikasi`, halaman app |
| 11–12 | About, contact, SEO |
| 13–14 | Design system + buffer |

Sprint berikutnya:

| Hari | Fokus |
| --- | --- |
| 1–2 | App shell + onboarding household |
| 3–7 | Akun, kategori, transaksi |
| 8–10 | Anggaran + dashboard |
| 11–14 | Tagihan + tujuan |

## 5. Critical path

```text
Arah desain
  → Foundation
  → Auth + household
  → Akun + transaksi + saldo
  → Anggaran + tagihan + tujuan
  → Dashboard
  → Hardening
  → Domain + deploy
  → Launch
```

Hub bisa dikerjakan paralel dengan design system setelah foundation.

## 6. Definition of done per fitur

- [ ] Acceptance criteria jelas.
- [ ] UI responsive dan aksesibel.
- [ ] Validasi server + error state.
- [ ] Loading, empty, error state.
- [ ] Unit test untuk logika penting.
- [ ] E2E untuk alur kritis.
- [ ] Tidak ada data lintas household.
- [ ] Visibilitas diterapkan.
- [ ] Audit log untuk perubahan penting.
- [ ] Dokumentasi diperbarui.
- [ ] Preview direview.

## 7. Post-launch backlog

1. Case study baru.
2. Perbaikan konversi hub.
3. Kalender eksternal.
4. OCR struk.
5. Recurring transaction.
6. Notifikasi WhatsApp/email.
7. Proyeksi pensiun.
8. Integrasi dengan aplikasi Keuangan lama.
9. Microfrontends jika perlu.
10. Multi-currency.

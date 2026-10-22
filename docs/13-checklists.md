# 13 — Checklists

Gunakan checklist ini sebagai gate. Jangan menandai selesai hanya karena "sudah terlihat jalan".

## 1. Sebelum mulai

- [ ] Tujuan bisnis dan audiens jelas.
- [ ] Daftar aplikasi lama lengkap: nama, URL, status, screenshot.
- [ ] Arah desain Keluarga dipilih (A/B/C).
- [ ] Domain dan akses DNS tersedia.
- [ ] Logo/favicon tersedia (atau wordmark sementara).
- [ ] Minimal 1 case study / konten siap.
- [ ] Auth method diputuskan.
- [ ] Vercel/Neon/Resend/Upstash/Sentry account siap.
- [ ] Repo GitHub dibuat.
- [ ] Oil UI terpasang (`npx skills add oil-oil/oil-ui`).

## 2. Foundation

- [ ] Next.js 16 + TypeScript strict.
- [ ] Tailwind v4 + shadcn/ui.
- [ ] Font via `next/font`.
- [ ] Token desain dari arah terpilih.
- [ ] ESLint + Prettier.
- [ ] Husky + lint-staged + commitlint.
- [ ] Vitest + Playwright.
- [ ] Env validation Zod.
- [ ] CI GitHub Actions.
- [ ] Vercel preview.
- [ ] Better Auth dasar.
- [ ] `.env.example`.

## 3. Hub

- [ ] Home: hero, aplikasi, layanan, work, CTA.
- [ ] `/aplikasi` menampilkan semua aplikasi.
- [ ] `/aplikasi/[slug]` untuk tiap aplikasi.
- [ ] App registry satu sumber.
- [ ] Aplikasi lama bisa dibuka.
- [ ] Status aplikasi benar (`live`, `beta`, `building`, `soon`).
- [ ] About, contact, legal.
- [ ] Contact form + rate limit.
- [ ] SEO: metadata, sitemap, robots, OG.
- [ ] Analytics + Speed Insights.

## 4. Desain

- [ ] Arah dipilih dan dicatat.
- [ ] Token konsisten.
- [ ] Satu fokus per layar.
- [ ] Angka utama terlihat dalam 1 detik.
- [ ] Responsive 360, 390, 768, 1024, 1440.
- [ ] Kontras AA.
- [ ] Fokus keyboard terlihat.
- [ ] Hover/active state.
- [ ] Loading state.
- [ ] Empty state.
- [ ] Error state.
- [ ] 404.
- [ ] Tidak ada overflow horizontal.
- [ ] Tap target ≥ 44px.
- [ ] Screenshot desktop + mobile sudah dilihat.
- [ ] Elemen yang tidak perlu sudah dihapus.

## 5. Auth & akses

- [ ] Login email/password.
- [ ] Google OAuth (jika dipakai).
- [ ] Session HttpOnly/Secure/SameSite.
- [ ] Logout server-side.
- [ ] Tidak ada `/register` publik.
- [ ] `/keluarga` terlindungi.
- [ ] Role `owner/adult/teen/child/viewer` berfungsi.
- [ ] Visibilitas data diterapkan di query.
- [ ] Rate limit login.
- [ ] OAuth callback local + production.

## 6. Keluarga — inti

- [ ] Household dibuat saat onboarding.
- [ ] Anggota bisa ditambah/diubah.
- [ ] Akun + saldo awal.
- [ ] Kategori default.
- [ ] Transaksi income/expense/transfer.
- [ ] Transfer tidak dihitung income/expense.
- [ ] Saldo akun benar.
- [ ] Void mengembalikan saldo.
- [ ] Anggaran bulanan + progress.
- [ ] Visibilitas transaksi.
- [ ] Isolasi household.
- [ ] E2E alur inti.

## 7. Keluarga — rencana

- [ ] Tagihan rutin + frekuensi.
- [ ] Tandai dibayar membuat transaksi.
- [ ] Tidak ada transaksi ganda.
- [ ] Tagihan akhir bulan benar.
- [ ] Tujuan + target + tanggal.
- [ ] Kontribusi menambah progress.
- [ ] Kontribusi disarankan benar.
- [ ] Dana darurat otomatis.
- [ ] Dashboard konsisten.

## 8. Keluarga — waktu & catatan

- [ ] Kalender bulan/agenda.
- [ ] Ulang tahun otomatis.
- [ ] Tugas rumah + assignee.
- [ ] Daftar belanja + total.
- [ ] Laporan bulanan.
- [ ] Net worth.
- [ ] Export CSV.
- [ ] Dokumen privat (fase C).
- [ ] Kesehatan privat (fase C).
- [ ] Pendidikan + tautan tujuan (fase C).

## 9. Security

- [ ] Semua query filter `household_id`.
- [ ] Semua server action validasi session + Zod.
- [ ] Tidak ada `householdId` dari client.
- [ ] Visibilitas diterapkan di server.
- [ ] Rate limit contact/login.
- [ ] Security headers.
- [ ] CSP report-only.
- [ ] `.env` tidak masuk git.
- [ ] 2FA Vercel/Neon/GitHub.
- [ ] Dependency audit.
- [ ] Tidak ada secret di log.
- [ ] Backup + restore diuji.
- [ ] App `noindex`.
- [ ] File upload privat (fase C).

## 10. Performance

- [ ] Lighthouse mobile Performance ≥ 90.
- [ ] LCP < 2,5 s.
- [ ] INP < 200 ms.
- [ ] CLS < 0,1.
- [ ] Gambar `next/image` + `sizes`.
- [ ] Font subset.
- [ ] Chart tidak di initial load marketing.
- [ ] Bundle analyzer dicek.
- [ ] Query di-index.
- [ ] Pagination.

## 11. SEO

- [ ] Title/description unik.
- [ ] Canonical.
- [ ] Sitemap.
- [ ] Robots.
- [ ] OG image.
- [ ] JSON-LD.
- [ ] Heading hierarchy.
- [ ] Internal link.
- [ ] 404 status benar.
- [ ] Redirect www/apex.
- [ ] App noindex.
- [ ] Google Search Console (setelah launch).

## 12. Accessibility

- [ ] axe tidak ada critical.
- [ ] Keyboard navigation.
- [ ] Skip link.
- [ ] Focus trap dialog.
- [ ] Label form.
- [ ] Error announcement.
- [ ] Alt text.
- [ ] Kontras.
- [ ] Reduced motion.
- [ ] Screen reader spot check.

## 13. Deployment

- [ ] Repo GitHub.
- [ ] Vercel project.
- [ ] Neon production + preview.
- [ ] Env production/preview.
- [ ] Build command.
- [ ] Domain apex.
- [ ] `www` redirect.
- [ ] SSL.
- [ ] OAuth callback.
- [ ] Email DNS.
- [ ] Sentry.
- [ ] Analytics.
- [ ] Uptime monitor.
- [ ] Rollback diuji.
- [ ] Smoke test.

## 14. Launch

- [ ] Semua test lulus.
- [ ] Tidak ada P0/P1.
- [ ] Backup terbaru.
- [ ] Runbook diperbarui.
- [ ] Social preview dicek.
- [ ] Posting pengumuman.
- [ ] Monitor 24 jam pertama.
- [ ] Catat metrik awal.
- [ ] Jadwalkan review 2 minggu.

## 15. Post-launch

- [ ] Cek Sentry setiap hari (minggu pertama).
- [ ] Cek CWV.
- [ ] Cek contact form.
- [ ] Cek login.
- [ ] Kumpulkan feedback.
- [ ] Perbaiki friction.
- [ ] Tulis case study baru.
- [ ] Review biaya.
- [ ] Update roadmap.

## 16. Insiden

- [ ] Tentukan severity.
- [ ] Amankan akses/rotate secret.
- [ ] Cek status Vercel/Neon/Sentry.
- [ ] Rollback jika perlu.
- [ ] Komunikasikan.
- [ ] Perbaiki akar masalah.
- [ ] Post-mortem.
- [ ] Update checklist.

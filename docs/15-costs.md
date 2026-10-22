# 15 — Biaya

> Perkiraan per Oktober 2026. Harga layanan bisa berubah; cek halaman resmi sebelum membeli. Kurs asumsi: US$1 ≈ Rp16.500.

## 1. Ringkasan

| Skenario | Biaya bulanan | Biaya tahunan |
| --- | --- | --- |
| **Personal/non-komersial** (Vercel Hobby) | ~Rp0–50 ribu | ~Rp150–600 ribu (domain) |
| **Bisnis kecil** (Vercel Pro) | ~Rp350–450 ribu | ~Rp4,2–5,4 juta |
| **Dengan storage & email volume** | ~Rp500–800 ribu | ~Rp6–9,6 juta |
| **Sekali bayar: Oil UI Pro** | — | US$9,99 (~Rp165 ribu), sekali, update seumur hidup |

## 2. Rincian

| Layanan | Plan | Perkiraan biaya | Catatan |
| --- | --- | --- | --- |
| Domain `.my.id` | Registrar | Rp15–100 ribu/tahun | Tergantung registrar; perpanjang tahunan |
| Vercel | Hobby | Gratis | Hanya untuk personal/non-komersial |
| Vercel | Pro | ~US$20/user/bulan | Wajib untuk penggunaan komersial; termasuk kuota usage |
| Neon | Free | Gratis | 0,5 GB storage, compute terbatas; cukup MVP |
| Neon | Launch | ~US$19/bulan | Jika butuh compute/storage/PITR lebih |
| Upstash Redis | Free | Gratis | Kuota command harian; cukup rate limit |
| Resend | Free | Gratis | ~3.000 email/bulan; cukup contact form |
| Sentry | Free | Gratis | Kuota error terbatas |
| Vercel Blob | Pay-as-you-go | ~US$0,15/GB/bulan + transfer | Fase C; dokumen keluarga |
| GitHub | Free | Gratis | Repo private/public |
| Google Workspace | Business Starter | ~US$7/user/bulan | Opsional untuk email `hello@` |
| Uptime monitor | Better Stack free | Gratis | 1 monitor |
| Oil UI | Open source | Gratis | Skill desain; cukup untuk halaman baru |
| Oil UI Pro | Sekali bayar | US$9,99 | Opsional; dashboard, usability, review ketat |
| Total MVP (Pro) | — | **~Rp350–450 ribu/bulan** | Termasuk domain amortisasi |

## 3. Jalur gratis

Jika proyek ini benar-benar personal/non-komersial:

- Vercel Hobby
- Neon Free
- Upstash Free
- Resend Free
- Sentry Free
- Domain ~Rp50 ribu/tahun

Total: **~Rp0–50 ribu/bulan** (di luar domain).

**Risiko:** Vercel Hobby tidak untuk komersial. Jika website ini menghasilkan uang atau mempromosikan bisnis, gunakan Pro.

## 4. Kapan biaya naik

| Pemicu | Layanan | Perkiraan |
| --- | --- | --- |
| Traffic > kuota Hobby | Vercel Pro | US$20/bulan |
| DB > 0,5 GB / compute habis | Neon Launch | US$19/bulan |
| Email > 3.000/bulan | Resend paid | US$20/bulan |
| Butuh PITR > 7 hari | Neon paid | Bervariasi |
| Banyak file/receipt | Vercel Blob/R2 | US$1–10/bulan |
| Butuh session replay | PostHog paid | US$0–50/bulan |
| Butuh email domain | Google Workspace | US$7/user/bulan |

## 5. Yang tidak perlu dibeli sekarang

- CMS headless (Contentful/Sanity) — konten sedikit.
- Database managed besar — Neon free cukup.
- Redis cache — belum perlu.
- Microfrontends/enterprise — belum perlu.
- Design tool berbayar — Figma free cukup.
- Monitoring mahal — Sentry free + Vercel cukup.
- Oil UI Pro — **belum perlu di awal**. Beli hanya jika versi gratis terasa kurang saat membangun dashboard Keluarga.

### Keputusan Oil UI Pro

| Situasi | Rekomendasi |
| --- | --- |
| Baru mulai, halaman marketing dulu | Gratis sudah cukup |
| Mulai membangun dashboard Keluarga dan butuh usability/state | Pertimbangkan Pro |
| Ingin review berulang sampai kualitas tinggi | Pro |
| Budget sangat ketat | Gratis + review manual |

US$9,99 sekali bayar, bukan langganan. Risiko finansialnya kecil; keputusan lebih ke apakah metodenya benar-benar dipakai.

## 6. Cara menghemat

- Gunakan static generation untuk marketing.
- Optimasi gambar; jangan simpan file besar di repo.
- Hapus data demo di production.
- Batasi preview deployment yang berjalan lama.
- Gunakan satu project Vercel.
- Pilih region database dekat pengguna (Singapore).
- Monitor usage Vercel/Neon setiap bulan.
- Matikan fitur yang tidak dipakai.

## 7. Keputusan biaya

- **Jika ini bisnis:** anggarkan Vercel Pro sejak launch.
- **Jika personal:** mulai Hobby, upgrade saat ada tanda komersial.
- **Domain:** perlakukan sebagai biaya tahunan tetap.
- **Jangan menunda launch** hanya karena ingin plan berbayar; tapi jangan melanggar ToS.

## 8. Checklist biaya

- [ ] Tentukan status komersial.
- [ ] Pilih plan Vercel.
- [ ] Catat tanggal renewal domain.
- [ ] Set budget alert di Vercel/Neon.
- [ ] Review biaya setelah 30 hari.
- [ ] Hapus resource yang tidak dipakai.
- [ ] Simpan invoice di tempat aman.

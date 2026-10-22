# 01 — Product Brief

## 1. One-liner

**Airevo Digital** membangun aplikasi yang membuat pekerjaan sehari-hari — bisnis maupun rumah tangga — berjalan lebih rapi. Website ini adalah rumahnya: portofolio, hub aplikasi, dan aplikasi Keluarga.

## 2. Kondisi proyek

| Hal | Status |
| --- | --- |
| Aplikasi Ops | Sudah ada, berjalan |
| Aplikasi Keuangan | Sudah ada, berjalan |
| Aplikasi lain | Sudah ada |
| Website + hub | Belum — dibangun di proyek ini |
| Aplikasi Keluarga | Belum — dibangun di proyek ini |
| Domain + deploy | Belum |

**Implikasi:** proyek ini bukan proyek "buat semua aplikasi dari nol". Ini proyek **rumah + fondasi + satu aplikasi baru**.

## 3. Masalah yang diselesaikan

### Untuk pengunjung / calon klien

- Portofolio tersebar; sulit menilai kualitas kerja.
- Tidak ada bukti produk yang benar-benar berjalan.
- Tidak jelas bagaimana bekerja sama.

### Untuk Airevo Digital

- Aplikasi tersebar di banyak URL; tidak ada satu pintu masuk.
- Tidak ada tempat untuk menunjukkan kemampuan produk.
- Setiap aplikasi baru mengulang keputusan desain dan auth.

### Untuk keluarga (pengguna aplikasi Keluarga)

- Uang tersebar di banyak rekening dan catatan.
- Tagihan diingat sendiri.
- Tujuan besar tidak pernah dihitung.
- Dokumen dan agenda keluarga sulit dicari.
- Anak tidak bisa dilibatkan dengan aman.

## 4. Audiens

| Persona | Kebutuhan | Cara produk membantu |
| --- | --- | --- |
| **Pemilik UMKM** | Digitalisasi tanpa tim IT besar | Case study, bahasa sederhana, CTA konsultasi |
| **Founder/startup** | Partner membangun MVP | Portofolio, stack yang masuk akal |
| **Recruiter/klien teknis** | Melihat kedalaman teknis | Studi kasus, arsitektur, catatan teknis |
| **Pasangan/orang tua** | Satu tempat untuk keuangan & rencana keluarga | Aplikasi Keluarga |
| **Anak remaja** | Ikut terlibat tanpa melihat semua data | Role + visibilitas |

## 5. Value proposition

1. **Bisa dilihat** — aplikasi nyata, bukan mockup.
2. **Bisa dipakai** — alur sehari-hari, bukan demo.
3. **Rapi secara teknis** — performa, aksesibilitas, keamanan.
4. **Fokus pada hasil** — bahasa manusia, bukan jargon.

## 6. Tujuan

### Bisnis

- 3 lead berkualitas/bulan dalam 3 bulan.
- 2–3 case study yang bisa dipakai saat meeting.
- Satu hub yang menjadi pintu masuk semua aplikasi.

### Pengalaman

- Pengunjung paham apa yang Airevo lakukan dalam < 10 detik.
- Aplikasi bisa dibuka dalam < 2 klik dari home.
- Pencatatan transaksi < 15 detik.

### Teknis

- Lighthouse mobile ≥ 90 / A11y ≥ 95 / SEO ≥ 95.
- Tidak ada halaman app yang terindeks.
- Tidak ada kebocoran data antar household.
- Build < 3 menit.

## 7. Non-goals (versi pertama)

- Bukan marketplace atau platform multi-tenant publik.
- Bukan CMS visual.
- Bukan aplikasi mobile native.
- Bukan sistem akuntansi pajak resmi.
- Bukan pengganti software akuntansi profesional.
- Bukan microservices/microfrontends sebelum perlu.
- **Bukan membangun ulang Ops/Keuangan.**

## 8. Metrik keberhasilan

| Metrik | Target | Cara ukur |
| --- | --- | --- |
| Lead via contact | 3/bulan | Resend + log |
| Aplikasi dibuka dari hub | ≥ 30% pengunjung hub | Analytics event |
| Case study dibaca | ≥ 40% pengunjung `/work` | Analytics |
| Waktu catat transaksi | < 15 detik | Uji manual |
| Error rate | < 1% | Sentry |
| LCP p75 | < 2,5 s | Speed Insights |
| Saldo akurat | 100% | Rekonsiliasi |

## 9. Brand dan voice

- **Atribut:** kredibel, tenang, jelas, hangat, modern.
- **Suara:** konsultan yang menjelaskan dengan sabar.
- **Bahasa:** Indonesia utama; istilah teknis tetap Inggris bila lebih tepat.
- **Hindari:** jargon kosong, klaim tanpa bukti, testimoni fiktif, animasi berlebihan.

## 10. Asumsi

- Domain `airevo-digital.my.id` sudah dimiliki.
- Dikerjakan sendiri dengan bantuan AI agent.
- Aplikasi lama tetap berjalan di deployment masing-masing.
- Pengguna awal Keluarga: 1 keluarga (owner + pasangan, mungkin anak).
- Mata uang IDR; zona waktu `Asia/Jakarta`.
- Oil UI dipakai sebagai metode desain.

## 11. Pertanyaan terbuka

- Logo dan brand guideline resmi sudah ada?
- Aplikasi lama: cukup ditautkan, atau harus satu domain penuh?
- Siapa saja yang akan login ke Keluarga?
- Apakah data keuangan asli langsung dipakai?
- Beli Oil UI Pro?
- Registrar/domain di mana?
- Perlu halaman harga/paket layanan?
- Case study boleh menampilkan nama klien?

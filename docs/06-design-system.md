# 06 — Design System & Metode Desain

## 1. Apa yang dimaksud "pakai Oil UI"

**Oil UI adalah skill desain untuk AI agent, bukan library komponen.** Tidak ada `pnpm add oil-ui`. Yang dipakai adalah **metodenya**:

```text
pahami produk → tulis 3 arah berbeda → pilih satu → implementasi → screenshot → perbaiki → review
```

Kode tetap ditulis dengan **Tailwind CSS v4 + shadcn/ui (Radix)**. Oil UI yang menentukan **keputusan visualnya**: tipografi, warna, komposisi, hierarki, dan apa yang harus dihapus.

### Alur kerja Oil UI di proyek ini

| Langkah | Yang dilakukan | Output |
| --- | --- | --- |
| 1. Pahami | Tentukan kategori produk, audiens, tone, dan pembanding | Catatan arah |
| 2. Tiga arah | Tulis 3 arah yang benar-benar berbeda (bukan 3 variasi warna) | Direction card |
| 3. Pilih | User memilih dari deskripsi, atau dari halaman perbandingan | Arah final |
| 4. Bangun | Implementasi halaman penuh di Next.js | UI berjalan |
| 5. Bukti | Screenshot desktop + mobile, cek hierarki/kontras/kepadatan | Daftar perbaikan |
| 6. Review | Reviewer independen tanpa konteks, atau self-review | Skor + temuan |
| 7. Kurangi | Hapus elemen yang tidak membantu pemahaman | Versi akhir |

### Versi gratis vs Pro

| | Oil UI (gratis) | Oil UI Pro (US$9,99) |
| --- | --- | --- |
| Eksplorasi arah + halaman perbandingan | ✅ | ✅ |
| Halaman baru dari nol | ✅ | ✅ |
| Dashboard & workspace | terbatas | ✅ |
| Perbaikan proyek yang sudah ada | terbatas | ✅ |
| Review berulang hingga 9/10 | — | ✅ |
| Efek SVG/shader, kartu prototipe | — | ✅ |

Aplikasi Keluarga adalah **dashboard-heavy**. Jika hasil gratis terasa kurang dalam hal usability dan state, Pro layak dipertimbangkan. Keputusan ada di [15-costs.md](15-costs.md).

---

## 2. Prinsip desain Airevo Digital

1. **Tenang, bukan ramai.** Satu fokus per layar.
2. **Jelas sebelum cantik.** Kalau harus memilih, keterbacaan menang.
3. **Angka adalah tokoh utama.** Di aplikasi keuangan, tipografi angka menentukan kualitas.
4. **Hangat, bukan korporat.** Ini aplikasi keluarga, bukan bank.
5. **Satu momen yang diingat.** Sisanya diam.
6. **Mobile untuk mencatat, desktop untuk membaca.**
7. **Tidak meniru.** Mekari, Linear, Stripe jadi pembanding kualitas, bukan template.

---

## 3. Tiga arah desain untuk Keluarga

> Ini yang harus dipilih **sebelum** implementasi. Ketiganya berbeda di tipografi, warna, komposisi, dan cara membangun suasana — bukan sekadar beda palet.

### Arah A — "Rumah"

**Terasa seperti:** buku catatan keluarga yang dirawat bertahun-tahun. Tenang, hangat, rapi, sedikit editorial.

**Latar:** kertas krem hangat, bukan putih bersih. Garis tipis seperti buku besar.

**Tipografi:**
- Display: serif modern berkarakter (mis. *Fraunces* atau *Instrument Serif*) untuk angka besar dan judul.
- Body: humanist sans (mis. *Plus Jakarta Sans*).
- Angka: tabular, mono untuk tabel (mis. *IBM Plex Mono*).

**Warna:** krem `#F7F1E6`, tinta `#1F1A17`, terakota `#B4552F`, zaitun `#5C6B4A`, emas redup `#C49A4A`.

**Komposisi:** dua kolom asimetris. Kiri: angka besar + ringkasan bulan. Kanan: daftar bergaris (tagihan, agenda) seperti lembar buku. Banyak ruang kosong vertikal.

**Layar pertama:** "Sisa anggaran bulan ini" sebagai angka besar, di bawahnya tiga baris ringkas (pemasukan, pengeluaran, tujuan), lalu daftar tagihan bergaris dengan tanggal di margin kiri — seperti buku kas.

**Kekuatan:** terasa dewasa dan personal; angka mudah dibaca; cocok untuk pasangan.
**Risiko:** bisa terasa terlalu klasik jika tipografi kurang tepat.

---

### Arah B — "Meja Dapur"

**Terasa seperti:** papan perintah di pintu kulkas. Praktis, hangat, sedikit jenaka, sangat "rumah".

**Latar:** putih susu dengan tekstur halus; kartu-kartu seperti kertas tempel.

**Tipografi:**
- Display: grotesque tebal dan ramah (mis. *Bricolage Grotesque*).
- Aksen: tulisan tangan secukupnya untuk label (mis. *Caveat*) — hanya 1–2 tempat.
- Body: sans netral.

**Warna:** mentega `#F6E7B4`, mint `#BFE3D0`, tomat `#E2563C`, langit `#BFD7EA`, tinta `#23201D`.

**Komposisi:** grid kartu yang sedikit miring, seperti ditempel. Satu kartu besar "Hari ini", sisanya kartu kecil: tagihan, tugas, agenda, tujuan.

**Layar pertama:** papan dengan 5–6 kartu, satu kartu besar berisi "3 hal hari ini", kartu tagihan dengan magnet, kartu tugas dengan avatar anggota.

**Kekuatan:** paling terasa "keluarga"; anak dan pasangan langsung paham; menyenangkan dipakai harian.
**Risiko:** sulit menjaga ketenangan saat data banyak; bisa terlihat kurang serius untuk laporan keuangan.

---

### Arah C — "Tenang"

**Terasa seperti:** ruang konsultasi perencana keuangan pribadi. Presisi, lapang, dewasa, sedikit mewah.

**Latar:** hijau-tinta sangat gelap atau bone terang; kontras tinggi.

**Tipografi:**
- Display: serif editorial (mis. *Newsreader*) untuk angka dan judul.
- Body: neo-grotesque bersih (mis. *Inter* / *Geist*).
- Angka: lining, tabular, tracking rapat.

**Warna:** tinta hijau `#0E1F1A`, bone `#F4F0E8`, sage `#8FA68E`, emas `#B08D57`.

**Komposisi:** satu angka raksasa di tengah-kiri, satu garis tren tipis, satu paragraf rencana, sisanya senyap. Navigasi minimal.

**Layar pertama:** "Kekayaan bersih keluarga" sebagai satu angka besar, sparkline 12 bulan, satu kalimat status ("Di jalur untuk dana darurat 6 bulan"), lalu daftar tiga tindakan berikutnya.

**Kekuatan:** paling kredibel dan "mahal"; sangat kuat untuk laporan dan tujuan jangka panjang.
**Risiko:** bisa terasa dingin untuk aplikasi keluarga; kurang cocok untuk pencatatan cepat di HP.

---

### Rekomendasi

**Arah A — "Rumah".**

Alasan:

- Menyeimbangkan **hangat** (keluarga) dan **serius** (uang) tanpa menjadi generik seperti aplikasi fintech.
- Tipografi serif untuk angka membuat laporan terasa seperti dokumen keluarga, bukan dashboard startup.
- Skalanya bagus dari dashboard sampai tabel transaksi.
- Tetap nyaman di mobile karena bergantung pada tipografi dan ruang, bukan pada banyak kartu.
- Berbeda dari Ops/Keuangan yang sudah ada, sehingga hub terasa punya variasi.

Jika prioritasnya "anak ikut pakai dan terasa menyenangkan", pilih **B**. Jika prioritasnya "terlihat sangat profesional untuk portofolio", pilih **C**.

---

## 4. Setelah arah dipilih

### 4.1 Token

Token diturunkan dari arah terpilih, bukan ditentukan sebelum eksplorasi.

```css
@theme {
  --color-paper: ...;
  --color-ink: ...;
  --color-muted: ...;
  --color-line: ...;
  --color-brand: ...;
  --color-accent: ...;
  --color-positive: ...;
  --color-warning: ...;
  --color-danger: ...;

  --font-display: ...;
  --font-body: ...;
  --font-mono: ...;

  --radius-sm: ...;
  --radius-md: ...;
  --radius-lg: ...;

  --shadow-card: ...;
}
```

Aturan:

- Maksimal 2 family font + 1 mono.
- Kontras teks ≥ 4.5:1.
- Warna status selalu disertai label/ikon.
- Dark mode opsional; jika dibuat, token harus diuji ulang.

### 4.2 Komponen inti

**App shell**
`AppShell`, `AppSidebar`, `AppTopbar`, `PageHeader`, `AppSwitcher`, `UserMenu`, `MobileNav`.

**Data**
`StatCard`, `DataTable`, `FilterBar`, `MonthPicker`, `EmptyState`, `ErrorState`, `SkeletonTable`, `Pagination`.

**Keuangan**
`CurrencyInput`, `AmountDisplay`, `AccountCard`, `CategoryChip`, `BudgetBar`, `BillRow`, `GoalCard`, `GoalProgress`, `CashflowChart`, `CategoryBreakdown`.

**Keluarga**
`MemberAvatar`, `MemberChip`, `EventCard`, `ChoreRow`, `DocumentRow`, `VisibilityBadge`.

**Form**
`FormField`, `FormSection`, `FormActions`, `ConfirmDialog`, `SheetForm`.

**Marketing**
`SiteHeader`, `Hero`, `AppCard`, `CaseStudyCard`, `ProcessSteps`, `CTASection`, `SiteFooter`.

### 4.3 Tipografi angka

Angka adalah inti aplikasi ini. Aturan:

- Selalu `font-variant-numeric: tabular-nums`.
- Ukuran besar untuk angka utama: `clamp(2rem, 5vw, 3.5rem)`.
- Label di atas angka, kecil, muted.
- Delta (naik/turun) memakai ikon + warna + teks.
- Jangan menampilkan lebih dari 2 desimal; IDR tanpa desimal.
- Format: `Rp1.250.000`, bukan `Rp 1,250,000`.

### 4.4 Motion

- 150–250ms, `ease-out`.
- Hanya `opacity` dan `transform`.
- Angka berubah dengan transisi halus, bukan count-up panjang.
- `prefers-reduced-motion` dimatikan.
- Tiga momen yang diberi perhatian: mencatat transaksi, menandai tagihan dibayar, mencapai tujuan.

### 4.5 State wajib

Setiap layar harus punya:

- Loading (skeleton, bukan spinner penuh layar).
- Empty (penjelasan + CTA pertama).
- Error (pesan manusia + coba lagi).
- Success (toast singkat).
- Disabled/read-only untuk role yang tidak berhak.

---

## 5. Aksesibilitas

Target **WCAG 2.2 AA**.

- Kontras 4.5:1 teks normal, 3:1 teks besar.
- Fokus terlihat (ring 2px + offset).
- Keyboard: semua aksi bisa dijangkau; ESC menutup dialog.
- Form: label nyata, bukan placeholder; error terhubung `aria-describedby`.
- Tabel: header `scope`, caption.
- Grafik: sediakan ringkasan teks/tabel alternatif.
- Warna bukan satu-satunya pembeda status.
- Zoom 200% tetap terbaca.
- `lang="id"`.

---

## 6. Konten UI

- Bahasa Indonesia, sapaan "Anda" di halaman publik, "kamu" boleh di dalam aplikasi keluarga.
- Label tombol memakai kata kerja: "Catat transaksi", "Tandai dibayar".
- Error menjelaskan apa yang salah dan apa yang harus dilakukan.
- Jangan menampilkan pesan teknis.
- Jangan menulis "contoh" atau "demo" di dalam produk; jelaskan di dokumentasi.
- Nada tenang: "Anggaran makan lewat Rp120.000 dari rencana", bukan "Anda gagal".

---

## 7. Checklist desain

- [ ] Arah dipilih dan dicatat.
- [ ] Token konsisten di seluruh halaman.
- [ ] Satu fokus per layar.
- [ ] Angka utama terlihat dalam 1 detik.
- [ ] Mobile 390px tidak overflow.
- [ ] Dark mode (jika ada) terbaca.
- [ ] Kontras AA.
- [ ] Keyboard dan fokus.
- [ ] Loading, empty, error state.
- [ ] `prefers-reduced-motion`.
- [ ] Screenshot desktop + mobile sudah dilihat.
- [ ] Elemen yang tidak perlu sudah dihapus.
- [ ] Review independen (atau self-review dicatat).

---

## 8. Yang harus dihindari

- Meniru layout Mekari/Linear persis.
- Glassmorphism dan gradient berlebihan.
- Lebih dari 2 family font.
- Kartu untuk semua hal.
- Animasi yang tidak membantu pemahaman.
- Dashboard dengan 10 angka setara — tidak ada fokus.
- Warna merah untuk hal yang bukan masalah.
- Ikon dekoratif tanpa makna.
- Teks kecil di bawah 14px untuk konten utama.

# 23 — Perbaikan Antarmuka: Kepadatan & Presisi Angka

> Diperbarui: 2026-10-21
> Keluhan pemilik: *"masih banyak banget area kosong"* dan *"kanan-kirinya kayak
> nggak presisi di angka, kanannya terlalu dekat"*.

Dokumen ini mencatat penyebab kedua keluhan itu, perbaikannya, dan bukti
sebelum/sesudah.

---

## 1. Diagnosis

Keluhan itu bukan soal selera. Ada empat penyebab terukur.

### a. Lebar konten terlalu sempit

```diff
- <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
+ <div className="mx-auto w-full max-w-[86rem] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
```

`max-w-5xl` = 1024px. Pada layar 1440px dengan sidebar 248px, ruang tersedia
1192px tetapi konten dikunci 1024px — **168px kosong menganggur di kanan**.
Pada layar 1708px, sekitar 436px menganggur.

### b. Angka meluber dari kartunya

Ini penyebab "kanan terlalu dekat". Dihitung, bukan dikira-kira:

| | Nilai |
| --- | --- |
| Font angka | `1.65rem` = 26.4px |
| Lebar teks `Rp636.070.000` (13 karakter) | **±199px** |
| Ruang dalam kartu (224px − padding 40px) | **184px** |
| Selisih | **meluber 15px** |

Padding kartu 20px tidak cukup menahan angka sepanjang itu, jadi angkanya
menempel ke tepi. Memperbesar padding tidak menyelesaikan apa pun — teksnya
tetap lebih lebar dari ruangnya.

### c. Delapan kartu untuk angka yang saling menjelaskan

Dashboard memakai 8 `StatCard` identik. Kartu ke-5 sampai ke-8 hanya berisi satu
baris angka tanpa konteks, sementara `cashflowSeries()` — data arus kas 6 bulan —
**sudah dihitung tetapi tidak pernah dirender**. Jadi ada ruang kosong di tengah
halaman sementara data yang bisa mengisinya terbuang.

### d. Kelas CSS rusak yang tidak pernah terdeteksi

```diff
- <div className="grid gap-6 ig:grid-cois-[1fr_1.3fr]">
+ <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
```

`ig:grid-cois` bukan kelas valid — hasil substitusi karakter yang rusak. Karena
tidak valid, grid dua kolom **tidak pernah aktif** di 4 tempat: halaman Anggaran,
Kategori, dan Tugas (2 tempat). Kontennya menumpuk satu kolom sehingga menyisakan
ruang kosong besar di kanan.

TypeScript, ESLint, dan build semuanya lolos karena ini hanya nama kelas di dalam
string.

---

## 2. Perbaikan

| # | Perubahan | Alasan |
| --- | --- | --- |
| 1 | `max-w-5xl` → `max-w-[86rem]` | Isi layar lebar, bukan menyisakan pita kosong |
| 2 | Angka `text-[clamp(1.2rem,1.5vw,1.5rem)]` | Selalu ada udara di kanan, tetap besar saat kartu lebar |
| 3 | `MetricStrip` menggantikan 4 kartu | Satu baris untuk angka yang saling menjelaskan |
| 4 | Grafik arus kas dirender | Mengisi ruang dengan data nyata yang tadinya terbuang |
| 5 | `space-y-8` → `space-y-5`, `gap-6` → `gap-4` | Jarak antar-bagian tidak lagi berlebihan |
| 6 | `ig:grid-cois` diperbaiki | Grid dua kolom akhirnya aktif |
| 7 | `/keluarga/keuangan` masuk navigasi | Halaman ini tadinya tidak bisa dijangkau |

### Kenapa `clamp()`, bukan ukuran tetap

`clamp(1.2rem, 1.5vw, 1.5rem)` membuat ukuran angka mengikuti lebar viewport.
Pada 1440px angkanya ~21.6px (lebar teks ~163px, sisa 21px di dalam kartu), pada
1708px ~24px (lebar ~181px, sisa 3px). Angka selalu muat tanpa perlu mengecilkan
seluruh tata letak.

### Kenapa `MetricStrip`, bukan empat kartu

Empat angka ini membentuk satu kalimat: *kekayaan bersih = aset + kas + piutang
− utang*. Sebagai empat kotak terpisah, hubungannya hilang dan tiga kotak hanya
berisi satu baris. Sebagai satu strip, setiap angka dapat ruang lega dan
hubungannya terbaca.

---

## 3. Bukti

| | Sebelum | Sesudah |
| --- | --- | --- |
| Tinggi dashboard (1440px) | 1736px | **1518px** (−13%) |
| Ruang kosong kanan (1440px) | ~168px | **0** |
| Angka meluber | 15px | **0** |
| Kartu angka di atas lipatan | 8 | **4 + 1 strip** |
| Data arus kas | tidak tampil | **tampil** |

Screenshot: `shots/before-full.png` dan `shots/final-dashboard2.png`.

---

## 4. Yang diverifikasi

| Pemeriksaan | Hasil |
| --- | --- |
| `tsc --noEmit` | bersih |
| `eslint` | bersih |
| Unit test | **154 lulus** (12 berkas) |
| Build produksi | sukses |
| Dashboard 1440px | rapi, tanpa ruang kosong |
| Dashboard 1708px | proporsional |
| Halaman Keuangan | grafik utuh di dalam kartu |
| Halaman Tugas (grid rusak) | grid dua kolom aktif |
| Mobile 390px | tidak berubah rusak |

---

## 5. Pelajaran

**Kelas CSS di dalam string tidak diperiksa alat apa pun.** `ig:grid-cois` lolos
dari `tsc`, ESLint, dan build, lalu diam-diam mematikan tata letak. Yang
menangkapnya hanya melihat halaman langsung.

Untuk mencegahnya berulang, dua hal bisa dilakukan:

1. Uji visual otomatis yang memeriksa apakah elemen tertentu benar-benar
   berjajar dua kolom pada lebar tertentu.
2. Hindari substitusi teks massal pada nama kelas — kerusakan seperti ini
   berasal dari sana.

---

## 6. Belum dikerjakan

| Hal | Catatan |
| --- | --- |
| Halaman lain belum ditata ulang sedalam dashboard | Spacing sudah diseragamkan, tetapi susunan kartunya belum |
| Belum ada uji visual otomatis | Verifikasi masih manual lewat screenshot |
| Tabel transaksi belum dioptimalkan untuk layar sangat lebar | Masih `overflow-x-auto` |

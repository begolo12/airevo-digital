# 27 — Rencana Lengkap Menuju Rilis

> Disusun: 2026-10-22
> **Status: hampir seluruh Fase 0–2 dan 4 selesai — lihat [28-hasil-pengerjaan.md](28-hasil-pengerjaan.md)**
> Sisa: deploy Vercel, pembayaran, beberapa fitur Fase 3.
> Permintaan: *"buatkan plan, pastikan semuanya sudah masuk ke dalam plan, apalagi
> perihal UI/UX visual — penting banget untuk frontend, banyak fitur dan gimmick."*

Dokumen ini memuat **seluruh** sisa pekerjaan, bukan sebagian. Frontend dan
visual mendapat porsi terbesar karena itu yang Anda tekankan.

---

## 1. Posisi sekarang

| Aspek | Status |
| --- | --- |
| Halaman aplikasi | 21 |
| Komponen UI | 17 |
| Token warna | 21 |
| Test | 401 lulus (20 berkas) |
| Build | lulus |
| Database | Neon Postgres, data bertahan |
| Object Storage | tersambung, teruji |
| Neon Auth | verifikasi token, 7 test |
| Sudah di-deploy | **belum** |
| `SESSION_SECRET` | **kosong** |
| Pembayaran | transfer manual (Xendit/Midtrans stub) |

**Temuan audit visual hari ini:**

| Temuan | Jumlah | Arti |
| --- | --- | --- |
| Ukuran font ad-hoc `text-[...]` | **200** | Skala tipografi tidak sistematis |
| Ikon SVG inline vs komponen | 21 vs 14 | Dua cara menulis ikon yang sama |
| Dark mode | tidak ada | — |
| Nilai jarak ad-hoc | 2 | Jarak relatif rapi |

Angka 200 itu penting: artinya ukuran teks ditentukan per kasus, bukan dari
skala. Akibatnya hierarki antar halaman tidak konsisten dan setiap perubahan
harus disentuh satu per satu.

---

## 2. Daftar lengkap yang kurang

### A. Blocker rilis

| # | Hal | Akibat bila dibiarkan |
| --- | --- | --- |
| A1 | `SESSION_SECRET` kosong | Semua pengguna ter-logout setiap restart |
| A2 | Belum deploy | Tidak bisa diakses siapa pun |
| A3 | Domain belum tersambung | `airevo-digital.my.id` belum mengarah ke aplikasi |
| A4 | Pembayaran manual tanpa instruksi | Pembeli tidak tahu cara bayar |

### B. Frontend & visual

| # | Hal | Akibat |
| --- | --- | --- |
| B1 | Skala tipografi tidak ada | Hierarki tidak konsisten antar halaman |
| B2 | Belum ada dark mode | Mata lelah saat malam |
| B3 | Belum ada mode kepadatan | Pengguna data-berat butuh lebih padat |
| B4 | Ikon tidak seragam | 21 SVG inline, 14 lewat komponen |
| B5 | Belum ada sistem gerak | Animasi ditulis per kasus |
| B6 | State komponen belum lengkap | Beberapa tombol tanpa focus/hover konsisten |
| B7 | Belum ada ilustrasi empty state | Empty state hanya teks |
| B8 | Grafik belum interaktif | Tidak ada tooltip, tidak bisa disorot |
| B9 | Tabel belum punya sparkline | Angka tanpa konteks tren |
| B10 | Belum ada inline edit | Semua lewat dialog |
| B11 | Belum ada drag-and-drop | Urutan kategori/anggaran tetap |
| B12 | Halaman lain belum ditata sedalam dashboard | 21 halaman, baru 3 yang dipoles |

### C. Fitur yang hilang

| # | Fitur | Catatan |
| --- | --- | --- |
| C1 | UI unggah dokumen | Endpoint siap, tombol belum |
| C2 | Edit transaksi | Hanya batalkan + catat ulang |
| C3 | Transaksi berulang otomatis | Gaji, langganan, cicilan |
| C4 | Pisah tagihan antar anggota | Belum ada |
| C5 | Daftar belanja realtime | Butuh Neon Realtime |
| C6 | Ekspor CSV/PDF | Belum ada |
| C7 | Pencarian bahasa alami | "makan bulan lalu" |
| C8 | Wawasan & deteksi anomali | Belum ada |
| C9 | Simulator pelunasan utang | Belum ada |
| C10 | Proyeksi arus kas | Belum ada |
| C11 | Lampiran foto transaksi | Butuh Object Storage (siap) |
| C12 | Undang anggota workspace | Logika siap, UI belum |
| C13 | Buat workspace bersama | Logika siap, UI belum |
| C14 | Lupa PIN | Belum ada jalur pemulihan |

### D. Kualitas & keamanan

| # | Hal | Akibat |
| --- | --- | --- |
| D1 | Rate limit di memori | Hilang saat restart, tidak antar-instance |
| D2 | Belum ada uji konkurensi | Dua instance bisa saling menimpa |
| D3 | Belum ada uji aksesibilitas | Kontras diperiksa manual saja |
| D4 | Belum ada CI | Semua verifikasi manual |
| D5 | Belum ada monitoring error | Sentry belum |
| D6 | Belum ada backup | Neon punya PITR, belum diuji |

### E. Arsitektur

| # | Hal | Catatan |
| --- | --- | --- |
| E1 | Tabel domain `finance.*`/`family.*` belum dipakai | Data di `workspace_records` generik |
| E2 | `workspaceId` masih opsional di tipe | Ditutup test invariant, bukan compiler |
| E3 | Auth aplikasi vs Neon Auth | Dua jalur, sengaja; perlu didokumentasikan |

---

## 3. Prinsip yang saya pegang

Sebelum daftar tugas, ini yang menentukan **cara** mengerjakannya.

**1. Satu layar, satu protagonis.** Setiap halaman punya satu hal yang paling
penting. Sisanya diam. Tanpa ini, "banyak fitur" berubah jadi "banyak gangguan".

**2. Gimmick harus melayani tugas.** Saya akan menolak detail yang hanya
mengejutkan sekali lalu jadi gangguan. Contoh yang **saya tolak**: suara klik,
kursor kustom, parallax berlebihan, animasi yang menunda tindakan.

**3. Gerak menjelaskan, bukan menghibur.** Angka bergulir saat berubah
menjelaskan "nilai ini baru berubah". Struk tercetak menjelaskan "transaksi
tersimpan". Animasi yang tidak menjelaskan apa pun tidak dipakai.

**4. Arah desain tetap "Meja Dapur".** Hangat, seperti papan di pintu kulkas.
Semua tambahan harus masuk ke arah itu, bukan menumpuk gaya lain di atasnya.

---

## 4. Fase 0 — Bisa dijual (½ hari)

Yang menghalangi pembeli masuk. Dikerjakan lebih dulu karena tanpa ini sisanya
tidak bisa dilihat siapa pun.

| # | Tugas | Berkas |
| --- | --- | --- |
| 0.1 | Isi `SESSION_SECRET` (`openssl rand -base64 32`) | `.env.local`, Vercel env |
| 0.2 | Deploy ke Vercel, sambungkan env Neon | `vercel.json` |
| 0.3 | Sambungkan `airevo-digital.my.id` | DNS |
| 0.4 | Tulis instruksi transfer manual di halaman checkout | `src/app/(marketing)/checkout` |
| 0.5 | Verifikasi `/api/health` di domain produksi | — |

**Kriteria lulus:** aplikasi bisa dibuka di domain sendiri, login bertahan
setelah restart, health check `ok`.

---

## 5. Fase 1 — Fondasi visual (2–3 hari)

Fondasi dulu, ornamen belakangan. Tanpa ini, setiap detail baru menambah
ketidakkonsistenan.

### 5.1 Skala tipografi

**Masalah:** 200 nilai `text-[...]` ad-hoc. Tidak ada skala.

**Perbaikan:** definisikan 8 langkah di `globals.css` sebagai token:

```
--text-2xs  0.625rem   label, metadata
--text-xs   0.6875rem  caption
--text-sm   0.8125rem  UI utama
--text-base 0.9375rem  isi
--text-lg   1.125rem   judul kartu
--text-xl   1.375rem   judul bagian
--text-2xl  1.75rem    judul halaman
--text-3xl  2.25rem    angka besar
```

Lalu ganti 200 nilai ad-hoc itu satu per satu, **dengan pemetaan yang
didokumentasikan**, bukan substitusi buta. Ini pekerjaan mekanis yang harus
hati-hati — kesalahan substitusi massal pernah merusak 10 berkas di sesi ini.

**Bukti selesai:** `grep 'text-\[[0-9.]+rem\]'` di `src/` menghasilkan **0**.

### 5.2 Ikon seragam

**Masalah:** 21 SVG inline dan 14 lewat `<Icon>`. Dua cara untuk hal yang sama.

**Perbaikan:** semua ikon lewat `<Icon name=…>`. Tambah 21 ikon yang masih
inline ke peta ikon. Ukuran dan ketebalan garis mengikuti satu aturan (1.75px
untuk 16px, 2.2px untuk 24px).

**Bukti selesai:** tidak ada `<svg` di luar `src/components/ui/icon.tsx`.

### 5.3 Token semantik

**Masalah:** komponen memakai warna mentah (`bg-butter`, `text-ink`). Sulit
mengganti tema karena setiap komponen tahu warna spesifiknya.

**Perbaikan:** lapisan token semantik di atas palet:

```
--surface-page      → paper
--surface-raised    → card
--surface-sunken    → paper-deep
--text-primary      → ink
--text-secondary    → ink-soft
--text-tertiary     → muted
--border-subtle     → line
--border-strong     → line-strong
--accent-primary    → tomato
--accent-positive   → positive
--accent-warning    → warning
--accent-danger     → danger
```

Palet mentah tetap ada untuk kasus dekoratif; komponen memakai yang semantik.
Ini yang membuat dark mode mungkin tanpa menulis ulang setiap komponen.

### 5.4 Dark mode — "Malam di Dapur"

Bukan inversi. Meja dapur malam: lampu hangat, kertas gelap kecoklatan, bukan
hitam pekat.

```
--color-paper:   #1a1714   (bukan #000)
--color-card:    #23201c
--color-ink:     #f2ece1
--color-butter:  #4a3f22
--color-tomato:  #e8705a   (lebih terang agar kontras)
```

Tiga cara memilih: `system` (default), `light`, `dark`. Disimpan di
`localStorage`, diterapkan lewat kelas di `<html>` sebelum paint (skrip kecil
di `<head>`) supaya tidak berkedip.

**Bukti selesai:** semua 21 halaman lulus pemeriksaan kontras di kedua mode.

### 5.5 Mode kepadatan

Pengguna yang membuka halaman Transaksi setiap hari butuh lebih banyak baris
terlihat. Dua mode:

| Mode | Tinggi baris | Padding kartu | Font UI |
| --- | --- | --- | --- |
| Nyaman (default) | 44px | 20px | 13px |
| Padat | 34px | 14px | 12.5px |

Diatur di Pengaturan → Tampilan, disimpan per profil.

### 5.6 State lengkap

Audit setiap komponen untuk 7 state: default, hover, active, focus-visible,
disabled, loading, error. Yang belum punya, dilengkapi.

**Khusus:** `focus-visible` harus terlihat jelas di kedua mode. Sekarang ada
outline global, tetapi beberapa tombol ikon tidak menampilkannya.

### 5.7 Sistem gerak

Empat kurva, satu tempat:

```
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1)      masuk
--ease-in-quart:  cubic-bezier(0.5, 0, 0.75, 0)      keluar
--ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1)  penegasan
--ease-linear:    linear                             progres
```

Durasi: 120ms (hover), 180ms (masuk), 240ms (dialog), 400ms (transisi halaman).

Semua di bawah `prefers-reduced-motion` → 0.01ms (sudah ada, dipertahankan).

### 5.8 Halaman yang belum dipoles

21 halaman, baru Dashboard, Keuangan, Transaksi yang ditata sedalam itu. Sisanya
disamakan: header, grid, kepadatan, hierarki.

Prioritas: **Tagihan → Anggaran → Utang → Aset → Laporan → Rencana → Tugas →
Belanja → Dokumen → Kesehatan → Pendidikan → Kalender → Pengaturan**.

---

## 6. Fase 2 — Detail yang berhak ada (3–4 hari)

Ini bagian yang Anda sebut "gimmick". Saya pilih yang **menjelaskan sesuatu**,
bukan yang hanya mengejutkan sekali.

### 6.1 Momen tanda tangan

**a. Angka bergulir.** Saat total berubah, angka lama bergulir ke angka baru
(200ms), bukan berkedip. Menjelaskan: *nilai ini baru berubah, dan seberapa*.

**b. Struk tercetak.** Saat transaksi tersimpan, dialog tidak hilang begitu saja
— ia menyusut dan meluncur ke bawah seperti struk keluar printer, lalu toast
muncul. Menjelaskan: *data masuk ke daftar*.

**c. Konfeti tujuan.** Saat tujuan mencapai 100%, satu kali konfeti kertas kecil
(warna meja dapur, bukan warna pesta). Hanya sekali per tujuan, tidak berulang
saat halaman dibuka lagi. Menjelaskan: *pencapaian*.

**d. Cincin progres mengisi.** Progres tujuan mengisi dari 0 saat masuk
viewport. Menjelaskan: *seberapa jauh*.

**e. Sorot baris baru.** Baris yang baru diubah diberi latar butter yang memudar
dalam 1.5 detik. Menjelaskan: *ini yang berubah*.

**f. Toast dengan Urungkan.** Setiap aksi yang bisa dibatalkan memberi tombol
"Urungkan" selama 6 detik. Menjelaskan: *bisa dibatalkan*.

### 6.2 Interaksi yang menghemat waktu

**g. Inline edit.** Klik nominal di tabel → langsung jadi input. Enter simpan,
Esc batal. Tanpa dialog untuk perubahan satu angka.

**h. Command palette diperluas.** Sekarang hanya navigasi. Ditambah: aksi
("catat pengeluaran 50rb", "bayar listrik"), pencarian transaksi, dan riwayat.

**i. Shortcut lengkap.** `g d` dashboard, `g t` transaksi, `n` transaksi baru,
`/` cari, `?` daftar shortcut. Ada halaman bantuan.

**j. Tombol tambah mengambang (mobile).** Satu tombol, menu radial 4 aksi
tercepat. Menggantikan perjalanan ke halaman lain.

**k. Drag-and-drop.** Urutan kategori dan baris anggaran bisa diatur. Tersimpan
per profil.

**l. Sorot & salin.** Klik-kanan sudah ada; ditambah seleksi rentang baris untuk
menyalin beberapa nominal sekaligus.

### 6.3 Visual data

**m. Grafik interaktif.** Tooltip mengikuti kursor, garis bantu vertikal, nilai
di ujung. Bisa disorot dengan keyboard (panah kiri/kanan).

**n. Sparkline di tabel.** Setiap kategori punya garis kecil 30 hari terakhir di
samping nominalnya. Menjelaskan: *tren, bukan hanya angka*.

**o. Perbandingan bulan.** Setiap angka punya pembanding bulan lalu, dengan
panah dan warna. Sudah ada di dashboard, belum di halaman lain.

**p. Heatmap kalender.** Halaman Kalender diberi lapisan heatmap intensitas
pengeluaran per hari. Menjelaskan: *hari mana yang mahal*.

### 6.4 Rasa "meja dapur"

**q. Ilustrasi empty state.** Gambar tangan (Caveat + SVG coretan) untuk setiap
empty state: "belum ada tagihan", "belum ada tujuan". Bukan ilustrasi stok.

**r. Pita & tulisan tangan.** Catatan pada tujuan dan dokumen memakai font
Caveat dengan garis bawah seperti tulisan di kertas.

**s. Tekstur kertas.** Latar halaman diberi tekstur titik halus (SVG, 2KB).
Sudah ada gradien; ditambah butiran agar tidak terasa datar.

**t. Sudut kartu sedikit miring.** Kartu "catatan" (bukan kartu data) diberi
kemiringan 0.4° seperti kertas ditempel. Sudah ada kelasnya, belum dipakai
konsisten.

### 6.5 Yang **tidak** saya sarankan

| Ide | Alasan ditolak |
| --- | --- |
| Suara saat menyimpan | Mengganggu, tidak bisa dimatikan sebagian pengguna |
| Kursor kustom | Menghalangi, tidak menjelaskan apa pun |
| Parallax berlebihan | Membuat pusing, memperlambat |
| Animasi yang menunda aksi | Melanggar prinsip 3 |
| Konfeti di setiap aksi | Kehilangan makna bila sering |
| Loading palsu | Tidak jujur |

---

## 7. Fase 3 — Fitur yang hilang (5–6 hari)

### 7.1 Prioritas tinggi

**C1 — UI unggah dokumen.** Endpoint `/api/dokumen` sudah bekerja dan teruji.
Tinggal: tombol di halaman Dokumen, tarik-lepas, pratinjau, progres unggah,
hapus berkas.

**C2 — Edit transaksi.** Dialog yang sama dipakai ulang dengan mode edit. Klik
baris → dialog terisi → simpan. Riwayat perubahan tersimpan.

**C3 — Transaksi berulang.** Tandai transaksi sebagai berulang (mingguan,
bulanan). Dibuat otomatis saat jatuh tempo, dengan pratinjau sebelum dibuat.

**C12/C13 — Undang anggota & buat workspace.** Logika dan kode undangan sudah
ada. Tinggal form, daftar anggota, dan halaman bergabung lewat kode.

### 7.2 Prioritas menengah

| # | Fitur | Nilai |
| --- | --- | --- |
| C4 | Pisah tagihan antar anggota | Sering dipakai keluarga |
| C6 | Ekspor CSV/PDF | Untuk laporan pajak/sekolah |
| C9 | Simulator pelunasan utang | "Bayar 500rb/bulan, lunas kapan?" |
| C10 | Proyeksi arus kas | 3 bulan ke depan |
| C11 | Lampiran foto transaksi | Struk belanja |

### 7.3 Prioritas rendah (setelah ada pengguna)

| # | Fitur | Alasan ditunda |
| --- | --- | --- |
| C5 | Daftar belanja realtime | Butuh Neon Realtime, nilainya kecil |
| C7 | Pencarian bahasa alami | Butuh AI Gateway, biaya per query |
| C8 | Deteksi anomali | Butuh data nyata untuk dilatih |
| C14 | Lupa PIN | Perlu keputusan: reset lewat pemilik akun? |

---

## 8. Fase 4 — Pengerasan (3 hari)

| # | Tugas | Alasan |
| --- | --- | --- |
| D1 | Rate limit ke Redis/Upstash | Sekarang hilang saat restart |
| D2 | Uji konkurensi | Dua instance bisa saling menimpa |
| D3 | Uji aksesibilitas (axe) di CI | Kontras & ARIA otomatis |
| D4 | CI: typecheck, lint, test, build | Sekarang manual |
| D5 | Sentry | Tanpa ini, error pengguna tidak terlihat |
| D6 | Uji restore Neon PITR | Backup yang belum diuji bukan backup |
| E1 | Migrasi ke tabel domain | Bila data sudah banyak |

---

## 9. Urutan & estimasi

| Fase | Isi | Estimasi |
| --- | --- | --- |
| **0** | Blocker rilis | ½ hari |
| **1** | Fondasi visual | 2–3 hari |
| **2** | Detail & interaksi | 3–4 hari |
| **3** | Fitur hilang | 5–6 hari |
| **4** | Pengerasan | 3 hari |
| | **Total** | **≈ 2 minggu kerja** |

**Bisa dijual setelah Fase 0.** Selebihnya meningkatkan kualitas, bukan
kelayakan.

---

## 10. Kriteria penerimaan

### Visual
- [ ] `grep 'text-\[[0-9.]+rem\]' src/` → 0 hasil
- [ ] Tidak ada `<svg` di luar `icon.tsx`
- [ ] Dark mode lulus kontras WCAG AA di 21 halaman
- [ ] Setiap komponen punya 7 state teruji
- [ ] Tidak ada luapan horizontal di 390/768/1440/1920

### Fungsi
- [ ] Setiap aksi punya jalur berhasil + gagal + sesi berakhir
- [ ] Setiap formulir mempertahankan isian saat gagal
- [ ] Setiap aksi yang bisa dibatalkan punya Urungkan
- [ ] Keyboard: seluruh alur utama bisa diselesaikan tanpa mouse

### Kualitas
- [ ] `tsc`, `lint`, `test`, `build` hijau di CI
- [ ] axe: 0 pelanggaran serius
- [ ] Semua 49 server action teruji
- [ ] Health check menguji, bukan membaca env

---

## 11. Risiko

| Risiko | Mitigasi |
| --- | --- |
| Substitusi massal merusak kode (pernah terjadi) | Ganti per berkas, verifikasi `tsc` tiap langkah |
| Dark mode memperbesar pekerjaan | Token semantik dulu (5.3), baru tema |
| Fase 2 jadi ajang gimmick | Setiap detail harus lulus prinsip 3 |
| Data pengguna hilang saat migrasi tabel domain | Uji di branch Neon dulu |

---

## 12. Yang saya butuhkan dari Anda

| # | Keputusan |
| --- | --- |
| 1 | Mulai dari Fase 0 (bisa dijual) atau Fase 1 (visual) dulu? |
| 2 | Dark mode: perlu sekarang atau nanti? |
| 3 | Pembayaran: manual dulu, atau integrasikan Xendit sekarang? |
| 4 | Fitur mana di Fase 3 yang paling Anda butuhkan lebih dulu? |

Tanpa jawaban ini saya akan mulai dari Fase 0, karena itu yang membuat aplikasi
Anda akhirnya bisa dibuka orang lain.

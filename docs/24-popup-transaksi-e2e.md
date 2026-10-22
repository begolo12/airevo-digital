# 24 — Popup Transaksi & Audit E2E

> Diperbarui: 2026-10-22
> Permintaan: *"untuk transaksi pakai system pop up aja, ketika klik tambah
> transaksi baru muncul popup. Tolong cek semua E2E dan pastikan frontend dan
> backendnya sudah yang terbaik."*

---

## 1. Popup transaksi

### Sebelum

Form catat transaksi selalu terbuka sebagai kartu besar di atas daftar. Daftar
transaksi — yang justru paling sering dilihat — terdorong jauh ke bawah. Setiap
kali membuka halaman, pengguna disuguhi form yang belum tentu ingin diisi.

### Sesudah

Form hanya muncul saat dibutuhkan, lewat tombol **Tambah transaksi**.

Komponen baru:

| Berkas | Isi |
| --- | --- |
| `src/components/ui/dialog.tsx` | Dialog modal yang bisa dipakai ulang |
| `src/components/app/transaction-dialog.tsx` | Isi form transaksi |

### Yang ditangani dialog

| Perilaku | Cara |
| --- | --- |
| Portal ke `document.body` | Tidak terpotong `overflow-hidden` kartu induk |
| Fokus awal | Pindah ke isian pertama setelah terbuka |
| Tab berputar | Fokus tidak bocor ke halaman di belakang |
| Esc | Menutup |
| Klik latar | Menutup (klik di dalam panel tidak) |
| Scroll halaman | Dikunci selama terbuka |
| Fokus kembali | Dikembalikan ke tombol pemicu |
| `role="dialog"` + `aria-modal` | Terbaca pembaca layar |
| Mobile | Menempel di bawah, sudut atas membulat |

Kenapa bukan `<dialog>` bawaan: `showModal()` harus dipanggil lewat ref setelah
mount, tidak bisa dikendalikan prop React, dan animasinya canggung.

### Isian menyesuaikan jenis

| Jenis | Kategori | Akun tujuan |
| --- | --- | --- |
| Pengeluaran | Hanya kategori pengeluaran | Tidak ada |
| Pemasukan | Hanya kategori pemasukan | Tidak ada |
| Transfer | Tidak ada | Wajib dipilih |

Jumlah yang diketik langsung ditampilkan sebagai rupiah di bawah isian
(`88000` → `Rp88.000`), jadi salah ketik nol terlihat sebelum disimpan.

---

## 2. Celah backend yang ditemukan

Audit ini menemukan **tiga celah nyata** yang tidak terlihat dari UI.

### a. Rujukan lintas-ruang

Form bisa mengirim id akun, kategori, anggota, atau akun tujuan milik ruang lain.
Validasi lama hanya memeriksa keberadaan id:

```ts
if (!store.accounts.some((a) => a.id === data.accountId)) { ... }
```

Akibatnya transaksi ruang keluarga bisa menunjuk akun ruang pribadi — saldo ruang
lain ikut terpakai, dan barisnya muncul tanpa nama bagi pemilik aslinya.

**Perbaikan:** helper `invalidReference()` memeriksa bahwa setiap rujukan berada
di ruang yang sama. Diterapkan pada transaksi, pembayaran tagihan, tujuan,
agenda, tugas, tagihan, asuransi, dokumen, kesehatan, dan pendidikan.

### b. Kategori tidak sesuai jenis

Pengeluaran bisa dicatat memakai kategori pemasukan. Laporan jadi menyesatkan
tanpa error apa pun.

**Perbaikan:** kategori diperiksa harus sejenis dengan transaksinya.

### c. Akun pembayaran tagihan lintas-ruang

`payBill` memakai `accountId` apa adanya. Sama seperti (a), saldo ruang lain bisa
terpotong.

**Perbaikan:** diperiksa lewat `invalidReference()`.

---

## 3. Bukti test menangkap bug

Test tidak ditulis setelah kode benar lalu dibiarkan lolos. Saya membuktikan
test-nya bermakna dengan **mengembalikan kode ke versi lama sementara**:

```
❯ tests/reference-validation.test.ts (9 tests | 3 failed)
  FAIL  menolak akun milik ruang lain
  FAIL  menolak kategori milik ruang lain
  FAIL  menolak akun tujuan transfer milik ruang lain
```

Tiga test gagal tanpa perbaikan, lulus setelahnya. Artinya test ini benar-benar
menjaga celahnya, bukan sekadar menemani kode.

---

## 4. Audit E2E

Tiga skrip baru di `scripts/`, dijalankan terhadap dev server hidup:

| Skrip | Isi |
| --- | --- |
| `audit-pages.cjs` | 19 halaman: status HTTP, error konsol, luapan |
| `audit-responsive.cjs` | 19 halaman × 3 lebar layar (390/768/1440) |
| `e2e-transaksi.cjs` | 17 pemeriksaan alur transaksi |

### Hasil

| Audit | Hasil |
| --- | --- |
| Semua halaman termuat | **19/19**, 0 error konsol |
| Luapan horizontal | **0** dari 57 kombinasi halaman × lebar |
| Alur transaksi E2E | **17/17** |

Pemeriksaan E2E mencakup: form tidak lagi inline, popup terbuka, judul benar,
fokus pindah, Esc menutup, simpan menutup otomatis, transaksi muncul, validasi
menahan dialog, navigasi bulan, pencarian, konfirmasi batal, batal menghapus
baris, pindah ruang, isolasi ruang, kembali ke ruang keluarga, mobile tanpa
luapan, dan popup di mobile.

---

## 5. Bug tata letak yang ditemukan audit

Form pencarian di header kartu meluber **18px** di lebar 390px, mendorong seluruh
halaman ke samping.

**Penyebab:** `CardHeader` memakai `flex` tanpa `flex-wrap`, dan form pencarian
memakai lebar tetap `w-36`.

**Perbaikan:** `CardHeader` sekarang `flex-wrap` dengan `min-w-0`; form pencarian
memakai `w-full` di mobile dan `flex-1` untuk isian pencarian.

---

## 6. Kesalahan pada audit saya sendiri

Dua kali skrip audit melaporkan masalah yang **tidak ada**. Keduanya karena
skripnya, bukan aplikasinya:

**1. "Ruang pribadi masih menampilkan data keluarga."**
`body.textContent` ikut membaca payload RSC di dalam `<script>`, yang masih
memuat data ruang sebelumnya meski layar sudah bersih. Saya buktikan dengan
mencari elemen sumbernya: satu-satunya kemunculan ada di `SCRIPT` yang tidak
terlihat. Screenshot mengonfirmasi ruang pribadi bersih total.

**2. "Pindah ruang gagal."**
Skrip memeriksa `body.textContent.includes("Ruang Irvan")`, padahal teks itu
juga muncul sebagai pilihan menu yang belum tentu aktif. Sekarang memeriksa
label pemilih ruang yang sedang aktif.

Perbaikannya: helper `visibleText()` yang hanya membaca teks yang benar-benar
dirender, melewati `script`, `style`, dan elemen tersembunyi.

**Pelajaran:** alat audit juga bisa salah. Setiap kegagalan harus dibuktikan
dulu ke sumbernya sebelum dianggap bug aplikasi.

---

## 7. Verifikasi

| Pemeriksaan | Hasil |
| --- | --- |
| `tsc --noEmit` | bersih |
| `eslint` | bersih |
| Unit test | **163 lulus** (13 berkas) |
| Build produksi | sukses |
| Audit 19 halaman | 19/19 |
| Audit responsif | 0 masalah |
| E2E alur transaksi | 17/17 |

---

## 8. Belum dikerjakan

| Hal | Catatan |
| --- | --- |
| Rate limit PIN | 10.000 kemungkinan tanpa pembatasan — lihat [21-profil-workspace.md](21-profil-workspace.md) |
| UI buat workspace & undang anggota | Logika siap, form belum |
| Edit transaksi | Saat ini hanya bisa dibatalkan lalu dicatat ulang |
| Audit E2E untuk halaman lain | Baru transaksi yang punya alur E2E penuh |
| `workspaceId` masih opsional di tipe | Kelalaian pengisian tidak tertangkap build |

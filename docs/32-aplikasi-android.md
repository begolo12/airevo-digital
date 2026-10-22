# 32 — Aplikasi Android (Flutter)

> Dibuat: 2026-10-22
> Kode: `mobile/`
> APK: `mobile/build/app/outputs/flutter-apk/app-release.apk`

Aplikasi Android untuk aplikasi Keluarga. Data yang dipakai **sama dengan versi
web** — bukan salinan terpisah.

---

## 1. Keputusan yang diambil

### Data sama dengan web, lewat REST API

| Pilihan | Alasan ditolak/dipilih |
| --- | --- |
| SQLite lokal saja | Data terpisah dari web; istri mencatat di HP, suami di laptop, tidak pernah bertemu |
| Sinkronisasi dua arah | Jauh lebih rumit; konflik harus diselesaikan, dan untuk aplikasi keluarga itu tidak sepadan |
| **REST API ke backend yang ada** | **Dipilih** — satu sumber data, tidak ada konflik |

### Token yang sama dengan cookie web

Sesi web berupa payload yang ditandatangani HMAC dan **mandiri** — tidak
bergantung pada cookie untuk berarti. Jadi Android cukup mengirim string yang
sama lewat `Authorization: Bearer`.

| Klien | Transport |
| --- | --- |
| Web | cookie `airevo_session` |
| Android | header `Authorization` |

Keuntungannya: masa berlaku, cara menandatangani, dan aturan kedaluwarsa hanya
ada di satu tempat. Tidak ada jalur yang bisa tertinggal saat aturannya berubah.

### Aplikasi fokus, bukan versi web yang diperkecil

Lima tab: Ringkasan, Transaksi, Tagihan, Anggaran, Laporan. Mengatur anggota,
memindahkan ruang, dan mengunggah dokumen tetap di web.

Aplikasi yang mencoba melakukan segalanya biasanya tidak melakukan satu pun
dengan baik. Yang dipilih di sini adalah yang dipakai **harian**: memeriksa
saldo, melihat transaksi, memantau tagihan.

---

## 2. Arsitektur

```
mobile/lib/
  app/          tema, format rupiah & tanggal
  data/         klien HTTP, model, galat
  state/        SessionController
  screens/      layar per tab
  widgets/      komponen bersama
```

### Lapisan terjemahan di server

`src/lib/data/mobile.ts` menerjemahkan hasil query internal ke bentuk yang
stabil untuk klien:

- Semua nominal **integer rupiah** — tidak ada pembulatan di klien
- Semua tanggal **ISO `YYYY-MM-DD`** — tidak ada `Date` yang perlu diurai
- Tidak ada field `undefined` — nilai kosong dikirim `null` eksplisit

Alasannya: aplikasi yang sudah terpasang di HP pengguna **tidak bisa dipaksa
memperbarui diri**. Kalau server mengganti nama field, aplikasi versi lama akan
menampilkan angka kosong tanpa penjelasan. Lapisan ini memutus ketergantungan
itu.

### Keamanan

| Aspek | Cara |
| --- | --- |
| Token disimpan | Android Keystore (`flutter_secure_storage`), bukan preferensi biasa |
| Keanggotaan | Diperiksa **ulang setiap permintaan**, tidak dipercaya dari isi token |
| Percobaan login | Dibatasi `LOGIN_RULE` — sama dengan web |
| Percobaan PIN | Dibatasi `PIN_RULE` — sama dengan web |
| Galat internal | Tidak dibocorkan; klien menerima pesan umum |

**Kenapa keanggotaan diperiksa ulang:** token bisa berumur tujuh hari. Selama
itu pemilik ruang bisa mencabut akses profil. Mempercayai isi token berarti
pencabutan tidak berlaku sampai token kedaluwarsa sendiri — terlalu lama.

---

## 3. Endpoint

| Endpoint | Isi |
| --- | --- |
| `POST /api/mobile/auth/login` | Email + sandi → token tahap `profile` |
| `POST /api/mobile/auth/profile` | Profil + PIN → token tahap `active` |
| `GET /api/mobile/me` | Identitas pemilik token |
| `GET /api/mobile/summary` | Saldo, pemasukan, pengeluaran, anggaran, proyeksi |
| `GET /api/mobile/transactions` | Daftar transaksi, paginasi `limit`/`offset` |
| `GET /api/mobile/bills` | Tagihan aktif |
| `GET /api/mobile/budgets` | Anggaran bulan berjalan |
| `GET /api/mobile/goals` | Tujuan keuangan |
| `GET /api/mobile/reports` | Laporan, kategori, tren 12 bulan |
| `GET /api/mobile/calendar?month=` | Pengeluaran harian untuk heatmap |
| `GET /api/mobile/reference` | Akun dan kategori |

Semua kecuali dua endpoint auth memakai `withAuth()`, sehingga tidak ada rute
yang bisa lupa memeriksa sesi.

---

## 4. Bukti

### API — 40 pemeriksaan

```
ok    tanpa token ditolak 401
ok    token palsu ditolak 401
ok    kata sandi salah ditolak
ok    login berhasil  status 200
ok    token tahap profile tidak boleh baca data  status 403
ok    PIN salah ditolak  status 401
ok    PIN benar diterima  status 200
ok      saldo berupa angka  81420000
ok      proyeksi 6 bulan  6 bulan
ok      dibatasi 5  5 baris
ok      tanggal ISO  2026-10-11
ok    bulan tidak sah ditolak  status 422
ok    Sari masuk ke ruang bersama (bukan pribadi Irvan)
API MOBILE OK
```

### Unit test

| Bagian | Jumlah |
| --- | --- |
| `tests/mobile-auth.test.ts` (Vitest) | 16 |
| `mobile/test/models_test.dart` (Flutter) | 24 |

### APK

```
package: name='id.airevo.airevo_keluarga' versionName='1.0.0'
minSdkVersion:'24'
targetSdkVersion:'36'
uses-permission: android.permission.INTERNET
application-label:'Keluarga Airevo'
ukuran: 49.5 MB
```

---

## 5. Bug yang ditemukan saat mengerjakannya

| Bug | Dampak |
| --- | --- |
| Validasi bulan kalender mengabaikan parameter tidak sah | `month=2026-13` diam-diam memakai bulan berjalan — bug klien tersembunyi |
| `Fmt.compact` menghasilkan spasi di depan | Teks tampil " Rp1,5 jt" |
| `Fmt.money` menghasilkan `NaN` | Angka `NaN` di layar keuangan merusak kepercayaan seluruh halaman |
| Impor `token_store.dart` yang tidak ada | Build APK gagal |
| Alias tipe `Exception` untuk membedakan galat | `error is Exception` selalu benar — penanganan sesi berakhir tidak pernah jalan |

**Catatan tentang bug terakhir:** saya sempat menulis
`typedef SessionExpiredLike = Exception` agar tidak perlu mengimpor dua modul.
Itu kesalahan: setiap galat Dart adalah `Exception`, jadi pemeriksaannya selalu
lolos dan pengguna akan dianggap "sesi berakhir" setiap kali ada galat apa pun.
Diperbaiki dengan mengimpor kelas galat yang sebenarnya.

---

## 6. Cara memasang

### Di HP

1. Salin `mobile/build/app/outputs/flutter-apk/app-release.apk` ke HP
2. Buka berkasnya, izinkan "instal dari sumber tidak dikenal" bila diminta
3. Setelah terbuka, tekan alamat server di bawah tombol Masuk bila perlu
   diubah (mis. `http://192.168.0.154:3100`)

### Alamat server

APK dibangun dengan alamat `http://192.168.0.154:3100`. Bila IP komputer
berubah, atau setelah aplikasi di-deploy ke domain:

```bash
cd mobile
flutter build apk --release --dart-define=API_BASE_URL=https://domain-anda.id
```

Alamat juga bisa diubah langsung dari layar masuk tanpa build ulang.

### Catatan untuk produksi

- `android:usesCleartextTraffic="true"` di `AndroidManifest.xml` **harus
  dihapus** bila server sudah memakai HTTPS. Tanpa itu Android mengizinkan
  koneksi tanpa enkripsi.
- APK release saat ini ditandatangani dengan debug key. Untuk Play Store,
  buat keystore sendiri dan daftarkan di `android/key.properties`.

---

## 7. Yang belum dikerjakan

| Hal | Alasan |
| --- | --- |
| Menambah transaksi dari HP | Perlu formulir + validasi; web sudah bisa |
| Notifikasi pengingat tagihan | Perlu izin notifikasi + penjadwal lokal |
| Mode gelap | Perlu dua palet yang dijaga selaras dengan web |
| Tanda tangan rilis (Play Store) | Perlu keystore Anda |
| iOS | Butuh macOS untuk build |

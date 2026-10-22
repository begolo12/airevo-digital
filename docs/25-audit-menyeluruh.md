# 25 — Audit Menyeluruh: Apa yang Sudah dan Belum 10/10

> Diperbarui: 2026-10-22
> Permintaan: *"pastikan semuanya sudah 10/10 secara frontend dan backend."*

Dokumen ini menjawab pertanyaan itu dengan jujur. Saya tidak akan menyebut
sesuatu 10/10 bila masih ada lubang yang saya ketahui.

---

## 1. Ringkasan

| Aspek | Status | Alasan |
| --- | --- | --- |
| Frontend (UI/UX) | **9/10** | Terverifikasi 19 halaman × 3 lebar layar, 0 luapan, 0 error konsol |
| Logika & keamanan data | **9/10** | 15 bug ditemukan & diperbaiki, 49/49 aksi teruji |
| **Penyimpanan produksi** | **3/10** | **Belum ada database. Data hilang di Vercel.** |
| Keseluruhan siap jual | **belum** | Satu masalah di atas menutup semuanya |

---

## 2. Yang diperbaiki di putaran ini

### 2.1 Rate limit (sebelumnya tidak ada)

Sebelumnya hanya form kontak yang punya pembatas. Login dan PIN **tanpa batas
sama sekali**.

Sekarang ada `src/lib/auth/rate-limit.ts` dengan jendela geser:

| Titik masuk | Batas | Kunci |
| --- | --- | --- |
| Login | 5 / 15 menit | per email |
| PIN profil | 5 / 10 menit | per profil |
| Form kontak | 5 / jam | global |

Dikunci **per email/profil**, bukan per IP: penyerang bisa berpindah IP, tetapi
akun yang diserang tetap sama.

Percobaan yang berhasil **mereset** kuota, sehingga pengguna sah tidak terhukum
oleh salah ketik sebelumnya.

**Batas yang perlu disadari:** penyimpanan ada di memori proses. Hitungan hilang
saat restart, dan pada N instance batas efektif menjadi N kali lipat. Untuk
produksi multi-instance, ganti dengan Redis/Upstash — API-nya sengaja dibuat
kecil agar penggantian tidak menyentuh pemanggil.

### 2.2 Penyimpanan: gagal keras, bukan senyap

Sebelumnya kegagalan tulis hanya `console.warn` lalu diabaikan:

```ts
catch (error) {
  writeDisabled = true;
  console.warn("[store] penyimpanan berkas tidak tersedia; ...");
}
```

Aplikasi tampak sehat sementara **data pengguna hilang setiap instance didaur
ulang**.

Sekarang:

1. Kegagalan tercatat di `getPersistenceState()`.
2. `/api/health` **menguji tulis sungguhan** (berkas probe), bukan sekadar
   membaca variabel environment.
3. `instrumentation.ts` menulis peringatan keras di log deploy bila berjalan di
   Vercel tanpa `DATABASE_URL`.
4. `<StorageWarning />` menampilkan pita merah di setiap halaman aplikasi —
   tidak bisa ditutup.

Health check sekarang melaporkan `storageDetail: "writable"` (hasil uji) atau
`status: "degraded"` bila gagal.

### 2.3 Cakupan test: 49/49 server action

| | Sebelum | Sesudah |
| --- | --- | --- |
| Server action diuji | 6 / 49 | **49 / 49** |
| Total test | 163 | **394** |
| Berkas test | 13 | **19** |

### 2.4 Lima belas bug yang ditemukan & diperbaiki

Ditemukan oleh tiga peninjau independen yang menulis test terhadap perilaku
sebenarnya, bukan terhadap asumsi.

| # | Bug | Dampak |
| --- | --- | --- |
| 1 | 8 aksi hapus tidak memfilter ruang | Data ruang lain bisa dihapus |
| 2 | `clearCheckedShopping` tanpa sesi & tanpa ruang | Daftar belanja ruang lain terhapus |
| 3 | `removeBudget` tanpa filter ruang | Anggaran ruang lain bisa dihapus |
| 4 | `NaN` lolos validasi angka | **Data rusak permanen** (`savedAmount`, `remaining`, `currentValue` jadi `NaN`) |
| 5 | `invalidReference` menolak semua `memberId` | **Regresi saya sendiri** — fitur "tujuan untuk anak" mati |
| 6 | `setBudget` tanpa validasi kategori | Anggaran merujuk kategori ruang lain / id hantu |
| 7 | `createBill` menerima kategori pemasukan | Inkonsisten: tagihan selalu dibukukan pengeluaran |
| 8 | `createCategory` cek duplikat lintas ruang | Nama kategori ruang pribadi menghalangi ruang lain |
| 9 | `payBill` tanpa validasi tanggal | `"kemarin-sore"` tersimpan, merusak laporan bulanan |
| 10 | `createAccount` tanpa validasi `ownerMemberId` | Merujuk anggota tak ada |
| 11 | Kategori terarsip masih bisa dipakai | Arsip tidak berfungsi |
| 12 | `updateGoalStatus` menerima status apa pun | Status sampah tersimpan |
| 13 | `createHealthRecord` tanpa cek anggota & tanggal nyata | `"2026-13-45"` lolos |
| 14 | `createEducationRecord` terima `goalId` lintas ruang | Rujukan silang antar ruang |
| 15 | Aksi hapus selalu `ok: true` meski id tak ada | Sukses palsu, UI tak bisa membedakan |

Ditambah dua celah keamanan:

**DoS lintas akun.** `selectProfileAction` mencatat kegagalan PIN **sebelum**
memeriksa kepemilikan profil. Akun mana pun bisa mengunci PIN profil akun lain
hanya dengan mengirim `profileId` orang itu. Sekarang kepemilikan diperiksa
lebih dulu.

**Open redirect.** Penjaga `next.startsWith("/")` meloloskan `//evil.example`,
yang oleh browser dibaca sebagai situs lain. Sekarang `safeNextPath()` menolak
`//` dan `/\`.

### 2.5 Pesan validasi berbahasa Inggris

Enam pesan zod (`"Too small: expected number to be >=0"`) bocor ke pengguna.
Semua sudah diterjemahkan.

---

## 3. Yang BELUM selesai — dan ini yang menahan 10/10

### 3.1 Database belum terhubung (blocker)

Ini masalah utama dan tidak berubah dari audit sebelumnya.

| | |
| --- | --- |
| `drizzle/0000_init.sql` | ada, 5 tabel |
| `src/lib/db/schema.ts` | ada, 5 tabel |
| Dipakai `queries.ts`/`actions.ts` | **tidak sama sekali** |
| `DATABASE_URL` | tidak diisi |

Skema Drizzle hanya memuat 5 tabel (`households`, `members`, `users`,
`auditLogs`, `contactMessages`) — bukan 17 entitas yang dipakai aplikasi. Jadi
bahkan bila `DATABASE_URL` diisi hari ini, aplikasi tetap memakai store memori.

**Konsekuensi:** di Vercel, setiap cold start menghapus seluruh data pengguna.

**Yang dibutuhkan:** migrasi 17 koleksi ke Postgres, ubah `queries.ts` dan
`actions.ts` memakai Drizzle, dan tangani transaksi database untuk operasi yang
menyentuh beberapa tabel (mis. `payBill` menulis transaksi + pembayaran tagihan
+ menggeser tanggal jatuh tempo).

Ini pekerjaan besar — bukan tambalan satu jam.

### 3.2 Rate limit belum persisten

Sudah berfungsi, tetapi hitungannya hilang saat restart dan tidak dibagi antar
instance. Untuk produksi: ganti `buckets()` dengan Redis.

### 3.3 Belum ada uji beban / konkurensi

Store ditulis ulang seluruhnya setiap mutasi. Dua penulisan bersamaan pada
instance yang sama bisa saling menimpa (yang terakhir menang). Belum diuji dan
belum ditangani.

### 3.4 Celah kecil yang tersisa

| Hal | Catatan |
| --- | --- |
| `hashPin()` tidak memvalidasi `PIN_PATTERN` | Tidak bisa dieksploitasi (`verifyPin` menjaga), tapi mengundang salah pakai |
| `createAccount` selalu `isShared: true` | Janggal di ruang pribadi |
| `archiveAccount` menghitung transaksi batal | Mungkin disengaja, belum dipastikan |
| Belum ada edit transaksi | Hanya batalkan lalu catat ulang |
| UI buat workspace & undang anggota | Logika siap, form belum |
| `workspaceId` masih opsional di tipe | Ditutup lewat test invariant, bukan lewat tipe |

---

## 4. Bukti verifikasi

| Pemeriksaan | Hasil |
| --- | --- |
| `pnpm exec tsc --noEmit` | bersih |
| `pnpm lint` | bersih |
| `pnpm test` | **394 lulus** (19 berkas) |
| `pnpm build` | sukses |
| Cakupan server action | **49/49** |
| Audit 19 halaman | 19/19, 0 error konsol |
| Audit responsif | 0 luapan (19 halaman × 390/768/1440) |
| E2E alur transaksi | 17/17 |
| Health check | `storage: ok, storageDetail: writable` |

Test invariant baru (`tests/data-invariants.test.ts`, 41 test) menjaga:
- setiap entitas punya `workspaceId` yang menunjuk ruang nyata
- setiap transaksi punya pencatat yang sah
- setiap profil punya tepat satu ruang pribadi
- ruang pribadi tidak berisi profil lain

---

## 5. Jawaban jujur

**Frontend: 9/10.** Terverifikasi menyeluruh. Yang menahan angka 10: belum ada
uji aksesibilitas otomatis (axe), dan beberapa halaman belum ditata sedalam
dashboard.

**Backend logika: 9/10.** 49/49 aksi teruji, 15 bug diperbaiki, dua celah
keamanan ditutup. Yang menahan: belum ada uji konkurensi.

**Backend penyimpanan: 3/10.** Data tidak bertahan di produksi.

**Keseluruhan: belum 10/10, dan tidak akan sampai database tersambung.**

Saya bisa menaikkan banyak angka lain hari ini, tetapi selama data pengguna
hilang setiap restart, aplikasi ini belum layak dijual — berapa pun skor
bagian lainnya.

---

## 6. Urutan yang saya sarankan

1. **Sambungkan Postgres** — 17 koleksi, ganti seluruh lapisan data. Ini yang
   membuka jalan ke 10/10.
2. Rate limit persisten (Redis).
3. Uji konkurensi setelah database ada.
4. Uji aksesibilitas otomatis (axe) untuk menutup sisa frontend.
5. Edit transaksi, UI undang anggota.

Butir 1 adalah prasyarat. Sisanya bisa dikerjakan bertahap setelah itu.

# 22 — Verifikasi Frontend & Backend

> Diperbarui: 2026-10-21
> Tujuan: memastikan lapisan tampilan **dan** lapisan data benar-benar bekerja,
> bukan hanya lolos typecheck.

Dokumen ini mencatat apa yang diperiksa, apa yang rusak, dan bagaimana
kerusakannya ditemukan. Beberapa bug di sini **tidak terdeteksi** oleh
`tsc`/`lint`/`build` karena `workspaceId` dibuat opsional.

---

## 1. Ringkasan hasil

| Lapisan | Status |
| --- | --- |
| Typecheck | bersih |
| Lint | bersih |
| Unit test | **153 lulus** (12 berkas) |
| Build produksi | sukses |
| Alur login → profil → PIN → aplikasi | berhasil |
| Aksi create menyimpan ke ruang aktif | **diperbaiki & diuji** |
| Isolasi antar ruang | **diperbaiki & diuji** |
| Pindah ruang (workspace switch) | berhasil |
| Dropdown pemilih ruang | **diperbaiki** |
| Kelola anggota (tambah/ubah/nonaktif/hapus) | **baru & diuji** |
| Sidebar (desktop + mobile) | **dirapikan** |

---

## 2. Bug kritis: aksi create tidak menyimpan `workspaceId`

### Gejala

Setelah model multi-ruang ditambahkan, seluruh query memfilter berdasarkan
`workspaceId`. Tetapi **semua server action yang membuat data tidak mengisi
field itu**. Akibatnya:

- Data tersimpan di memori/berkas, tetapi tidak muncul di halaman mana pun.
- Dashboard tampak `Rp0` padahal pengguna baru saja mencatat transaksi.
- Tidak ada pesan error — aplikasi berkata "Transaksi tersimpan."

### Kenapa lolos dari typecheck

`workspaceId` dideklarasikan **opsional**:

```ts
workspaceId?: string;
```

Alasan awalnya untuk kompatibilitas data lama. Konsekuensinya TypeScript tidak
memaksa pengisian, sehingga 19 titik `.push()` lolos tanpa penanda ruang.

### Perbaikan

1. Helper `currentScope()` mengembalikan `{ workspaceId, profileId }` dari sesi.
2. Setiap aksi tulis memanggilnya lebih dulu; bila sesi tidak valid, aksi gagal
   dengan pesan jelas.
3. Setiap entitas baru membawa `workspaceId` **dan** `recordedByProfileId`.

### Bukti

Diuji lewat aplikasi: mencatat transaksi `UJI E2E SIMPAN` Rp77.000.

- Sebelum perbaikan: total pengeluaran tetap Rp3.780.000, transaksi tidak muncul.
- Sesudah perbaikan: total menjadi **Rp3.857.000**, jumlah transaksi 10 → 11.
- Berkas tersimpan memuat `workspaceId: "ws-family"` dan
  `recordedByProfileId: "p-irvan"`.

---

## 3. Bug kritis: aksi ubah/hapus tidak memverifikasi ruang

### Gejala

Aksi seperti `voidTransaction`, `deleteDebt`, `payBill` mencari entitas dengan
`find(x => x.id === id)` — **tanpa memeriksa ruang**. Siapa pun yang mengetahui
sebuah id bisa mengubah data milik ruang lain, termasuk ruang pribadi orang lain
di akun yang sama.

### Perbaikan

Helper `findScoped(rows, id, workspaceId)`:

```ts
function findScoped<T extends { id: string; workspaceId?: string }>(
  rows: T[], id: string, workspaceId: string,
): T | undefined {
  return rows.find((row) => row.id === id && row.workspaceId === workspaceId);
}
```

Diterapkan pada 20 aksi mutasi.

---

## 4. Bug: kebocoran anggaran ke ruang pribadi

### Gejala

Di ruang pribadi "Ruang Irvan", panel **Anggaran bulan ini** menampilkan anggaran
milik ruang keluarga (Belanja Dapur Rp2.500.000, Makan di Luar, Transportasi).

### Penyebab

`budgetRows()` memfilter transaksi berdasarkan ruang, tetapi **tidak** memfilter
koleksi `budgets`:

```ts
return store.budgets
  .filter((b) => b.month === month)   // ← tidak ada filter workspace
```

### Perbaikan

```ts
return store.budgets
  .filter((b) => (viewer ? b.workspaceId === viewer.workspaceId : true))
  .filter((b) => b.month === month)
```

Sekarang ruang pribadi menampilkan "Belum ada anggaran bulan ini" dan
"Sisa anggaran Rp0 dari Rp0".

---

## 5. Bug UI: dropdown pemilih ruang tembus pandang

### Gejala

Menu dropdown pemilih ruang terlihat transparan; teks menu sidebar di belakangnya
menembus dan membuat teks bertumpuk.

### Penyebab

Dua hal sekaligus:

1. **Konteks stacking.** Header sidebar tidak punya `position: relative`, sehingga
   dropdown ber-`z-30` kalah oleh elemen menu yang datang belakangan di DOM.
2. **`.surface` kalah oleh utilitas.** Kelas komponen `.surface` mendefinisikan
   `background-color`, tetapi di Tailwind v4 utilitas menang atas `@layer
   components`. Karena elemen itu juga memakai kelas utilitas lain, latarnya
   tidak diterapkan seperti yang diharapkan.

### Perbaikan

- Header dan footer sidebar diberi `relative z-40` sebagai konteks stacking.
- Dropdown memakai utilitas langsung: `rounded-[14px] border border-line-strong
  bg-card p-1.5 shadow-[var(--shadow-lift)]`, bukan `.surface`.

### Pelajaran

`.surface` dan `.menu-item` tetap dipakai di tempat lain yang tidak bertumpuk
dengan utilitas. Untuk elemen yang butuh latar solid di atas konten lain, pakai
utilitas `bg-*` langsung.

---

## 6. Test yang ditambahkan

### `tests/workspace-isolation.test.ts` — 15 test

Audit sistematis: setiap query dijalankan untuk ruang keluarga dan ruang pribadi,
lalu diperiksa bahwa hasilnya hanya berisi entitas dari ruang tersebut.

Mencakup: akun, kategori, anggaran, tagihan, tujuan, utang, aset, asuransi,
dokumen, kesehatan, pendidikan, tugas, belanja, transaksi, ringkasan bulan,
kekayaan bersih.

Test ini yang menangkap kebocoran anggaran.

### `tests/workspace-scoping.test.ts` — 8 test

Menjaga bug aslinya:

- Entitas tanpa `workspaceId` **tidak muncul** di ruang mana pun.
- Entitas dengan `workspaceId` muncul hanya di ruang yang tepat.
- Ringkasan bulan dan saldo tidak mencampur ruang.
- Visibilitas `private` hanya untuk pencatatnya.
- `workspaceId` bertahan setelah simpan → muat ulang.

---

## 7. Kelola anggota (baru)

Sebelumnya anggota hanya bisa **ditambah** lewat `/keluarga/anggota`. Tidak ada
cara mengubah, menonaktifkan, atau menghapus.

Sekarang pengelolaannya menyatu di **Pengaturan** (`MemberManager`):

| Aksi | Aturan |
| --- | --- |
| Tambah | Nama wajib; peran, hubungan, tanggal lahir, warna avatar |
| Ubah | Nama, peran, hubungan, tanggal lahir, warna |
| Nonaktifkan | Riwayat tetap utuh; anggota hilang dari daftar pilihan |
| Hapus | **Ditolak** bila masih terhubung catatan apa pun |

### Kenapa hapus sering ditolak

Menghapus anggota memutus jejak "siapa melakukan apa". Karena itu `deleteMember`
menghitung rujukan ke transaksi, tujuan, agenda, tugas, akun, dokumen, kesehatan,
pendidikan, dan asuransi. Bila ada, aksi ditolak dengan pesan:

> Bima masih terhubung ke 4 catatan. Nonaktifkan saja agar riwayat tetap utuh.

### Pengaman pemilik

Keluarga tidak boleh kehilangan pemiliknya. Ketiga aksi (ubah peran, nonaktifkan,
hapus) menolak bila hasilnya menyisakan nol pemilik aktif.

### Rute lama

`/keluarga/anggota` kini mengalihkan ke `/keluarga/pengaturan` agar tautan dan
markah buku tidak rusak. Menu "Anggota" dihapus dari sidebar supaya tidak ada dua
tempat untuk hal yang sama.

---

## 8. Perbaikan sidebar

| Masalah | Perbaikan |
| --- | --- |
| Scrollbar Windows lebar dan terang | Kelas `.scroll-thin` — 6px, warna samar, menguat saat hover |
| Grup terlipat terasa kosong | Angka jumlah menu ditampilkan di kanan |
| Jarak antar-grup terlalu lega | `space-y-2` → `space-y-1`, padding judul dirapatkan |
| Grup aktif tidak menonjol | Judul grup aktif berwarna `ink`, lainnya `muted` |
| Item aktif kurang tegas | Font `bold`, bayangan halus, bar kiri 3px |
| Pemilih ruang tidak ada di mobile | Ditambahkan ke drawer mobile |

---

## 9. Kontras yang diperbaiki

Tombol konfirmasi destruktif memakai `bg-tomato` (#e2563c) dengan teks putih —
hanya **3.73:1**, gagal WCAG AA untuk teks normal. Diganti `bg-tomato-deep`
(#c2402a) → **5.17:1**.

---

## 10. Yang masih perlu dikerjakan

| Hal | Dampak |
| --- | --- |
| `workspaceId` masih opsional di tipe | TypeScript tidak akan menangkap pengisian yang terlewat. Pertimbangkan menjadikannya wajib setelah data lama dimigrasi. |
| Rate limit PIN | 10.000 kemungkinan tanpa pembatasan — lihat [21-profil-workspace.md](21-profil-workspace.md) bagian 3 |
| UI buat workspace & undang anggota | Logika siap, form belum ada |
| Skema Postgres belum memuat profil/workspace | Migrasi DB belum mengikuti model baru |
| E2E Playwright | Verifikasi alur masih manual + unit test |

### Rekomendasi berikutnya

Jadikan `workspaceId` **wajib** di semua tipe entitas, lalu hapus fallback
`workspaceId ? … : true` di query. Dengan begitu, kelalaian pengisian menjadi
error saat build, bukan bug diam-diam.

---

## 11. Cara memverifikasi ulang

```bash
pnpm exec tsc --noEmit     # tipe
pnpm lint                  # gaya
pnpm test                  # 153 test
pnpm build                 # produksi
pnpm dev --port 3100
```

Manual:

1. Masuk → pilih Irvan → PIN `1234`.
2. Catat transaksi baru; pastikan muncul dan total berubah.
3. Ganti ke **Ruang Irvan**; pastikan anggaran, tagihan, utang, aset kosong.
4. Kembali ke **Keluarga Irvan**; pastikan data keluarga kembali.

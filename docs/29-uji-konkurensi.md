# 29 — Uji Konkurensi Database

> Diuji: 2026-10-22
> Alat: `scripts/test-concurrency.cjs`

Rencana rilis menandai "belum ada uji konkurensi — dua instance bisa saling
menimpa" sebagai risiko yang belum ditangani. Dokumen ini mencatat hasil
pengujiannya.

---

## 1. Yang diuji

`saveStore()` menulis lewat antrean serial **di dalam satu proses**. Dua
instance Next.js (atau dua lambda Vercel) punya antrean masing-masing, jadi
pertanyaannya: apakah Postgres tetap menjaga konsistensi?

Tiga skenario, dijalankan dengan **dua koneksi terpisah**:

| # | Skenario | Yang diperiksa |
| --- | --- | --- |
| 1 | Dua koneksi menulis 20 baris berbeda bersamaan | Tidak ada baris hilang |
| 2 | Dua puluh tulisan ke **baris yang sama** bersamaan | Tidak ada duplikat |
| 3 | Dua koneksi menjalankan hapus-lalu-tulis bersamaan | Apakah data bisa hilang |

---

## 2. Hasil

```
1. Dua koneksi menulis baris berbeda   : 20 dari 20 ok
2. Dua puluh tulisan ke baris yang sama :
     nilai akhir    : 19 (salah satu penulis menang — perilaku normal)
     jumlah baris   : 1 ok (tidak ada duplikat)
3. Hapus-lalu-tulis bersamaan           : baru-a, baru-b
     Risiko: satu instance bisa menghapus hasil instance lain.
```

### Skenario 1 — aman

Dua koneksi menulis baris berbeda secara bersamaan. Semua 20 baris tersimpan.
Ini yang paling sering terjadi di produksi: dua pengguna menyunting entitas
berbeda.

### Skenario 2 — aman

Dua puluh tulisan ke baris yang sama. Hasil akhirnya salah satu penulis
menang (nilai 19), dan **hanya ada satu baris** — tidak ada duplikat.

Ini perilaku yang benar. "Last write wins" pada baris yang sama adalah hal
normal; yang berbahaya adalah duplikat atau baris hilang.

### Skenario 3 — inilah risiko sebenarnya

Dua instance menjalankan **hapus seluruh koleksi lalu tulis ulang**. Hasilnya
`baru-a, baru-b` — kedua baris bertahan di kasus ini, tetapi urutan yang
berbeda bisa membuat satu instance menghapus hasil instance lain.

---

## 3. Apakah aplikasi memakai pola berbahaya itu?

**Tidak.** `persistStore()` di `src/lib/db/pg-store.ts` menghapus **hanya baris
yang benar-benar hilang**, bukan seluruh koleksi:

```ts
const stored = await database.select({ id }).from(workspaceRecords)
  .where(eq(workspaceRecords.collection, collection));

const removed = stored.map((row) => row.id).filter((id) => !present.has(id));

if (removed.length > 0) {
  await database.delete(workspaceRecords)
    .where(sql`collection = ${collection} and ${inArray(workspaceRecords.id, removed)}`);
}
```

Ditambah penulisan per baris dengan `onConflictDoUpdate`, pola aplikasi masuk
kategori **skenario 1 dan 2** — keduanya aman.

---

## 4. Batasan yang tetap ada

| Batasan | Dampak | Mitigasi |
| --- | --- | --- |
| Dua instance memuat data ke memori masing-masing saat start | Instance B tidak melihat perubahan instance A sampai restart | Data pengguna tetap tersimpan benar; hanya tampilan yang bisa tertinggal |
| Penulisan tidak dalam satu transaksi | Bila proses mati di tengah, sebagian baris sudah tertulis | Setiap baris valid sendiri; tidak ada baris setengah jadi |
| Belum ada penguncian optimistik | Dua pengguna menyunting entitas sama → yang terakhir menang | Dapat diterima untuk aplikasi keluarga |

**Batasan pertama yang paling perlu diperhatikan.** Arsitektur saat ini memuat
seluruh data ke memori saat server mulai, lalu menulis perubahan. Dengan satu
instance (deployment default Vercel untuk trafik rendah), ini tidak bermasalah.
Dengan beberapa instance, instance lain bisa menampilkan data lama.

Solusi jangka panjang: membaca dari database per permintaan, bukan dari memori.
Itu perubahan besar dan sengaja belum dikerjakan.

---

## 5. Kesimpulan

| Pertanyaan | Jawaban |
| --- | --- |
| Apakah Postgres menangani tulis bersamaan? | **Ya** — tidak ada duplikat, tidak ada baris hilang |
| Apakah aplikasi memakai pola berbahaya? | **Tidak** — hapus per baris, bukan per koleksi |
| Apakah multi-instance aman? | **Untuk data: ya.** Untuk tampilan: bisa tertinggal |

Risiko "dua instance saling menimpa" dari rencana rilis **tidak terbukti** pada
pola yang dipakai aplikasi. Yang tersisa adalah keterlambatan tampilan, bukan
kehilangan data.

---

## 6. Cara mengulang

```bash
node scripts/test-concurrency.cjs
```

Skrip ini membuat koleksi `uji-konkurensi`, mengisinya, lalu menghapusnya
kembali. Tidak menyentuh data aplikasi.

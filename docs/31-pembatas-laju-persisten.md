# 31 — Pembatas Laju yang Bertahan Setelah Restart

> Diuji: 2026-10-22
> Alat: `scripts/prove-rate-limit-persistence.cjs`,
> `scripts/check-block-after-restart.cjs`

Rencana rilis menandai "rate limit di memori — hilang saat restart" sebagai
risiko yang belum ditangani. Dokumen ini mencatat penyelesaiannya.

---

## 1. Masalahnya

Hitungan percobaan gagal disimpan di `Map` dalam memori proses. Dua akibat:

| Akibat | Dampak |
| --- | --- |
| Hilang saat restart | Penyerang hanya perlu menunggu instance didaur ulang |
| Tidak dibagi antar instance | Dengan N instance, batas efektif jadi N kali lipat |

Di Vercel, instance diganti jauh lebih sering daripada server biasa — jadi
masalah pertama bukan teori.

---

## 2. Kenapa tidak sekadar mengganti `Map` dengan Postgres

Seluruh API pembatas laju bersifat **sinkron**:

```ts
checkRateLimit(rule, identifier)  → RateLimitResult
recordFailure(rule, identifier)   → RateLimitResult
resetRateLimit(rule, identifier)  → void
```

Membuatnya async berarti mengubah **11 pemanggil** di `actions.ts` — termasuk
alur login dan PIN, dua jalur yang paling tidak boleh salah. Setiap pemanggil
harus menjadi `await`, dan setiap test yang memanggilnya ikut berubah.

Risiko itu tidak sepadan untuk manfaatnya.

---

## 3. Yang dipilih

**Memori tetap menjadi sumber kebenaran saat permintaan berjalan** (cepat,
sinkron), lalu keadaannya **disalin ke Postgres** di latar belakang. Saat
server mulai, keadaan dimuat kembali.

```
recordFailure()  →  Map (sinkron, langsung berlaku)
                 ↘  schedulePersist()  →  app_state (latar belakang)

server start     →  restoreRateLimits()  →  Map
```

### Penulisan dibatasi 2 detik sekali

Tanpa batas ini, setiap percobaan gagal menulis ke database. Dengan 100
percobaan tebak sandi, itu 100 penulisan — pemborosan yang bisa dihindari
tanpa mengurangi keamanan: penyerang tetap harus menunggu jendela waktu, bukan
milidetik.

---

## 4. Bukti

### Blokir tersimpan di database

```
Kunci di app_state: …, rateLimits, …
rateLimits tersimpan: 1 kunci
  login:uji-blokir@contoh.id  hits=0  blocked=ya
```

### Blokir dipulihkan saat server mulai

```
[airevo] start · storage=postgres · email=outbox
[airevo] data dimuat dari Postgres
[airevo] 1 hitungan pembatas laju dipulihkan
```

### Blokir masih berlaku setelah restart

```
Login setelah restart dengan kata sandi salah:
  terkunci : ya
  pesan    : Terlalu banyak percobaan masuk. Coba lagi dalam sekitar 12 menit.

PERSISTENSI PEMBATAS LAJU OK — blokir bertahan setelah restart
```

Pesan "sekitar 12 menit" menunjukkan sisa waktu blokir ikut dipulihkan dengan
benar — bukan direset ke 15 menit penuh.

---

## 5. Batasan yang tetap ada

| Batasan | Dampak | Catatan |
| --- | --- | --- |
| Jeda penulisan 2 detik | Blokir bisa hilang bila server mati dalam 2 detik setelah percobaan terakhir | Sangat sempit; tidak bisa diandalkan penyerang |
| Tidak dibagi antar instance | Instance B tidak melihat hitungan instance A sampai restart | **Masih terbuka** |
| Hitungan lama dibuang setelah 1 jam | Wajar — jendela terpanjang adalah 1 jam | — |

**Batasan kedua masih nyata.** Untuk deployment multi-instance, solusi
sesungguhnya adalah membaca dari Postgres pada setiap pemeriksaan — yang
berarti mengubah API menjadi async.

Saat ini aplikasi berjalan di satu instance (deployment Vercel default untuk
trafik rendah), sehingga batas efektif tetap 5 percobaan.

---

## 6. Yang berubah

| Berkas | Isi |
| --- | --- |
| `src/lib/auth/rate-limit-store.ts` | Baru — simpan/muat ke `app_state` |
| `src/lib/auth/rate-limit.ts` | `schedulePersist()` + `restoreRateLimits()` |
| `src/instrumentation.ts` | Memanggil `restoreRateLimits()` saat mulai |
| `tests/rate-limit-persistence.test.ts` | 8 test |

---

## 7. Cara memverifikasi

```bash
# Unit test
pnpm exec vitest run tests/rate-limit-persistence.test.ts

# Bukti end-to-end (butuh server jalan di port 3100)
node scripts/prove-rate-limit-persistence.cjs   # memicu blokir
# restart server secara manual
node scripts/check-block-after-restart.cjs      # memastikan masih terkunci

# Bersihkan
node scripts/clean-rate-limits.cjs
```

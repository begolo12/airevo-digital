# 21 — Profil, PIN, dan Workspace

> Diperbarui: 2026-10-21
> Keputusan pemilik: **login seperti Netflix — 1 akun pembeli, banyak profil
> ber-PIN, masing-masing punya ruang data sendiri, plus maksimal 2 workspace
> bersama dengan undangan.**

Dokumen ini menjelaskan model multi-profil dan multi-workspace, cara kerjanya,
dan batasannya.

---

## 1. Model mental

```
Akun pembeli (1 email + kata sandi, 1 lisensi)
│
├── Profil Irvan (PIN)  ──►  Ruang Irvan (pribadi)
│                       └─►  Keluarga Irvan (bersama)  ◄─┐
│                                                        │ diundang
├── Profil Sari (PIN)   ──►  Ruang Sari (pribadi)        │
│                       └─►  Keluarga Irvan ─────────────┘
│
├── Profil Bima (PIN)   ──►  Ruang Bima (pribadi)
└── Profil Nara (PIN)   ──►  Ruang Nara (pribadi)
```

- **Akun** = pembelian. Satu email, satu kata sandi, satu lisensi.
- **Profil** = orang. Seperti profil di layanan streaming. Punya PIN dan avatar.
- **Ruang (workspace)** = tempat data. `personal` hanya untuk pemiliknya,
  `shared` untuk beberapa profil.

Angka di dashboard **hanya** berasal dari ruang yang sedang aktif.

---

## 2. Alur masuk

```
/login                  /pilih-profil              /keluarga
  email + sandi   ──►   pilih kartu profil   ──►   aplikasi
                        masukkan PIN
```

### Tahap sesi

Cookie sesi punya `stage`:

| Stage | Isi | Bisa apa |
| --- | --- | --- |
| `profile` | userId, email, role | Hanya membuka `/pilih-profil` |
| `active` | + profileId, workspaceId | Membuka seluruh aplikasi |

Cookie ditandatangani HMAC, jadi `stage` tidak bisa dinaikkan dari klien.
`requireSession()` mengalihkan sesi `profile` ke `/pilih-profil`.

### Kenapa PIN tidak menggantikan kata sandi

Kata sandi melindungi **pembelian**. PIN melindungi **privasi antar anggota
keluarga**. Keduanya berbeda ancaman:

- Kata sandi: orang luar yang ingin memakai aplikasi tanpa membeli.
- PIN: anggota keluarga yang ingin melihat catatan anggota lain.

---

## 3. PIN

- 4–6 angka, hanya digit (`PIN_PATTERN`).
- Disimpan sebagai hash scrypt dengan prefix `pin:` (lihat `src/lib/auth/password.ts`).
- Data contoh memakai PIN `1234`.
- Profil tanpa PIN langsung terbuka.

### Batas keamanan PIN (penting)

PIN 4 angka hanya punya 10.000 kemungkinan. Tanpa pembatasan percobaan, PIN bisa
ditebak dalam hitungan menit. **Saat ini belum ada rate limit pada percobaan PIN.**

Untuk produksi, minimal lakukan salah satu:

1. Batasi 5 percobaan per profil per 15 menit (butuh penyimpanan bersama, mis. Upstash).
2. Kunci profil setelah 10 percobaan gagal, buka lewat pemilik akun.
3. Naikkan panjang PIN menjadi 6 angka.

Ini tercatat sebagai pekerjaan yang belum selesai, bukan dianggap selesai.

---

## 4. Workspace

### Jenis

| Jenis | Dibuat | Anggota | Batas |
| --- | --- | --- | --- |
| `personal` | Otomatis saat profil dibuat | 1 (pemiliknya) | 1 per profil |
| `shared` | Manual oleh profil | Diundang | **Maksimal 2 per profil** |

Batas 2 mengikuti janji lisensi "1 keluarga", sementara tetap memberi ruang untuk
kasus seperti "rumah" dan "usaha keluarga".

### Peran di dalam workspace

| Peran | Bisa |
| --- | --- |
| `owner` | Semua, termasuk mengundang dan mengganti nama |
| `editor` | Mencatat dan mengubah data |
| `viewer` | Hanya membaca |

### Kode undangan

Workspace `shared` punya `inviteCode` (mis. `KLRG-IRVN`). Ruang pribadi tidak
punya kode undangan — itu yang mencegah orang lain masuk ke ruang pribadi.

---

## 5. Isolasi data

Ini bagian paling penting dan paling mudah salah.

### Dua lapis pemisahan

1. **Antar workspace.** Setiap entitas punya `workspaceId`. Semua query memfilter
   berdasarkan `viewer.workspaceId`. Ruang pribadi Irvan dan Sari tidak pernah
   bercampur, meski keduanya satu akun.
2. **Di dalam workspace.** Kolom `visibility` mengatur siapa yang boleh melihat:
   - `private` → hanya `recordedByProfileId`
   - `household` → semua kecuali anak
   - `shared` → semua anggota

### Fungsi kunci

```ts
canView(visibility, viewer, recorderProfileId)
```

Memisahkan "privat di dalam ruang" dari "ruang berbeda". Tanpa parameter
`recorderProfileId`, aturan `private` tidak bisa ditegakkan.

### Konsekuensi yang perlu disadari

Kalau dua profil berada di workspace bersama, dan salah satunya mencatat dengan
visibilitas `private`, profil lain **tidak melihat catatan itu** meski berada di
ruang yang sama. Untuk data yang ingin dilihat bersama, pilih `household` atau
`shared`.

---

## 6. Atribusi pencatat

Setiap entitas punya `recordedByProfileId`. Di UI ditampilkan sebagai
"dicatat oleh …". Ini menjawab pertanyaan yang muncul di workspace bersama:
"siapa yang mencatat pengeluaran ini?".

Field ini juga dipakai untuk menegakkan visibilitas `private`.

---

## 7. Struktur data

```ts
type Profile = {
  id: string;
  accountId: string;        // akun pembeli
  name: string;
  initial: string;          // avatar
  role: Role;               // owner | adult | teen | child | viewer
  pinHash?: string;         // scrypt, prefix "pin:"
  color: string;
  isAccountOwner: boolean;  // boleh mengelola profil lain
};

type Workspace = {
  id: string;
  name: string;
  type: "personal" | "shared";
  ownerProfileId: string;
  inviteCode?: string;      // hanya shared
  color: string;
};

type WorkspaceMember = {
  workspaceId: string;
  profileId: string;
  role: "owner" | "editor" | "viewer";
  joinedAt: string;
};
```

Semua entitas data (`transactions`, `accounts`, `bills`, `goals`, `documents`,
`healthRecords`, dst.) mendapat dua field:

```ts
workspaceId?: string;
recordedByProfileId?: string;
```

Keduanya **opsional** untuk kompatibilitas data lama. `migrate()` di
`store.ts` menambal berkas lama: entri tanpa `workspaceId` dianggap milik
workspace bersama pertama.

---

## 8. Antarmuka

### Pemilih ruang (puncak sidebar)

Menampilkan ruang aktif dan profil yang sedang dipakai. Saat dibuka:

- **Ruang bersama** — daftar workspace `shared` beserta jumlah anggota
- **Ruang pribadi** — daftar workspace `personal`
- **Profil** — tombol "Ganti profil" untuk kembali ke layar pilih profil

### Sidebar collapsed secara default

Saat pertama kali dibuka, semua grup **terlipat** kecuali yang memuat halaman
aktif. Tujuannya: 21 menu sekaligus membuat mata lelah. Status lipatan disimpan
di `localStorage` setelah pengguna mengubahnya.

### Pindah ruang tanpa keluar

`switchWorkspaceAction` menulis ulang cookie sesi dengan `workspaceId` baru, lalu
`revalidatePath("/keluarga")`. Tidak perlu login ulang.

---

## 9. Batas dan pekerjaan yang belum selesai

| Hal | Status | Catatan |
| --- | --- | --- |
| Rate limit PIN | **Belum** | Lihat bagian 3 — ini lubang keamanan nyata |
| Undang anggota lewat UI | Belum | `findWorkspaceByInviteCode` sudah ada, formnya belum |
| Buat workspace bersama lewat UI | Belum | Logika + batas sudah ada |
| Ganti nama/hapus workspace | Belum | — |
| Pindahkan data antar ruang | Belum | — |
| Kelola profil (tambah/hapus) | Belum | Profil masih dari seed |
| Lupa PIN | Belum | Idealnya pemilik akun bisa mereset |
| Sinkronisasi ke Postgres | Belum | Skema DB belum memuat tabel profil/workspace |

Semua yang bertanda "Belum" adalah pekerjaan berikutnya, bukan hal yang
tersembunyi.

---

## 10. Cara menguji

1. Masuk dengan `irvan@airevo-digital.my.id` / `airevo123`.
2. Pilih profil **Irvan**, PIN `1234`.
3. Perhatikan pemilih ruang: **Keluarga Irvan · 2 anggota** (bersama).
4. Ganti ke **Ruang Irvan** — dashboard jadi kosong kecuali catatan pribadi.
5. Buka menu profil → **Ganti profil** → pilih **Sari** → PIN `1234`.
6. Sebagai Sari, buka **Dokumen**: dokumen bertanda `private` milik Irvan hilang.

---

## 11. Verifikasi

| Pemeriksaan | Hasil |
| --- | --- |
| `pnpm lint` | bersih |
| `pnpm typecheck` | bersih |
| `pnpm test` | 118 lulus (9 berkas) |
| `pnpm build` | sukses, `/pilih-profil` terdaftar |
| Login → pilih profil → PIN → dashboard | berhasil |
| Sidebar terlipat saat pertama dibuka | terbukti |
| Pemilih ruang menampilkan anggota | terbukti |
| PIN tersimpan sebagai hash | diuji |
| Batas 2 workspace bersama | diuji |
| Kode undangan tidak peka huruf besar | diuji |
| Isolasi ruang pribadi vs bersama | diuji |

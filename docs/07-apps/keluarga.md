# 07 — Aplikasi Keluarga

> **Status:** Scope aktif — dibangun di proyek ini
> **Path:** `/keluarga`
> **Tujuan:** satu tempat untuk mengelola rumah tangga: uang, rencana, waktu, catatan, dan belanja.
> **Bahasa UI:** Indonesia
> **Mata uang:** IDR
> **Zona waktu:** `Asia/Jakarta`

---

## 1. Masalah

Rumah tangga modern mengelola banyak hal sekaligus, dan hampir semuanya tersebar:

- Keuangan di beberapa rekening, e-wallet, dan catatan manual.
- Tagihan rutin diingat sendiri; sering telat atau dobel bayar.
- Target besar (dana darurat, sekolah anak, rumah, pensiun) tidak pernah dihitung serius.
- Agenda keluarga ada di kalender berbeda-beda.
- Dokumen penting (KK, akta, polis, ijazah) tersimpan di folder yang sulit dicari.
- Pembagian tugas rumah tidak jelas.
- Anak tidak tahu kondisi keuangan keluarga, orang tua tidak punya cara aman melibatkan mereka.

Aplikasi Keluarga menyatukan semuanya dengan satu prinsip: **tenang, jelas, dan bisa dipercaya**.

---

## 2. Pengguna dan peran

Satu household = satu keluarga.

| Peran | Siapa | Hak |
| --- | --- | --- |
| `owner` | Orang tua utama / pemilik akun | Semua, termasuk undang anggota, hapus data, pengaturan |
| `adult` | Pasangan / anggota dewasa | CRUD keuangan, rencana, kalender, tugas, dokumen; tidak bisa hapus household |
| `teen` | Anak remaja | Lihat ringkasan, catat pengeluaran pribadi, lihat tugas & kalender, lihat tujuan yang dibagikan |
| `child` | Anak | Lihat tugas, kalender, dan tujuan yang dibagikan; tidak melihat keuangan |
| `viewer` | Kakek/nenek, anggota keluarga lain | Read-only pada bagian yang dibagikan |

### Privasi berlapis

Setiap transaksi, dokumen, dan catatan punya `visibility`:

| Nilai | Arti |
| --- | --- |
| `household` | Terlihat semua anggota dewasa |
| `shared` | Terlihat semua anggota, termasuk anak |
| `private` | Hanya pembuat dan owner |

Ini yang membuat aplikasi keluarga terasa aman: orang tua bisa mencatat hal sensitif tanpa menyembunyikan seluruh aplikasi.

---

## 3. Jobs to be done

- "Saat saya bayar sesuatu, saya ingin mencatatnya dalam hitungan detik."
- "Saat awal bulan, saya ingin tahu ke mana uang bulan lalu pergi."
- "Saat tagihan listrik jatuh tempo, saya ingin diberi tahu sebelum, bukan sesudah."
- "Saat anak masuk sekolah, saya ingin tahu apakah dana pendidikannya cukup."
- "Saat ada uang lebih, saya ingin tahu harus ditaruh ke tujuan yang mana."
- "Saat ada acara keluarga, saya ingin semua orang tahu."
- "Saat butuh dokumen, saya ingin menemukannya dalam 10 detik."
- "Saat anak minta uang jajan, saya ingin tahu sisa anggaran minggu ini."

---

## 4. Enam pilar

```text
Keluarga
├── Uang        akun, transaksi, anggaran, tagihan, utang, aset, asuransi
├── Rencana     tujuan, dana darurat, pendidikan, rumah, pensiun, alokasi
├── Waktu       kalender, ulang tahun, agenda, tugas rumah
├── Catatan     dokumen, kesehatan, pendidikan
├── Belanja     daftar belanja, kebutuhan bulanan
└── Laporan     cashflow, net worth, kepatuhan anggaran, progres tujuan
```

---

## 5. Scope

### MVP (Fase A + B)

**Fase A — inti keuangan**

- Household dan anggota.
- Akun (kas, bank, e-wallet, tabungan).
- Kategori pemasukan/pengeluaran.
- Transaksi: income, expense, transfer.
- Anggaran bulanan per kategori.
- Tagihan rutin dan status pembayaran.
- Tujuan keuangan dan kontribusi.
- Dashboard keluarga.

**Fase B — ritme harian**

- Kalender keluarga.
- Tugas rumah.
- Daftar belanja.
- Laporan bulanan dan net worth.

### Fase C — kedalaman

- Dokumen keluarga (dengan file privat).
- Catatan kesehatan.
- Catatan pendidikan anak.
- Utang dan piutang.
- Aset dan inventaris.
- Asuransi.
- Proyeksi jangka panjang.
- Undangan anggota dan role.

### Tidak termasuk

- Sinkronisasi bank otomatis.
- Multi-currency.
- Akuntansi double-entry penuh.
- Pajak dan pelaporan resmi.
- Portal publik.
- Aplikasi mobile native.
- Realtime collaboration.
- Split bill antar keluarga.

---

## 6. Layar

### 6.1 Dashboard `/keluarga`

Tujuan: menjawab **"bagaimana kondisi keluarga hari ini?"** dalam satu layar.

Isi:

1. **Sapaan kontekstual** — "Selamat pagi, Irvan. 3 tagihan jatuh tempo minggu ini."
2. **Kartu utama** — saldo gabungan, pemasukan bulan ini, pengeluaran bulan ini, sisa anggaran.
3. **Arus kas** — grafik 6 bulan.
4. **Anggaran** — 3–5 kategori dengan progress dan status.
5. **Tujuan** — progress tujuan terdekat.
6. **Tagihan terdekat** — daftar dengan tanggal dan jumlah.
7. **Agenda** — 3 acara terdekat.
8. **Tugas** — tugas belum selesai per anggota.
9. **Quick add** — tombol besar "Catat transaksi".

Aturan tampilan:

- Angka besar, satu fokus utama (sisa anggaran atau saldo).
- Warna status selalu disertai label.
- Tidak menampilkan data anak kecuali `shared`.

### 6.2 Keuangan `/keluarga/keuangan`

Ringkasan: saldo per akun, pemasukan/pengeluaran, tautan ke sub-halaman.

### 6.3 Transaksi `/keluarga/keuangan/transaksi`

- Tabel: tanggal, deskripsi, kategori, akun, tipe, jumlah, anggota, aksi.
- Filter: bulan, tipe, akun, kategori, anggota, pencarian.
- Tombol "Catat transaksi" membuka sheet/dialog cepat.
- Form:
  - Tipe: pemasukan / pengeluaran / transfer.
  - Tanggal.
  - Jumlah (input rupiah).
  - Akun (dan akun tujuan untuk transfer).
  - Kategori.
  - Deskripsi.
  - Anggota terkait (opsional).
  - Visibilitas.
- Edit, void, duplikat.
- Pagination dan total di footer.

### 6.4 Akun `/keluarga/keuangan/akun`

- Kartu akun: nama, tipe, saldo, warna/ikon.
- Tambah/edit/arsip.
- Saldo awal.
- Akun tidak bisa dihapus jika punya transaksi; arsipkan.

### 6.5 Kategori `/keluarga/keuangan/kategori`

- Tab pemasukan/pengeluaran.
- Nama, warna, ikon.
- Kategori default disiapkan saat household dibuat.
- Arsip, bukan hapus.

### 6.6 Anggaran `/keluarga/keuangan/anggaran`

- Pilih bulan.
- Daftar kategori pengeluaran: anggaran, terpakai, sisa, progress.
- Status: aman (< 80%), waspada (80–100%), lewat (> 100%).
- Tambah/edit anggaran.
- Total anggaran vs total pengeluaran.
- Salin anggaran bulan lalu (fase B).

### 6.7 Tagihan `/keluarga/keuangan/tagihan`

- Daftar tagihan: nama, jumlah, jatuh tempo, frekuensi, status.
- Status: `upcoming`, `due`, `paid`, `overdue`, `skipped`.
- Aksi: tandai dibayar (membuat transaksi otomatis), lewati, edit.
- Pengingat H-3 dan H-0 (fase B).
- Riwayat pembayaran.

### 6.8 Utang & piutang `/keluarga/keuangan/utang` (fase C)

- Tipe: `payable` (kita berutang) / `receivable` (orang berutang).
- Pihak, pokok, sisa, bunga, cicilan, jatuh tempo.
- Pembayaran mengurangi sisa dan membuat transaksi.

### 6.9 Aset `/keluarga/keuangan/aset` (fase C)

- Tipe: kas, properti, kendaraan, emas, investasi, lainnya.
- Nilai perolehan, nilai kini, tanggal, catatan.
- Total aset di net worth.

### 6.10 Rencana `/keluarga/rencana`

Daftar tujuan:

| Tipe | Contoh |
| --- | --- |
| `emergency_fund` | Dana darurat 6 bulan |
| `education` | Kuliah anak |
| `home` | DP rumah |
| `vehicle` | Mobil |
| `retirement` | Pensiun |
| `hajj` | Haji/umrah |
| `wedding` | Pernikahan |
| `vacation` | Liburan |
| `custom` | Lainnya |

Setiap tujuan:

- Target nominal.
- Target tanggal.
- Terkumpul.
- Kontribusi bulanan yang disarankan.
- Progress dan proyeksi: "dengan Rp1.500.000/bulan, tercapai 4 bulan lebih lambat".
- Kontribusi (riwayat).
- Visibilitas (bisa dibagikan ke anak).

### 6.11 Detail tujuan `/keluarga/rencana/[id]`

- Ringkasan dan progress.
- Kalkulator: ubah target tanggal → lihat kontribusi yang dibutuhkan.
- Riwayat kontribusi.
- Tautan ke akun sumber.

### 6.12 Kalender `/keluarga/kalender` (fase B)

- Tampilan bulan, minggu, agenda.
- Tipe acara: ulang tahun, anniversary, sekolah, dokter, keluarga, lainnya.
- Anggota terkait.
- Pengulangan tahunan untuk ulang tahun.
- Tambah/edit/hapus.

### 6.13 Tugas `/keluarga/tugas` (fase B)

- Daftar tugas rumah: cuci piring, buang sampah, belanja, bersih-bersih.
- Penanggung jawab (anggota).
- Frekuensi: sekali, harian, mingguan, bulanan.
- Status: belum, dikerjakan, selesai.
- Poin (opsional) untuk anak.

### 6.14 Belanja `/keluarga/belanja` (fase B)

- Daftar belanja: nama, item, estimasi, aktual, status.
- Check item saat dibeli.
- Total estimasi vs aktual.
- Ubah daftar menjadi transaksi (opsional).

### 6.15 Anggota `/keluarga/anggota`

- Kartu anggota: nama, peran, tanggal lahir, avatar.
- Tambah/edit.
- Undang anggota (fase C): email + role.
- Ulang tahun terdekat.

### 6.16 Dokumen `/keluarga/dokumen` (fase C)

- Kategori: identitas, pendidikan, asuransi, properti, kesehatan, lainnya.
- Metadata: nama, nomor, penerbit, tanggal terbit, tanggal kedaluwarsa, anggota.
- File privat.
- Pengingat perpanjangan.

### 6.17 Kesehatan `/keluarga/kesehatan` (fase C)

- Per anggota: alergi, kondisi, obat, imunisasi, jadwal kontrol.
- Catatan dan tanggal berikutnya.
- Privat secara default.

### 6.18 Pendidikan `/keluarga/pendidikan` (fase C)

- Per anak: sekolah, jenjang, tahun ajaran, biaya.
- Nilai dan kegiatan.
- Tautan ke tujuan pendidikan.

### 6.19 Laporan `/keluarga/laporan` (fase B)

- Bulanan: pemasukan, pengeluaran, net, breakdown kategori.
- Tahunan: tren.
- Net worth: aset − utang.
- Kepatuhan anggaran.
- Progres tujuan.
- Export CSV.

### 6.20 Pengaturan `/keluarga/pengaturan`

- Nama household, mata uang, zona waktu.
- Anggota dan role.
- Kategori default.
- Preferensi tampilan.
- Danger zone (fase C).

---

## 7. Alur utama

### 7.1 Hari pertama

1. Login.
2. Buat household (nama keluarga).
3. Tambah anggota.
4. Tambah akun pertama + saldo awal.
5. Buat kategori default (otomatis).
6. Dashboard menampilkan empty state yang mengarahkan ke "Catat transaksi pertama".

### 7.2 Catat pengeluaran (target < 15 detik)

1. Tombol "Catat transaksi" di mana saja.
2. Pilih tipe (default: pengeluaran).
3. Isi jumlah.
4. Pilih kategori.
5. Pilih akun (default akun terakhir).
6. Simpan.
7. Dashboard dan anggaran langsung diperbarui.

### 7.3 Bayar tagihan

1. Buka tagihan.
2. Klik "Tandai dibayar".
3. Pilih akun dan tanggal.
4. Sistem membuat transaksi pengeluaran dengan kategori tagihan.
5. Status tagihan menjadi `paid`.
6. Tagihan berikutnya dijadwalkan sesuai frekuensi.

### 7.4 Buat tujuan

1. Buka Rencana → Tambah tujuan.
2. Pilih tipe, nama, target nominal, target tanggal.
3. Sistem menghitung kontribusi bulanan yang disarankan.
4. Simpan.
5. Tambah kontribusi dari akun → tercatat dan progress naik.

### 7.5 Akhir bulan

1. Buka Laporan.
2. Lihat pemasukan, pengeluaran, net.
3. Lihat kategori yang lewat anggaran.
4. Sesuaikan anggaran bulan depan.
5. Catat kontribusi tujuan.

---

## 8. Data model

Schema: `public` (identitas), `finance` (uang), `family` (kehidupan).

### 8.1 `public.households`

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `id` | uuid | PK |
| `name` | text | 1–100 |
| `slug` | text | unik, lowercase |
| `currency` | char(3) | default `IDR` |
| `timezone` | text | default `Asia/Jakarta` |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | default now |

### 8.2 `public.household_members`

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `id` | uuid | PK |
| `household_id` | uuid | FK, not null |
| `user_id` | uuid | FK user, nullable (anak tanpa akun) |
| `name` | text | 1–100 |
| `relationship` | enum | `self`, `spouse`, `child`, `parent`, `sibling`, `other` |
| `role` | enum | `owner`, `adult`, `teen`, `child`, `viewer` |
| `birth_date` | date | nullable |
| `avatar_url` | text | nullable |
| `color` | text | nullable |
| `status` | enum | `active`, `inactive` |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | default now |

Unique: `(household_id, user_id)` jika `user_id` tidak null.
Index: `(household_id, status)`.

### 8.3 `finance.accounts`

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `id` | uuid | PK |
| `household_id` | uuid | FK, not null |
| `name` | text | 1–100 |
| `type` | enum | `cash`, `bank`, `ewallet`, `savings`, `credit` |
| `owner_member_id` | uuid | nullable, FK members |
| `opening_balance` | numeric(18,2) | default 0 |
| `color` | text | nullable |
| `icon` | text | nullable |
| `is_shared` | boolean | default true |
| `archived_at` | timestamptz | nullable |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | default now |

### 8.4 `finance.categories`

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `id` | uuid | PK |
| `household_id` | uuid | FK, not null |
| `name` | text | 1–80 |
| `kind` | enum | `income`, `expense` |
| `color` | text | nullable |
| `icon` | text | nullable |
| `is_default` | boolean | default false |
| `archived_at` | timestamptz | nullable |
| `created_at` | timestamptz | default now |

Unique: `(household_id, kind, lower(name))` untuk data aktif.

### 8.5 `finance.transactions`

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `id` | uuid | PK |
| `household_id` | uuid | FK, not null |
| `account_id` | uuid | FK accounts, not null |
| `to_account_id` | uuid | FK accounts, nullable (wajib untuk transfer) |
| `category_id` | uuid | FK categories, nullable |
| `type` | enum | `income`, `expense`, `transfer` |
| `amount` | numeric(18,2) | > 0 |
| `occurred_at` | date | not null |
| `description` | text | 1–200 |
| `notes` | text | nullable, ≤ 2000 |
| `member_id` | uuid | nullable, FK members |
| `visibility` | enum | `household`, `shared`, `private` |
| `created_by` | uuid | FK user |
| `voided_at` | timestamptz | nullable |
| `void_reason` | text | nullable |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | default now |

Index: `(household_id, occurred_at)`, `(household_id, account_id)`, `(household_id, category_id)`, `(household_id, type)`, `(household_id, member_id)`.

### 8.6 `finance.budgets`

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `id` | uuid | PK |
| `household_id` | uuid | FK, not null |
| `category_id` | uuid | FK categories, not null |
| `month` | date | selalu tanggal 1 |
| `amount` | numeric(18,2) | ≥ 0 |
| `rollover` | boolean | default false |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | default now |

Unique: `(household_id, category_id, month)`.

### 8.7 `finance.bills`

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `id` | uuid | PK |
| `household_id` | uuid | FK, not null |
| `name` | text | 1–120 |
| `amount` | numeric(18,2) | > 0 |
| `category_id` | uuid | FK categories, nullable |
| `account_id` | uuid | FK accounts, nullable (akun default) |
| `frequency` | enum | `weekly`, `monthly`, `quarterly`, `semiannual`, `yearly`, `once` |
| `due_day` | smallint | 1–31, nullable untuk `once` |
| `next_due_date` | date | not null |
| `reminder_days_before` | smallint | default 3 |
| `auto_pay` | boolean | default false |
| `status` | enum | `active`, `paused`, `ended` |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | default now |

Index: `(household_id, next_due_date)`, `(household_id, status)`.

### 8.8 `finance.bill_payments`

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `id` | uuid | PK |
| `household_id` | uuid | FK |
| `bill_id` | uuid | FK bills |
| `transaction_id` | uuid | FK transactions, nullable |
| `due_date` | date | not null |
| `paid_at` | timestamptz | not null |
| `amount` | numeric(18,2) | > 0 |
| `status` | enum | `paid`, `skipped` |
| `created_at` | timestamptz | default now |

### 8.9 `finance.goals`

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `id` | uuid | PK |
| `household_id` | uuid | FK |
| `name` | text | 1–120 |
| `type` | enum | `emergency_fund`, `education`, `home`, `vehicle`, `retirement`, `hajj`, `wedding`, `vacation`, `custom` |
| `target_amount` | numeric(18,2) | > 0 |
| `target_date` | date | nullable |
| `saved_amount` | numeric(18,2) | default 0 (denormalisasi untuk kecepatan) |
| `account_id` | uuid | nullable, akun sumber |
| `member_id` | uuid | nullable, untuk siapa |
| `visibility` | enum | `household`, `shared`, `private` |
| `status` | enum | `active`, `achieved`, `paused`, `cancelled` |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | default now |

> `saved_amount` dihitung ulang dari `goal_contributions` setiap ada perubahan; nilainya denormalisasi agar dashboard cepat.

### 8.10 `finance.goal_contributions`

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `id` | uuid | PK |
| `household_id` | uuid | FK |
| `goal_id` | uuid | FK goals |
| `account_id` | uuid | FK accounts, nullable |
| `transaction_id` | uuid | FK transactions, nullable |
| `amount` | numeric(18,2) | > 0 |
| `contributed_at` | date | not null |
| `note` | text | nullable |
| `created_at` | timestamptz | default now |

### 8.11 `finance.debts` (fase C)

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `id` | uuid | PK |
| `household_id` | uuid | FK |
| `type` | enum | `payable`, `receivable` |
| `counterparty` | text | 1–120 |
| `principal` | numeric(18,2) | > 0 |
| `remaining` | numeric(18,2) | ≥ 0 |
| `interest_rate` | numeric(5,2) | nullable |
| `installment_amount` | numeric(18,2) | nullable |
| `due_date` | date | nullable |
| `status` | enum | `active`, `paid`, `written_off` |
| `notes` | text | nullable |

### 8.12 `finance.assets` (fase C)

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `id` | uuid | PK |
| `household_id` | uuid | FK |
| `name` | text | 1–120 |
| `type` | enum | `cash`, `property`, `vehicle`, `gold`, `investment`, `other` |
| `acquisition_value` | numeric(18,2) | nullable |
| `current_value` | numeric(18,2) | ≥ 0 |
| `acquired_at` | date | nullable |
| `notes` | text | nullable |
| `archived_at` | timestamptz | nullable |

### 8.13 `finance.insurances` (fase C)

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `id` | uuid | PK |
| `household_id` | uuid | FK |
| `member_id` | uuid | nullable |
| `type` | enum | `health`, `life`, `vehicle`, `property`, `other` |
| `provider` | text | 1–120 |
| `policy_number` | text | nullable |
| `premium` | numeric(18,2) | ≥ 0 |
| `period` | enum | `monthly`, `quarterly`, `yearly` |
| `next_due_date` | date | nullable |
| `coverage` | text | nullable |
| `status` | enum | `active`, `lapsed`, `cancelled` |

### 8.14 `family.events` (fase B)

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `id` | uuid | PK |
| `household_id` | uuid | FK |
| `title` | text | 1–160 |
| `type` | enum | `birthday`, `anniversary`, `school`, `medical`, `family`, `other` |
| `start_at` | timestamptz | not null |
| `end_at` | timestamptz | nullable |
| `all_day` | boolean | default false |
| `location` | text | nullable |
| `member_id` | uuid | nullable |
| `recurrence` | enum | `none`, `yearly`, `monthly`, `weekly` |
| `notes` | text | nullable |

Index: `(household_id, start_at)`.

### 8.15 `family.chores` (fase B)

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `id` | uuid | PK |
| `household_id` | uuid | FK |
| `title` | text | 1–120 |
| `assignee_member_id` | uuid | nullable |
| `frequency` | enum | `once`, `daily`, `weekly`, `monthly` |
| `due_date` | date | nullable |
| `status` | enum | `todo`, `doing`, `done` |
| `points` | smallint | default 0 |
| `completed_at` | timestamptz | nullable |

### 8.16 `family.documents` (fase C)

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `id` | uuid | PK |
| `household_id` | uuid | FK |
| `member_id` | uuid | nullable |
| `title` | text | 1–160 |
| `category` | enum | `identity`, `education`, `insurance`, `property`, `health`, `other` |
| `document_number` | text | nullable |
| `issuer` | text | nullable |
| `issued_at` | date | nullable |
| `expires_at` | date | nullable |
| `file_url` | text | nullable |
| `visibility` | enum | `household`, `shared`, `private` |
| `notes` | text | nullable |

### 8.17 `family.health_records` (fase C)

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `id` | uuid | PK |
| `household_id` | uuid | FK |
| `member_id` | uuid | FK members |
| `type` | enum | `allergy`, `condition`, `medication`, `immunization`, `checkup`, `other` |
| `title` | text | 1–160 |
| `recorded_at` | date | not null |
| `next_at` | date | nullable |
| `notes` | text | nullable |
| `visibility` | enum | `private`, `household` |

### 8.18 `family.education_records` (fase C)

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `id` | uuid | PK |
| `household_id` | uuid | FK |
| `member_id` | uuid | FK members |
| `school` | text | 1–160 |
| `level` | enum | `paud`, `sd`, `smp`, `sma`, `kuliah`, `lainnya` |
| `academic_year` | text | mis. `2026/2027` |
| `annual_cost` | numeric(18,2) | nullable |
| `notes` | text | nullable |
| `goal_id` | uuid | nullable, tautan ke tujuan pendidikan |

### 8.19 `family.shopping_lists` & `shopping_items` (fase B)

`shopping_lists`: `id`, `household_id`, `title`, `planned_date`, `status` (`open`, `done`), `created_at`.

`shopping_items`: `id`, `list_id`, `name`, `quantity`, `unit`, `estimated_price`, `actual_price`, `checked`, `category_id`.

### 8.20 `public.audit_logs`

`id`, `household_id`, `actor_id`, `action`, `entity`, `entity_id`, `before` (jsonb), `after` (jsonb), `created_at`.

---

## 9. Aturan domain

### 9.1 Uang

- Simpan `numeric(18,2)`. Jangan pakai `float`.
- Operasi memakai `decimal.js`.
- Format: `Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })`.
- Jumlah selalu positif; arah ditentukan `type`.
- Batas wajar: ≤ Rp1 triliun (mencegah overflow/typo).

### 9.2 Saldo

```text
saldo(account) =
  opening_balance
  + sum(income)
  - sum(expense)
  - sum(transfer keluar)
  + sum(transfer masuk)
  - sum(voided? tidak dihitung)
```

- Dihitung di SQL.
- Transaksi `voided_at` tidak dihitung.
- Transaksi `private` milik anggota lain tidak ditampilkan ke anak/teen.

### 9.3 Transfer

- `to_account_id` wajib dan berbeda.
- Tidak dihitung sebagai pemasukan/pengeluaran.
- Tidak punya kategori.
- Bisa punya `member_id`.

### 9.4 Anggaran

```text
terpakai(category, month) = sum(expense) where category and month and not voided
sisa = amount - terpakai
status = aman (<80%) | waspada (80–100%) | lewat (>100%)
```

- Hanya kategori `expense`.
- Bulan berdasarkan `occurred_at`.
- Anggaran tidak memblokir transaksi; hanya memberi sinyal.

### 9.5 Tagihan

- `next_due_date` menentukan tagihan berikutnya.
- Tandai dibayar → buat transaksi + `bill_payment` + majukan `next_due_date`.
- Jika frekuensi `monthly` dan `due_day` 31, gunakan hari terakhir bulan.
- Tagihan lewat jatuh tempo menjadi `overdue` (dihitung, bukan disimpan).
- Jangan membuat transaksi ganda untuk periode yang sama.

### 9.6 Tujuan

```text
progress = saved_amount / target_amount
sisa = target_amount - saved_amount
bulan_tersisa = bulan(target_date) - bulan(now)
kontribusi_disarankan = sisa / bulan_tersisa
```

- Jika `target_date` lewat, tampilkan "perlu penyesuaian", bukan angka negatif.
- Kontribusi menambah `saved_amount` dan membuat transaksi transfer ke akun tujuan (opsional).
- Tujuan `achieved` saat `saved_amount >= target_amount`.

### 9.7 Dana darurat

- Target default: 3–6 × rata-rata pengeluaran bulanan 3 bulan terakhir.
- Ditampilkan sebagai tujuan khusus dengan perhitungan otomatis.

### 9.8 Net worth

```text
net_worth = sum(current_value aset) - sum(remaining utang)
```

### 9.9 Tanggal

- Transaksi memakai `date` (bukan timestamp) untuk menghindari pergeseran zona waktu.
- Event memakai `timestamptz`.
- Bulan dihitung kalender, bukan 30 hari.
- Tampilan `dd MMM yyyy` dengan locale `id-ID`.

### 9.10 Visibilitas

- `private`: hanya `created_by` dan `owner`.
- `household`: semua `adult` dan `owner`.
- `shared`: semua anggota aktif.
- Filter diterapkan di query, bukan di UI.

---

## 10. Permission

| Aksi | owner | adult | teen | child | viewer |
| --- | --- | --- | --- | --- | --- |
| Lihat dashboard | ✅ | ✅ | ringkas | ringkas | ✅ |
| Lihat transaksi household | ✅ | ✅ | ❌ | ❌ | ✅ |
| Catat transaksi | ✅ | ✅ | pribadi | ❌ | ❌ |
| Edit/hapus transaksi | ✅ | milik sendiri | milik sendiri | ❌ | ❌ |
| Void transaksi | ✅ | ❌ | ❌ | ❌ | ❌ |
| Akun & kategori | ✅ | ✅ | ❌ | ❌ | ❌ |
| Anggaran | ✅ | ✅ | ❌ | ❌ | lihat |
| Tagihan | ✅ | ✅ | ❌ | ❌ | lihat |
| Tujuan | ✅ | ✅ | lihat shared | lihat shared | lihat shared |
| Kalender | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tugas | ✅ | ✅ | ✅ | ✅ | lihat |
| Dokumen | ✅ | ✅ | ❌ | ❌ | ❌ |
| Kesehatan | ✅ | ✅ | diri sendiri | ❌ | ❌ |
| Anggota | ✅ | lihat | lihat | lihat | lihat |
| Undang anggota | ✅ | ❌ | ❌ | ❌ | ❌ |
| Pengaturan household | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 11. Acceptance criteria

### Fase A

- [ ] Bisa membuat household dan menambah anggota.
- [ ] Bisa membuat akun dengan saldo awal.
- [ ] Bisa membuat kategori pemasukan/pengeluaran.
- [ ] Bisa mencatat income, expense, dan transfer.
- [ ] Saldo akun cocok dengan perhitungan manual.
- [ ] Transfer tidak masuk pemasukan/pengeluaran.
- [ ] Anggaran bulanan menampilkan terpakai dan sisa yang benar.
- [ ] Tagihan bisa ditandai dibayar dan membuat transaksi.
- [ ] Tujuan menampilkan progress dan kontribusi yang disarankan.
- [ ] Dashboard menampilkan angka yang konsisten dengan halaman lain.
- [ ] Void transaksi mengembalikan saldo dan anggaran.
- [ ] Data household lain tidak terlihat.
- [ ] Transaksi `private` tidak terlihat oleh anggota lain.
- [ ] E2E: login → household → akun → transaksi → anggaran → dashboard.

### Fase B

- [ ] Kalender menampilkan acara per bulan.
- [ ] Ulang tahun anggota muncul otomatis.
- [ ] Tugas bisa ditugaskan dan diselesaikan.
- [ ] Daftar belanja bisa dicentang dan totalnya benar.
- [ ] Laporan bulanan benar.
- [ ] Net worth benar.
- [ ] Export CSV berisi data yang sesuai filter.

### Fase C

- [ ] Dokumen bisa diunggah, dicari, dan diunduh oleh yang berhak.
- [ ] Catatan kesehatan tersimpan privat.
- [ ] Pendidikan anak terhubung ke tujuan.
- [ ] Utang mengurangi net worth.
- [ ] Aset menambah net worth.
- [ ] Undangan anggota berfungsi dengan role yang benar.

---

## 12. Metrik

- Waktu mencatat transaksi (< 15 detik).
- Persentase transaksi tanpa kategori.
- Jumlah tagihan lewat jatuh tempo.
- Kepatuhan anggaran per bulan.
- Progres tujuan per kuartal.
- Anggota aktif per minggu.
- Selisih saldo dengan rekening riil (rekonsiliasi).

---

## 13. Desain

Mengikuti metode **Oil UI**:

1. Tiga arah desain ditulis dan dipilih sebelum implementasi.
2. Halaman perbandingan dibuat jika perlu.
3. Implementasi mengikuti arah terpilih.
4. Screenshot di desktop dan mobile, lalu perbaiki.
5. Review independen dan pengurangan elemen.

Arah yang diusulkan ada di [../06-design-system.md](../06-design-system.md).

Prinsip khusus aplikasi keluarga:

- **Tenang.** Tidak ada warna alarm di mana-mana.
- **Satu angka utama per layar.**
- **Angka besar, label kecil.**
- **Mobile-first untuk pencatatan.**
- **Desktop-first untuk laporan.**
- **Anak punya tampilan yang ramah, bukan versi mini dari dashboard orang tua.**

---

## 14. Fase berikutnya

- Sinkronisasi bank (butuh provider).
- Multi-currency.
- Recurring transaction.
- OCR struk.
- Split bill.
- Kalender eksternal (Google Calendar).
- Notifikasi push/WhatsApp.
- Portal anggota keluarga tanpa akun penuh.
- Proyeksi pensiun dengan asumsi inflasi.
- Zakat dan infaq otomatis.
- Integrasi dengan aplikasi Keuangan yang sudah ada.

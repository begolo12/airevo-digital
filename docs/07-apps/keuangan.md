# 07 — Aplikasi Keuangan

> **Status:** ⚠️ CONTOH / REFERENSI — aplikasi ini sudah ada dan **tidak dibangun di proyek ini**.
> Dokumen ini dipertahankan sebagai pola penulisan spec dan sebagai referensi aturan uang.
> Aplikasi Keuangan yang sudah ada didaftarkan di `src/config/apps.ts` dan ditautkan dari hub.
>
> **Path rencana:** `/keuangan` (jika nanti dipindah ke domain ini)  
> **Tujuan asli:** mencatat arus kas, mengatur budget, dan membaca kondisi keuangan tanpa spreadsheet rumit.

## 1. Masalah

- Pemasukan dan pengeluaran tersebar di rekening, e-wallet, dan catatan manual.
- Sulit tahu saldo riil dan ke mana uang pergi.
- Budget bulanan tidak terpantau.
- Laporan bulanan memakan waktu.

## 2. Pengguna

| Peran | Kebutuhan |
| --- | --- |
| Owner | Mencatat transaksi, memantau saldo, budget, dan laporan |
| Anggota keluarga/tim (fase 2) | Mencatat transaksi dengan akses terbatas |
| Akuntan (fase 2) | Melihat laporan, tidak mengubah data |

MVP: **single user owner**.

## 3. Jobs to be done

- “Saat saya bayar sesuatu, saya ingin mencatatnya dalam < 15 detik.”
- “Saat awal bulan, saya ingin tahu ke mana uang bulan lalu pergi.”
- “Saat saya transfer antar rekening, saya tidak ingin itu dihitung sebagai pengeluaran.”
- “Saat budget kategori hampir habis, saya ingin tahu.”
- “Saat butuh laporan, saya ingin mengunduh CSV/PDF.”

## 4. Scope MVP

### Termasuk

- CRUD akun (kas, bank, e-wallet).
- CRUD kategori pemasukan/pengeluaran.
- CRUD transaksi: income, expense, transfer.
- Saldo akun otomatis.
- Dashboard bulanan.
- Budget per kategori per bulan.
- Laporan bulanan: income, expense, net, breakdown kategori.
- Filter bulan/akun/kategori/tipe.
- Export CSV.
- Audit log dan void (bukan hard delete).

### Tidak termasuk (MVP)

- Sinkronisasi bank otomatis.
- Multi-currency.
- Double-entry accounting penuh.
- Pajak, faktur, dan integrasi akuntansi.
- Upload receipt.
- Recurring transaction.
- Split transaction.
- Utang/piutang.
- Aset/investasi.
- Kolaborasi multi-user.
- Mobile app native.

## 5. Layar

### 5.1 Dashboard `/keuangan`

- Kartu: total saldo, pemasukan bulan ini, pengeluaran bulan ini, net cashflow.
- Grafik cashflow 6 bulan.
- Breakdown pengeluaran per kategori (donut/bar).
- Budget progress (top 3–5 kategori).
- Transaksi terbaru.
- Pemilih bulan.
- Empty state: “Tambahkan akun pertama”.

### 5.2 Transaksi `/keuangan/transactions`

- Tabel: tanggal, deskripsi, kategori, akun, tipe, jumlah, aksi.
- Filter: bulan, tipe, akun, kategori, pencarian.
- Tombol “Tambah transaksi”.
- Form:
  - Tipe: income/expense/transfer.
  - Tanggal.
  - Jumlah (input rupiah).
  - Akun (dan akun tujuan untuk transfer).
  - Kategori (tidak untuk transfer).
  - Deskripsi/catatan.
- Edit dan void dengan konfirmasi.
- Pagination.

### 5.3 Akun `/keuangan/accounts`

- Daftar akun: nama, tipe, saldo, status.
- Tambah/edit/arsip.
- Saldo awal (opening balance).
- Tidak bisa menghapus akun yang punya transaksi; arsipkan.

### 5.4 Kategori `/keuangan/categories`

- Dua tab: pemasukan, pengeluaran.
- Nama, warna, ikon.
- Arsip kategori; transaksi lama tetap menyimpan referensi.
- Kategori default saat pertama kali setup.

### 5.5 Budget `/keuangan/budgets`

- Pilih bulan.
- Daftar kategori pengeluaran + budget + terpakai + progress.
- Tambah/edit budget.
- Peringatan visual jika > 80% dan > 100%.
- Copy budget dari bulan sebelumnya (fase 2).

### 5.6 Laporan `/keuangan/reports`

- Ringkasan bulan: income, expense, net.
- Breakdown kategori.
- Tren 6/12 bulan.
- Perbandingan bulan sebelumnya.
- Export CSV.
- Print-friendly (fase 2).

### 5.7 Pengaturan `/keuangan/settings`

- Mata uang (IDR, read-only untuk MVP).
- Awal bulan (tanggal 1; bisa dikonfigurasi nanti).
- Kategori default.
- Zona waktu `Asia/Jakarta`.

## 6. Aturan keuangan

### 6.1 Penyimpanan uang

- Gunakan `numeric(18,2)` di Postgres, bukan `float`.
- Drizzle mengembalikan string; gunakan `decimal.js` untuk operasi aritmetika.
- Jangan pernah menghitung uang dengan `number` JavaScript untuk penjumlahan/pengurangan.
- Format tampilan: `Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })`.
- IDR tidak memakai desimal di UI; simpan 2 desimal untuk masa depan.

### 6.2 Tipe transaksi

| Tipe | Efek saldo | Kategori | Akun tujuan |
| --- | --- | --- | --- |
| `income` | + ke akun | wajib | — |
| `expense` | − dari akun | wajib | — |
| `transfer` | − dari akun asal, + ke akun tujuan | tidak boleh | wajib, berbeda |

- Jumlah selalu positif.
- Transfer tidak dihitung sebagai income/expense di laporan.
- Transfer dengan akun asal = tujuan ditolak.
- Transfer membuat satu baris dengan `transfer_group_id` unik (atau dua baris; lihat data model).

### 6.3 Saldo

```text
saldo(account) =
  opening_balance
  + sum(income)
  - sum(expense)
  - sum(transfer keluar)
  + sum(transfer masuk)
```

- Hanya transaksi yang tidak `voided`.
- Saldo dihitung di SQL, bukan di client.
- Untuk performa, bisa memakai materialized view/ringkasan bulanan nanti; MVP hitung langsung.

### 6.4 Laporan bulanan

```text
income_bulan   = sum(amount) where type = income and month = M
expense_bulan  = sum(amount) where type = expense and month = M
net_bulan      = income_bulan - expense_bulan
budget_terpakai= sum(expense) where category = C and month = M
```

- Bulan berdasarkan `occurred_at` (date), bukan `created_at`.
- Batas bulan menggunakan `Asia/Jakarta`, tetapi karena `occurred_at` adalah date, tidak ada konversi waktu.
- Perbandingan bulan sebelumnya menggunakan bulan kalender, bukan 30 hari.

### 6.5 Void vs delete

- Transaksi tidak dihapus permanen.
- `voided_at` + `void_reason` (opsional).
- Transaksi void tidak masuk saldo/laporan.
- Audit log mencatat siapa dan kapan.
- Hard delete hanya untuk data uji di development.

## 7. Data model

Schema Postgres: `finance`.

### `finance.accounts`

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `id` | uuid | PK |
| `workspace_id` | uuid | FK, not null |
| `name` | text | 1–100 |
| `type` | enum | `cash`, `bank`, `ewallet`, `credit` |
| `currency` | char(3) | default `IDR` |
| `opening_balance` | numeric(18,2) | default 0 |
| `color` | text | nullable |
| `icon` | text | nullable |
| `archived_at` | timestamptz | nullable |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | default now |

Index: `(workspace_id, archived_at)`.

### `finance.categories`

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `id` | uuid | PK |
| `workspace_id` | uuid | FK, not null |
| `name` | text | 1–80 |
| `kind` | enum | `income`, `expense` |
| `color` | text | nullable |
| `icon` | text | nullable |
| `archived_at` | timestamptz | nullable |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | default now |

Unique: `(workspace_id, kind, lower(name))` untuk mencegah duplikat.

### `finance.transactions`

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `id` | uuid | PK |
| `workspace_id` | uuid | FK, not null |
| `account_id` | uuid | FK `finance.accounts`, not null |
| `to_account_id` | uuid | FK, nullable; wajib untuk transfer |
| `category_id` | uuid | FK, nullable; wajib untuk income/expense |
| `type` | enum | `income`, `expense`, `transfer` |
| `amount` | numeric(18,2) | > 0 |
| `currency` | char(3) | default `IDR` |
| `occurred_at` | date | not null |
| `description` | text | 1–200 |
| `notes` | text | nullable, ≤ 2000 |
| `transfer_group_id` | uuid | nullable, untuk transfer |
| `voided_at` | timestamptz | nullable |
| `void_reason` | text | nullable |
| `created_by` | uuid | FK user |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | default now |

Index: `(workspace_id, occurred_at)`, `(workspace_id, account_id)`, `(workspace_id, category_id)`, `(workspace_id, type)`.

### `finance.budgets`

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `id` | uuid | PK |
| `workspace_id` | uuid | FK, not null |
| `category_id` | uuid | FK, not null |
| `month` | date | selalu tanggal 1 |
| `amount` | numeric(18,2) | ≥ 0 |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | default now |

Unique: `(workspace_id, category_id, month)`.

### `public.audit_logs`

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `id` | uuid | PK |
| `workspace_id` | uuid | FK |
| `actor_id` | uuid | FK user |
| `action` | text | `create`, `update`, `void`, `archive` |
| `entity` | text | `transaction`, `account`, dll |
| `entity_id` | uuid | — |
| `before` | jsonb | nullable |
| `after` | jsonb | nullable |
| `created_at` | timestamptz | default now |

## 8. Validasi

- Jumlah > 0 dan ≤ batas wajar (mis. 1 triliun) untuk mencegah overflow.
- Tanggal tidak boleh lebih dari 1 tahun ke depan (mencegah typo).
- Transfer wajib `to_account_id` dan berbeda dari `account_id`.
- Income/expense wajib `category_id` dengan `kind` yang sesuai.
- Kategori/akun harus milik workspace yang sama.
- Deskripsi wajib.
- Budget hanya untuk kategori `expense`.
- Bulan budget harus tanggal 1.
- Jangan mengizinkan edit tipe transaksi dari income ke transfer tanpa reset field terkait.

## 9. Permission

| Aksi | Owner | Member | Viewer |
| --- | --- | --- | --- |
| Lihat dashboard/laporan | ✅ | ✅ | ✅ |
| CRUD transaksi | ✅ | ✅ | ❌ |
| CRUD akun/kategori | ✅ | ✅ | ❌ |
| CRUD budget | ✅ | ✅ | ❌ |
| Void transaksi | ✅ | ❌ | ❌ |
| Export | ✅ | ✅ | ✅ |
| Pengaturan | ✅ | ❌ | ❌ |

## 10. Acceptance criteria

- [ ] Bisa membuat akun dengan saldo awal.
- [ ] Bisa membuat kategori income/expense.
- [ ] Bisa membuat transaksi income/expense.
- [ ] Bisa membuat transfer; saldo asal berkurang, tujuan bertambah.
- [ ] Transfer tidak muncul sebagai income/expense di laporan.
- [ ] Saldo akun cocok dengan perhitungan manual.
- [ ] Dashboard bulan ini menampilkan income, expense, net yang benar.
- [ ] Budget progress benar dan berubah saat transaksi ditambahkan.
- [ ] Transaksi void hilang dari saldo/laporan tetapi tetap ada di audit.
- [ ] Filter bulan tidak mencampur transaksi bulan lain.
- [ ] Tidak ada data workspace lain yang terlihat.
- [ ] E2E: login → akun → kategori → transaksi → transfer → cek saldo → laporan.

## 11. Metrik

- Waktu mencatat transaksi.
- Jumlah transaksi tanpa kategori.
- Budget overrun per bulan.
- Selisih saldo dengan rekening riil (rekonsiliasi).
- Frekuensi buka laporan.

## 12. Fase berikutnya

- Recurring transaction.
- Upload receipt (private storage).
- Multi-currency.
- Utang/piutang.
- Split transaction.
- Import CSV bank.
- Sinkronisasi bank (mahal, butuh provider).
- Double-entry ledger.
- Ekspor PDF.
- Multi-user dengan role.

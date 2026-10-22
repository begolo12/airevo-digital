# 07 — Aplikasi Ops

> **Status:** ⚠️ CONTOH / REFERENSI — aplikasi ini sudah ada dan **tidak dibangun di proyek ini**.
> Dokumen ini dipertahankan sebagai pola penulisan spec (masalah → scope → data model → acceptance criteria).
> Aplikasi Ops yang sudah ada didaftarkan di `src/config/apps.ts` dan ditautkan dari hub.
>
> **Path rencana:** `/ops` (jika nanti dipindah ke domain ini)  
> **Tujuan asli:** mengelola klien, proyek, dan task tanpa spreadsheet yang berserakan.

## 1. Masalah

Airevo Digital mengelola beberapa klien dan proyek sekaligus. Tanpa sistem:

- Status proyek tersebar di chat, catatan, dan spreadsheet.
- Task jatuh tempo terlewat.
- Sulit melihat beban kerja dan progres.
- Riwayat komunikasi/klien tidak terpusat.

## 2. Pengguna

| Peran | Kebutuhan |
| --- | --- |
| Owner (Irvan) | Melihat semua klien, proyek, task; mengatur prioritas |
| Freelancer/kolaborator (fase 2) | Hanya melihat proyek/task yang ditugaskan |
| Klien (fase 2, opsional) | Melihat progres proyek tertentu tanpa data internal |

MVP: **single user owner**, tetapi data model sudah menyiapkan `workspace_id` dan role.

## 3. Jobs to be done

- “Saat ada klien baru, saya ingin mencatatnya dan membuat proyek tanpa membuka spreadsheet.”
- “Saat pagi, saya ingin tahu task apa yang harus dikerjakan hari ini.”
- “Saat klien bertanya, saya ingin melihat status proyek dan catatan terakhir.”
- “Saat proyek selesai, saya ingin menandainya selesai dan melihat arsipnya.”

## 4. Scope MVP

### Termasuk

- Dashboard ringkas.
- CRUD klien.
- CRUD proyek, terhubung ke klien.
- CRUD task, terhubung ke proyek.
- Status task: `todo`, `in_progress`, `review`, `done`.
- Prioritas: `low`, `medium`, `high`, `urgent`.
- Filter dan pencarian dasar.
- Arsip (bukan hard delete) untuk klien/proyek.
- Audit log untuk perubahan penting.

### Tidak termasuk (MVP)

- Multi-user/assignment.
- Komentar dan mention.
- Time tracking.
- Invoice/pembayaran (ada di Keuangan).
- Lampiran file.
- Gantt chart.
- Notifikasi email/push.
- Kalender eksternal.
- Portal klien.
- Recurring task.

## 5. Layar

### 5.1 Dashboard `/ops`

- KPI:
  - Proyek aktif.
  - Task jatuh tempo 7 hari ke depan.
  - Task selesai minggu ini.
  - Klien aktif.
- Daftar “Fokus hari ini”: task `todo`/`in_progress` dengan due date terdekat.
- Daftar proyek aktif dengan progress bar.
- Aktivitas terbaru (audit log ringkas).
- Empty state jika belum ada data: CTA “Tambah klien pertama”.

### 5.2 Klien `/ops/clients`

- Tabel: nama, perusahaan, email, status, jumlah proyek, aksi.
- Search nama/email/perusahaan.
- Filter status: lead, active, paused, archived.
- Tombol “Tambah klien”.
- Detail klien: info, proyek terkait, catatan, tombol edit/arsip.

### 5.3 Proyek `/ops/projects`

- Tabel/grid: nama, klien, status, due date, progress task, aksi.
- Filter status dan klien.
- Tombol “Tambah proyek”.
- Detail proyek:
  - Header: nama, klien, status, tanggal, budget (opsional).
  - Progress task.
  - Daftar task (board/list toggle).
  - Catatan proyek (fase 2).
  - Aksi: edit, arsip, tambah task.

### 5.4 Task `/ops/tasks`

- Semua task, dikelompokkan berdasarkan status atau due date.
- Filter: proyek, status, prioritas, overdue.
- Quick add task.
- Aksi: ubah status, edit, hapus (soft delete/arsip).
- Drag-and-drop board (fase 2; MVP bisa tombol status).

### 5.5 Pengaturan `/ops/settings`

- Nama workspace.
- Profil owner.
- Zona waktu (default `Asia/Jakarta`).
- Preferensi tampilan (theme).
- Danger zone: arsip semua data (fase 2).

## 6. Alur utama

### Tambah klien → proyek → task

1. User klik “Tambah klien”.
2. Isi nama, perusahaan, email, status.
3. Simpan; redirect ke detail klien.
4. Klik “Tambah proyek”; klien terisi otomatis.
5. Isi nama, status, due date.
6. Di detail proyek, tambah task.
7. Task muncul di dashboard dan `/ops/tasks`.

### Menyelesaikan task

1. Dari dashboard/task list, ubah status ke `done`.
2. `completed_at` terisi.
3. Progress proyek dihitung ulang.
4. Audit log mencatat perubahan.

### Arsip proyek

1. Klik “Arsipkan”.
2. Konfirmasi dialog.
3. Proyek hilang dari daftar aktif, tetap bisa dilihat di filter “Archived”.
4. Task terkait tidak dihapus.

## 7. Data model

Schema Postgres: `ops`.

### `ops.clients`

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `id` | uuid | PK, default random |
| `workspace_id` | uuid | FK `public.workspaces`, not null |
| `name` | text | 1–120 karakter |
| `company` | text | nullable, ≤ 120 |
| `email` | text | nullable, format email |
| `phone` | text | nullable, ≤ 30 |
| `status` | enum | `lead`, `active`, `paused`, `archived` |
| `notes` | text | nullable, ≤ 5000 |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | default now |
| `archived_at` | timestamptz | nullable |

Index: `(workspace_id, status)`, `(workspace_id, name)`.

### `ops.projects`

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `id` | uuid | PK |
| `workspace_id` | uuid | FK, not null |
| `client_id` | uuid | FK `ops.clients`, not null |
| `name` | text | 1–160 |
| `description` | text | nullable, ≤ 5000 |
| `status` | enum | `planned`, `active`, `on_hold`, `completed`, `cancelled` |
| `start_date` | date | nullable |
| `due_date` | date | nullable, ≥ start_date |
| `budget` | numeric(18,2) | nullable, ≥ 0 |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | default now |
| `archived_at` | timestamptz | nullable |

Index: `(workspace_id, status)`, `(workspace_id, client_id)`, `(workspace_id, due_date)`.

### `ops.tasks`

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `id` | uuid | PK |
| `workspace_id` | uuid | FK, not null |
| `project_id` | uuid | FK `ops.projects`, not null |
| `title` | text | 1–200 |
| `description` | text | nullable, ≤ 5000 |
| `status` | enum | `todo`, `in_progress`, `review`, `done` |
| `priority` | enum | `low`, `medium`, `high`, `urgent` |
| `due_date` | date | nullable |
| `position` | integer | default 0, untuk urutan |
| `completed_at` | timestamptz | nullable |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | default now |

Index: `(workspace_id, status)`, `(workspace_id, project_id)`, `(workspace_id, due_date)`.

### Aturan relasi

- Menghapus klien tidak menghapus proyek; klien diarsipkan.
- Menghapus proyek tidak menghapus task; proyek diarsipkan, task tetap terlihat di arsip.
- `client_id` harus milik workspace yang sama.
- `project_id` harus milik workspace yang sama.
- Jangan menerima `workspace_id` dari form; ambil dari session.

## 8. Validasi

- Nama klien/proyek/task wajib, trim, tidak boleh hanya spasi.
- Email valid jika diisi.
- `due_date` tidak boleh sebelum `start_date` (proyek).
- Budget ≥ 0.
- Status hanya nilai enum.
- Task `done` → `completed_at` diisi; kembali dari `done` → `completed_at` null.
- Panjang teks dibatasi untuk mencegah abuse.

## 9. Permission

| Aksi | Owner | Member | Viewer |
| --- | --- | --- | --- |
| Lihat dashboard | ✅ | ✅ | ✅ |
| CRUD klien | ✅ | ✅ | ❌ |
| CRUD proyek | ✅ | ✅ | ❌ |
| CRUD task | ✅ | ✅ | ❌ |
| Arsip | ✅ | ❌ | ❌ |
| Pengaturan workspace | ✅ | ❌ | ❌ |

MVP hanya owner, tetapi helper permission disiapkan.

## 10. Acceptance criteria

- [ ] User bisa membuat klien dengan nama saja.
- [ ] User bisa membuat proyek yang terhubung ke klien.
- [ ] User bisa membuat task di proyek.
- [ ] Mengubah status task memperbarui progress proyek.
- [ ] Task `done` memiliki `completed_at`; undo menghapusnya.
- [ ] Dashboard menampilkan proyek aktif dan task due date terdekat.
- [ ] Search dan filter bekerja tanpa reload penuh.
- [ ] Arsip menyembunyikan data dari daftar aktif, tetapi bisa difilter.
- [ ] Semua aksi memvalidasi session dan workspace.
- [ ] Tidak ada data workspace lain yang terlihat.
- [ ] E2E: login → tambah klien → proyek → task → selesai → logout.

## 11. Metrik

- Jumlah proyek aktif.
- Task overdue.
- Task selesai per minggu.
- Waktu dari “klien baru” ke “proyek pertama” (friction).

## 12. Fase berikutnya

- Assignment dan multi-user.
- Komentar/aktivitas per proyek.
- Time tracking.
- Lampiran file.
- Template proyek/task.
- Kalender dan reminder email.
- Portal klien read-only.
- Integrasi invoice ke Keuangan.

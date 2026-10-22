# 07 — Aplikasi

Folder ini berisi spesifikasi aplikasi.

## Status sebenarnya

| Dokumen | Status | Keterangan |
| --- | --- | --- |
| [keluarga.md](keluarga.md) | **Scope aktif** | Aplikasi yang dibangun di proyek ini |
| [ops.md](ops.md) | **Contoh / referensi** | Aplikasi sudah ada; tidak dibangun ulang |
| [keuangan.md](keuangan.md) | **Contoh / referensi** | Aplikasi sudah ada; tidak dibangun ulang |

`ops.md` dan `keuangan.md` dipertahankan karena berguna sebagai **pola penulisan spec**: struktur masalah, scope, data model, validasi, permission, acceptance criteria. Jangan menganggapnya sebagai pekerjaan yang harus dieksekusi.

## Cara memperlakukan aplikasi yang sudah ada

Aplikasi lama **tidak dipindahkan** ke repo ini pada fase awal. Mereka:

1. Didaftarkan di `src/config/apps.ts` (nama, deskripsi, ikon, URL, status).
2. Ditampilkan di `/aplikasi` dan di home.
3. Dibuka lewat tautan ke deployment Vercel masing-masing.
4. Diberi halaman marketing di `/aplikasi/[slug]`.

Jika nanti ingin benar-benar berada di `airevo-digital.my.id/ops`, lihat opsi integrasi di [../05-routing-deployment-domain.md](../05-routing-deployment-domain.md).

## Cara menulis spec aplikasi baru

Setiap aplikasi baru mengikuti kerangka yang sama:

1. **Masalah** — kenapa aplikasi ini ada.
2. **Pengguna & peran** — siapa memakai, dengan hak apa.
3. **Jobs to be done** — pekerjaan nyata yang dibantu.
4. **Scope MVP** — termasuk dan tidak termasuk.
5. **Layar** — route dan isi tiap layar.
6. **Alur utama** — langkah end-to-end.
7. **Data model** — tabel, kolom, aturan, index.
8. **Aturan domain** — perhitungan, validasi, edge case.
9. **Permission** — matriks akses.
10. **Acceptance criteria** — definisi selesai.
11. **Metrik** — cara mengukur berguna atau tidak.
12. **Fase berikutnya** — apa yang sengaja ditunda.

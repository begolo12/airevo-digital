# 17 — Agent Workflow

Dokumen ini memastikan setiap pekerjaan dimulai dengan **plan dan arah desain**, bukan langsung coding. Pola ini dipakai berulang setiap kali menambah aplikasi atau modul.

## 1. Prinsip

1. **Plan dulu, kode kemudian.**
2. **Arah desain dipilih sebelum halaman dibuat.**
3. **Satu fase, satu vertical slice.**
4. **Dokumen adalah kontrak.**
5. **Test sebelum deploy.**
6. **Jangan over-engineer.**

## 2. Alur setiap pekerjaan

```text
Ide
 → Product brief (masalah, user, jobs)
 → Scope MVP + non-goals
 → Arah desain (Oil UI)
 → Route + data model + permission
 → Acceptance criteria
 → Implementasi vertical slice
 → Screenshot + perbaikan
 → Test (unit + E2E)
 → Preview Vercel
 → Review
 → Deploy
 → Dokumentasi + retrospective
```

## 3. Kapan memakai Oil UI

**Pakai** saat:

- Membuat halaman atau aplikasi baru.
- Butuh arah visual yang belum ditentukan.
- Merombak tampilan satu halaman penuh.
- Ingin membandingkan beberapa arah desain.

**Tidak perlu** saat:

- Mengganti teks, angka, atau menghapus elemen tertentu.
- Memperbaiki bug logika.
- Menambah field ke form yang sudah ada gayanya.
- Perubahan kecil yang sudah jelas.

### Langkah Oil UI

1. **Pahami** — kategori produk, audiens, tone, pembanding.
2. **Tulis 3 arah** — beda tipografi, warna, komposisi. Bukan 3 variasi warna.
3. **Pilih** — dari deskripsi, atau buat 3 hero + halaman perbandingan.
4. **Bangun** — implementasi penuh.
5. **Screenshot** — desktop + mobile, lihat sendiri.
6. **Review** — reviewer independen atau self-review.
7. **Kurangi** — hapus yang tidak membantu.

## 4. Brief untuk AI agent

Sebelum meminta agent menulis kode:

```markdown
Kita akan membangun [nama modul] di repo ini.

Baca dulu:
- PLAN.md
- docs/02-information-architecture.md
- docs/03-tech-stack.md
- docs/04-architecture.md
- docs/06-design-system.md
- docs/07-apps/keluarga.md
- docs/08-data-auth-security.md

Arah desain yang dipakai: [A/B/C]

Tugas fase ini:
[deskripsi satu vertical slice]

Batasan:
- Jangan mengubah stack tanpa ADR.
- Jangan menambah dependency baru tanpa alasan.
- Ikuti batas modul features/*.
- Semua query wajib household-scoped.
- Semua input divalidasi Zod di server.
- Jangan menyentuh aplikasi lama; mereka hanya tautan.

Definition of done:
- [ ] ...
- [ ] ...
```

## 5. Build loop

### Step 1 — Pahami

- Baca dokumen relevan.
- Cek kode yang ada.
- Identifikasi file yang akan diubah.
- Tulis rencana 3–7 langkah.

### Step 2 — Desain (jika perlu)

- Tentukan arah.
- Buat hero atau halaman contoh.
- Screenshot, lihat, perbaiki.

### Step 3 — Implementasi

- Schema/data model.
- Query + server action.
- UI.
- State: loading, empty, error, success.
- Responsive.

### Step 4 — Verifikasi

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- E2E alur utama.
- Screenshot halaman.
- Cek manual di preview.

### Step 5 — Dokumentasi

- Update spec jika berubah.
- Tambah ADR jika keputusan arsitektur.
- Update checklist/runbook.

### Step 6 — Deploy

- PR + preview.
- Review.
- Merge.
- Smoke test.
- Monitor.

## 6. Contoh prompt singkat

```text
Baca PLAN.md, docs/07-apps/keluarga.md, dan docs/06-design-system.md.
Arah desain: "Rumah" (A).

Implementasikan vertical slice: CRUD akun + saldo awal.
Ikuti arsitektur di docs/04.
Jangan sentuh modul lain.
Sertakan validasi Zod, household scoping, unit test, dan E2E.
Screenshot halaman di 390px dan 1440px sebelum selesai.
Setelah selesai, jalankan lint, typecheck, test, build.
```

## 7. Kapan memakai multi-agent

Gunakan orchestration hanya jika:

- Pekerjaan bisa dipecah menjadi bagian independen.
- Banyak file/aplikasi bisa dikerjakan paralel.
- Butuh verifikasi adversarial.
- Konteks terlalu besar untuk satu agent.

Untuk proyek ini — satu aplikasi, satu modul utama — **eksekusi langsung lebih efisien**.

## 8. Review checklist PR

- [ ] Scope sesuai brief.
- [ ] Arah desain diikuti.
- [ ] Tidak ada dependency tak perlu.
- [ ] Tidak ada data lintas household.
- [ ] Validasi server.
- [ ] Visibilitas diterapkan.
- [ ] Loading/empty/error state.
- [ ] Responsive + a11y.
- [ ] Test relevan.
- [ ] Screenshot dilampirkan.
- [ ] Dokumentasi diperbarui.
- [ ] Tidak ada secret.

## 9. Retrospective

Setelah setiap fase:

- Apa yang lebih lambat dari perkiraan?
- Keputusan mana yang perlu jadi ADR?
- Apa yang bisa disederhanakan?
- Apakah dokumentasi masih benar?
- Satu perbaikan untuk fase berikutnya?

Tulis di PR/issue, bukan hanya di kepala.

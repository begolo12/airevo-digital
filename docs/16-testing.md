# 16 — Testing

## 1. Prinsip

- Test untuk **risiko**, bukan untuk mengejar coverage.
- Logika uang, tanggal, auth, isolasi household, dan visibilitas adalah prioritas tertinggi.
- E2E fokus pada alur yang jika rusak membuat aplikasi tidak bisa dipakai.
- Test harus cepat, deterministik, dan tidak bergantung pada data production.

## 2. Piramida test

```text
        E2E (Playwright)         sedikit, alur kritis
      Integration (Vitest)       server actions + DB
    Unit (Vitest)                logika murni
```

| Lapisan | Tool | Cakupan |
| --- | --- | --- |
| Unit | Vitest | Format uang, kalkulasi bulan, validasi Zod, progress, proyeksi tujuan |
| Integration | Vitest + Postgres | Query, server action, isolasi household, visibilitas |
| E2E | Playwright | Login, Keluarga (akun → transaksi → anggaran → tagihan → tujuan), contact form |
| A11y | axe + manual | Halaman utama, hub, dashboard, form |
| Visual | Playwright screenshot | Marketing + dashboard (desktop/mobile) |

## 3. Unit test

### Keuangan

- Format IDR: `1500000` → `Rp1.500.000`.
- Penjumlahan decimal tanpa floating point.
- Saldo akun: opening + income − expense + transfer masuk − transfer keluar.
- Transfer tidak masuk income/expense.
- Batas bulan: 31 Jan → 1 Feb; tahun kabisat.
- Anggaran progress: 0%, 80%, 100%, >100%.
- Validasi: amount ≤ 0 ditolak; transfer tanpa tujuan ditolak; akun sama ditolak.
- Tagihan bulanan dengan `due_day` 31 → hari terakhir bulan (Feb, Apr).
- Tagihan tidak membuat transaksi ganda untuk periode yang sama.
- Proyeksi tujuan: target tanggal lewat, kontribusi disarankan, `saved >= target`.

### Keluarga

- Visibilitas: `private` hanya pembuat + owner; `shared` semua; `household` dewasa.
- Role: `child` tidak bisa membaca transaksi `household`.
- Kalender: ulang tahun berulang tahunan.
- Tugas: `completed_at` diisi saat `done`, dikosongkan saat dibuka lagi.

### Umum

- Zod schema menolak input kosong/terlalu panjang.
- Format tanggal `Asia/Jakarta`.
- Permission helper dan `visibilityFilter`.

## 4. Integration test

- Gunakan Postgres test (Docker/Neon branch), bukan mock ORM.
- Jalankan migrasi sebelum test.
- Truncate tabel di antara test atau gunakan transaksi rollback.
- Test:
  - Onboarding household + anggota.
  - Create transaction + saldo.
  - Transfer + saldo dua akun.
  - Void transaction.
  - Anggaran: terpakai dan sisa.
  - Tagihan: tandai dibayar membuat transaksi + majukan tanggal.
  - Tujuan: kontribusi menambah `saved_amount`.
  - Household isolation: user A tidak bisa update data household B.
  - Visibility isolation: `child` tidak bisa membaca transaksi `household`.
  - Audit log tercatat.
  - Server action menolak session tidak valid.

Contoh setup:

```ts
// tests/integration/setup.ts
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "@/lib/db";

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./src/lib/db/migrations" });
});

beforeEach(async () => {
  await db.execute(sql`
    TRUNCATE TABLE
      finance.transactions,
      finance.accounts,
      finance.categories,
      finance.budgets,
      finance.bills,
      finance.goals
    CASCADE
  `);
});
```

## 5. E2E test

### Alur kritis

1. **Marketing + hub**
   - Home load, nav ke `/aplikasi`, `/work`, `/contact`.
   - `/aplikasi` menampilkan semua entri registry.
   - Aplikasi eksternal punya tautan keluar yang benar.
   - Contact form validasi + sukses (mock Resend).
2. **Auth**
   - Login valid → redirect ke `/keluarga`.
   - Login invalid → error.
   - Akses `/keluarga` tanpa login → redirect `/login`.
   - Logout → session hilang.
3. **Keluarga — keuangan**
   - Onboarding household → anggota → akun → kategori.
   - Catat transaksi → saldo berubah.
   - Transfer → saldo dua akun berubah.
   - Anggaran → progress benar.
   - Void transaksi → saldo kembali.
4. **Keluarga — rencana**
   - Buat tagihan → tandai dibayar → transaksi otomatis dibuat.
   - Buat tujuan → kontribusi → progress benar.
   - Dashboard menampilkan angka yang sama dengan halaman detail.
5. **Isolasi**
   - User household B tidak bisa membuka data household A.
   - Anggota `child` tidak melihat transaksi `household`.

### Aturan

- Gunakan `data-testid` hanya jika perlu; utamakan role/label.
- Jangan bergantung pada urutan test.
- Seed data via API/fixture, bukan UI, untuk test yang tidak menguji UI.
- Screenshot/trace saat gagal.
- Jalankan di CI dengan database test.

## 6. Aksesibilitas

- axe pada home, hub, login, dashboard Keluarga, form transaksi.
- Keyboard:
  - Tab melalui nav, form, dialog.
  - ESC menutup dialog.
  - Focus kembali ke trigger.
- Screen reader spot check (NVDA/VoiceOver).
- Kontras dicek dengan tool.
- `prefers-reduced-motion`.

## 7. Performance

- Lighthouse CI untuk marketing (mobile).
- Bundle analyzer sebelum launch.
- Cek gambar: ukuran, format, `sizes`.
- Cek font: jumlah file, subset.
- Cek query: N+1, index, pagination.
- Target: LCP < 2,5 s, INP < 200 ms, CLS < 0,1.

## 8. Manual QA matrix

| Perangkat | Browser | Fokus |
| --- | --- | --- |
| Desktop 1440px | Chrome, Firefox, Safari, Edge | Layout, form, tabel |
| Tablet 768px | Safari iPad, Chrome | Sidebar, tabel |
| Mobile 390px | iOS Safari, Chrome Android | Nav, form, chart |
| Mobile 360px | Chrome | Overflow, tap target |

Cek juga:

- Zoom 200%.
- Dark mode.
- Slow 3G (DevTools).
- Offline/error state.
- Refresh di halaman dalam (deep link).

## 9. CI

### PR

- Lint.
- Typecheck.
- Unit test.
- Build.
- Integration test (Postgres service).
- E2E smoke (opsional, jika cepat).

### Main

- Semua di atas.
- E2E penuh terhadap preview/production-like environment.
- Lighthouse CI.
- Deploy production setelah hijau.

## 10. Test data

- Jangan memakai data production.
- Seed demo:
  - 1 household, 4 anggota (owner, adult, teen, child).
  - 3 akun.
  - 8 kategori.
  - 20 transaksi (termasuk transfer dan satu `private`).
  - 3 anggaran bulanan.
  - 2 tagihan aktif.
  - 2 tujuan.
  - 5 acara kalender, 5 tugas, 1 daftar belanja.
- Data keuangan fiktif, bukan data asli.
- Reset database test sebelum suite.

## 11. Bug severity

| Severity | Definisi | Aksi |
| --- | --- | --- |
| P0 | Data loss, security breach, app down | Hotfix segera, rollback jika perlu |
| P1 | Alur utama gagal (login, transaksi) | Perbaiki sebelum launch |
| P2 | Fitur minor rusak, workaround ada | Masukkan sprint berikut |
| P3 | Kosmetik/typo | Backlog |

## 12. Release gate

- [ ] Semua test P0/P1 lulus.
- [ ] Tidak ada critical/high vulnerability.
- [ ] E2E alur kritis lulus.
- [ ] Test isolasi household dan visibilitas lulus.
- [ ] Lighthouse target tercapai.
- [ ] Backup terbaru tersedia.
- [ ] Rollback plan jelas.
- [ ] Smoke test production setelah deploy.

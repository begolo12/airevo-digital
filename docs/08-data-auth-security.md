# 08 — Data, Auth, dan Security

## 1. Prinsip

1. **Private by default.** Aplikasi internal tidak punya pendaftaran publik dan tidak diindeks.
2. **Least privilege.** Setiap query dan aksi dibatasi household, role, dan visibilitas.
3. **Validate at the boundary.** Semua input dari client divalidasi di server.
4. **Never trust the client.** `householdId`, `userId`, role, dan `visibility` tidak boleh datang dari form.
5. **Money and dates are exact.** Tidak ada floating point untuk uang; tanggal punya zona waktu yang jelas.
6. **Recoverable.** Backup, audit log, dan soft delete untuk data penting.

## 2. Auth

### 2.1 Pilihan

**Better Auth** dengan Drizzle adapter.

- Email/password untuk login utama.
- Google OAuth (opsional, disarankan).
- Passkey (nanti).
- Session disimpan di database.
- Pendaftaran publik dimatikan setelah owner dibuat.

### 2.2 Alur login

```text
/login
  → user submit email/password atau Google
  → Better Auth verifies
  → session cookie dibuat (HttpOnly, Secure, SameSite=Lax)
  → redirect ke /keluarga
```

### 2.3 Session

- Cookie `HttpOnly`, `Secure` di production, `SameSite=Lax`.
- Masa berlaku 7 hari; rolling session.
- Session disimpan di tabel `session` (Better Auth).
- Logout menghapus session di server, bukan hanya cookie.
- Jangan menyimpan role hanya di cookie; ambil dari database.

### 2.4 Proteksi route

- `src/proxy.ts`:
  - Cek keberadaan cookie session.
  - Redirect ke `/login?next=...` jika tidak ada.
  - **Hanya optimistis**; bukan otorisasi final.
- Layout/page/action:
  - `requireSession()` → redirect jika tidak valid.
  - `requireHouseholdMember(householdId, role)` → 403 jika tidak berhak.
- Jangan pernah hanya mengandalkan UI untuk menyembunyikan tombol.

### 2.5 Pendaftaran

- Setelah owner pertama dibuat, matikan sign-up.
- Jika butuh mengundang anggota:
  - Buat undangan dengan token sekali pakai.
  - Email undangan via Resend.
  - Token kedaluwarsa 24–72 jam.
  - Role ditentukan saat undangan dibuat.
- Jangan menyediakan halaman `/register` publik di MVP.

### 2.6 OAuth

- Callback URL:
  - Local: `http://localhost:3000/api/auth/callback/google`
  - Production: `https://airevo-digital.my.id/api/auth/callback/google`
- Batasi redirect URI di Google Cloud Console.
- Jangan commit client secret.
- Gunakan state/PKCE dari Better Auth; jangan implementasi sendiri.

## 3. Household dan RBAC

### 3.1 Household

- Satu household = satu keluarga.
- Semua data aplikasi terikat `household_id`.
- Satu user bisa menjadi anggota beberapa household di masa depan (mis. keluarga besar).

### 3.2 Role

| Role | Hak |
| --- | --- |
| `owner` | Semua, termasuk undang anggota, hapus data, pengaturan |
| `adult` | CRUD keuangan, rencana, kalender, tugas, dokumen |
| `teen` | Ringkasan, transaksi pribadi, kalender, tugas |
| `child` | Tugas, kalender, tujuan yang dibagikan |
| `viewer` | Read-only pada bagian yang dibagikan |

### 3.3 Visibilitas data

Selain role, data sensitif punya `visibility`:

| Nilai | Siapa yang bisa melihat |
| --- | --- |
| `private` | Pembuat + `owner` |
| `household` | `owner` + `adult` |
| `shared` | Semua anggota aktif |

Filter role dan visibilitas diterapkan **di query**, bukan di UI.

### 3.4 Helper otorisasi

```ts
// src/lib/permissions.ts
export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return session;
}

export async function requireHouseholdMember(
  householdId: string,
  allowed: Role[] = ["owner", "adult"],
) {
  const session = await requireSession();
  const member = await getHouseholdMember(session.user.id, householdId);
  if (!member || !allowed.includes(member.role)) forbidden();
  return { session, member };
}

export function visibilityFilter(member: Member) {
  if (member.role === "owner") return undefined;
  if (member.role === "adult") {
    return or(eq(tx.visibility, "household"), eq(tx.visibility, "shared"), eq(tx.createdBy, member.userId));
  }
  return eq(tx.visibility, "shared");
}
```

- `householdId` diambil dari membership, bukan dari body.
- Jangan pernah mempercayai `householdId` yang dikirim client.

## 4. Database

### 4.1 Schema

| Schema | Isi |
| --- | --- |
| `public` | `user`, `session`, `account`, `verification`, `households`, `household_members`, `audit_logs` |
| `finance` | `accounts`, `categories`, `transactions`, `budgets`, `bills`, `bill_payments`, `goals`, `goal_contributions`, `debts`, `assets`, `insurances` |
| `family` | `events`, `chores`, `documents`, `health_records`, `education_records`, `shopping_lists`, `shopping_items` |

Pemisahan schema membuat batas domain terlihat jelas dan memudahkan migrasi.

### 4.2 Tabel inti household

**`public.households`**

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `id` | uuid | PK |
| `name` | text | 1–100 |
| `slug` | text | unik, lowercase |
| `currency` | char(3) | default `IDR` |
| `timezone` | text | default `Asia/Jakarta` |
| `created_at` | timestamptz | default now |
| `updated_at` | timestamptz | default now |

**`public.household_members`**

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `id` | uuid | PK |
| `household_id` | uuid | FK, not null |
| `user_id` | uuid | FK user, nullable |
| `name` | text | 1–100 |
| `relationship` | enum | `self`, `spouse`, `child`, `parent`, `sibling`, `other` |
| `role` | enum | `owner`, `adult`, `teen`, `child`, `viewer` |
| `birth_date` | date | nullable |
| `status` | enum | `active`, `inactive` |
| `created_at` | timestamptz | default now |

Unique: `(household_id, user_id)` jika `user_id` tidak null.

### 4.3 Konvensi

- Primary key: `uuid` (`defaultRandom()`).
- Timestamp: `timestamptz`, default `now()`, `updated_at` di-update di application layer.
- Uang: `numeric(18,2)`.
- Tanggal transaksi: `date`.
- Enum: Postgres enum atau text + check; gunakan enum untuk nilai stabil.
- Semua tabel app punya `household_id` dan index.
- Soft delete: `archived_at` atau `voided_at`, bukan hard delete untuk data penting.
- Foreign key dengan `onDelete: restrict` untuk data keuangan.
- Jangan memakai nama tabel/skolom yang sama dengan reserved word.

### 4.4 Query scoping

```ts
// BENAR
const rows = await db
  .select()
  .from(transactions)
  .where(
    and(
      eq(transactions.householdId, householdId),
      eq(transactions.id, id),
      visibilityFilter(member),
    ),
  );

// SALAH — tidak ada filter household
const rows = await db.select().from(transactions).where(eq(transactions.id, id));
```

- Buat repository function yang **wajib** menerima `householdId` dan konteks akses.
- Jangan ekspos query mentah ke komponen.
- Untuk update/delete, gunakan `where(and(eq(id), eq(householdId)))` dan cek jumlah row yang terpengaruh.

### 4.5 Migrasi

- `drizzle-kit generate` → review SQL → commit.
- `drizzle-kit migrate` di CI/deploy.
- Jangan `db push` ke production.
- Migrasi harus idempotent dan backward-compatible.
- Backup sebelum migrasi besar.
- Uji migrasi di branch Neon preview.

### 4.6 Seed

- Seed development: satu household demo, anggota, akun, kategori, transaksi, anggaran, tagihan, tujuan.
- Seed production: hanya household owner + kategori default.
- Jangan pernah menjalankan seed demo di production.

## 5. Validasi input

- Zod schema untuk setiap form dan server action.
- Validasi di server **wajib**, validasi client hanya untuk UX.
- Trim string; tolak string kosong.
- Batasi panjang teks.
- Validasi enum dengan `z.enum`.
- Validasi tanggal dengan `z.coerce.date()` atau string `YYYY-MM-DD`.
- Validasi uang dengan string decimal, bukan `number`.
- Kembalikan `fieldErrors` yang terstruktur.

Contoh:

```ts
export const createTransactionSchema = z.object({
  type: z.enum(["income", "expense", "transfer"]),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  occurredAt: z.string().date(),
  accountId: z.string().uuid(),
  toAccountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  description: z.string().trim().min(1).max(200),
}).superRefine((data, ctx) => {
  if (data.type === "transfer" && !data.toAccountId) {
    ctx.addIssue({ code: "custom", path: ["toAccountId"], message: "Akun tujuan wajib" });
  }
});
```

## 6. Rate limiting

| Endpoint | Limit | Tujuan |
| --- | --- | --- |
| Login | 5/menit per IP + email | Brute force |
| Contact form | 3/jam per IP | Spam |
| Auth callback | 10/menit per IP | Abuse |
| Upload (fase C) | 20/jam per user | Storage abuse |

- Gunakan Upstash Ratelimit.
- Kembalikan 429 dengan pesan ramah.
- Jangan membocorkan apakah email terdaftar.
- Log rate limit hits untuk monitoring.

## 7. HTTP headers

Set di `next.config.ts`:

```ts
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];
```

- CSP: mulai dengan `Content-Security-Policy-Report-Only`, lalu enforce setelah semua sumber diketahui.
- Jangan memakai `unsafe-inline` untuk script di production jika bisa dihindari.
- HSTS hanya setelah yakin semua subdomain HTTPS.

## 8. File upload (fase C)

- Gunakan private storage (Vercel Blob dengan akses privat, atau Cloudflare R2 dengan signed URL).
- Batas ukuran: 5 MB per file.
- MIME allowlist: PDF, JPEG, PNG, WebP.
- Validasi magic bytes, bukan hanya `Content-Type`.
- Nama file di-generate ulang; jangan pakai nama asli.
- Jangan pernah menyajikan file sensitif dengan URL publik permanen.
- Scan malware jika memungkinkan (ClamAV/VirusTotal API).
- Hapus file saat transaksi dihapus permanen (jarang; biasanya void).

## 9. Secrets

- Simpan di Vercel Environment Variables, bukan repo.
- `.env.local` di `.gitignore`.
- `.env.example` hanya berisi nama dan placeholder.
- Rotasi `BETTER_AUTH_SECRET` dengan strategi `BETTER_AUTH_SECRETS` (dukungan multiple secret) agar session lama tidak langsung mati.
- Jangan log token/connection string.
- Akses dashboard Vercel/Neon dengan 2FA.
- Batasi anggota tim Vercel.

## 10. Backup dan restore

| Data | Backup | Frekuensi | Retensi |
| --- | --- | --- | --- |
| Postgres | Neon PITR / branch | continuous (sesuai plan) | 7–30 hari |
| Postgres | `pg_dump` harian ke storage privat | harian | 30 hari |
| Kode | GitHub | setiap push | selamanya |
| Env | password manager / Vercel | saat berubah | — |

- Uji restore minimal sekali sebelum launch.
- Dokumentasikan langkah restore di [11-runbook.md](11-runbook.md).
- Backup tidak boleh disimpan di repo publik.

## 11. Privasi

- Kumpulkan data minimal: nama, email, isi pesan contact form.
- Jangan menaruh data keuangan asli di screenshot publik.
- Analytics: hindari cookie pihak ketiga; gunakan Vercel Analytics.
- Jika memakai PostHog, tampilkan consent dan dokumentasikan di privacy policy.
- Sediakan halaman kebijakan privasi.
- Hapus data atas permintaan (contact form) sesuai kebijakan.

## 12. Threat model ringkas

| Ancaman | Dampak | Mitigasi |
| --- | --- | --- |
| Brute force login | Akun diambil alih | Rate limit, password kuat, 2FA nanti |
| IDOR (akses data ID lain) | Data household lain bocor | Filter `household_id` di semua query |
| Kebocoran ke anak | Anak melihat data dewasa | Filter `visibility` + role di query |
| XSS | Session dicuri | React escaping, CSP, sanitasi MDX user-generated |
| CSRF | Aksi tidak sah | Better Auth CSRF, SameSite cookie, server actions |
| SQL injection | Data rusak/bocor | Drizzle parameterized query |
| Secret leak | Akses penuh | Env vars, `.gitignore`, rotasi |
| Spam contact form | Email penuh | Rate limit, honeypot, validasi |
| File upload abuse | Malware/storage | Private storage, MIME/size, scan |
| Dependency compromise | Backdoor | Lockfile, Renovate, audit, review |
| Data loss | Kehilangan catatan | Backup, PITR, uji restore |

## 13. Audit log

Catat minimal:

- Siapa (`actor_id`).
- Kapan (`created_at`).
- Apa (`action`, `entity`, `entity_id`).
- Sebelum/sesudah untuk perubahan sensitif (transaksi, akun, anggaran, tagihan, tujuan).
- Jangan menyimpan password/token di audit log.

Audit log tidak boleh bisa diedit dari UI. Hanya owner yang bisa melihat (fase C).

## 14. Incident response

1. **Deteksi:** Sentry/alert/uptime.
2. **Batasi:** nonaktifkan endpoint atau rotate secret.
3. **Investigasi:** log Vercel, audit log, Neon.
4. **Pulihkan:** rollback deploy / restore DB.
5. **Komunikasi:** beri tahu pengguna jika data terdampak.
6. **Pelajaran:** update checklist dan dokumen.

## 15. Checklist keamanan sebelum launch

- [ ] Tidak ada halaman register publik.
- [ ] Semua route app dilindungi.
- [ ] Semua query memfilter `household_id`.
- [ ] Filter `visibility` diterapkan untuk role non-owner.
- [ ] Test isolasi household dan visibilitas lulus.
- [ ] Semua server action memvalidasi session + Zod.
- [ ] Rate limit login dan contact form.
- [ ] Security headers aktif.
- [ ] CSP report-only dipasang.
- [ ] `.env` tidak masuk git.
- [ ] 2FA di Vercel/Neon/GitHub.
- [ ] Backup dan restore diuji.
- [ ] Sentry menerima error.
- [ ] Dependency audit bersih dari critical/high.
- [ ] Tidak ada data sensitif di log.
- [ ] Halaman app `noindex`.

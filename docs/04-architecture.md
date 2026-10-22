# 04 — Architecture

## 1. Gaya arsitektur

**Modular monolith** di atas Next.js App Router.

- Satu deployable unit (satu project Vercel).
- Satu modul bisnis yang dibangun di sini: **Keluarga**.
- Aplikasi lama **tidak** ada di dalam aplikasi ini; mereka tautan di hub.
- Shared infrastructure: auth, database, UI, config, observability.
- Modul baru bisa ditambahkan tanpa mengubah hub.

```text
┌──────────────────────────────────────────────────────────────┐
│                        Next.js App                           │
│                                                              │
│  (marketing)         (auth)          (apps)                  │
│  /, /work,           /login          /keluarga/*             │
│  /aplikasi, /about                                           │
│       │                  │                 │                 │
│       └──────────────────┴─────────────────┘                 │
│                          │                                   │
│               Shared UI + Config + Lib                       │
│                          │                                   │
│                  features/keluarga                           │
│        accounts, transactions, budgets, bills, goals,        │
│        events, chores, documents, shopping                   │
│                          │                                   │
│               Server Actions / Queries                       │
│                          │                                   │
│                    Drizzle ORM                               │
└──────────────────────────┼───────────────────────────────────┘
                           │
                           ▼
                  Neon PostgreSQL
                  ├── public  (auth, households, members)
                  ├── finance (uang)
                  └── family  (kehidupan)
```

**Aplikasi lama** hidup di deployment masing-masing dan hanya muncul sebagai entri di `src/config/apps.ts`:

```text
Hub (/aplikasi)
  ├── Keluarga  → /keluarga            (di app ini)
  ├── Ops       → https://... (app lama)
  └── Keuangan  → https://... (app lama)
```

## 2. Struktur folder

```text
.
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── e2e.yml
├── docs/
├── public/
│   ├── images/
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── (marketing)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── aplikasi/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [slug]/page.tsx
│   │   │   ├── work/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [slug]/page.tsx
│   │   │   ├── about/page.tsx
│   │   │   └── contact/page.tsx
│   │   ├── (auth)/
│   │   │   ├── layout.tsx
│   │   │   └── login/page.tsx
│   │   ├── (apps)/
│   │   │   ├── layout.tsx
│   │   │   └── keluarga/
│   │   │       ├── layout.tsx
│   │   │       ├── page.tsx
│   │   │       ├── keuangan/
│   │   │       │   ├── page.tsx
│   │   │       │   ├── transaksi/page.tsx
│   │   │       │   ├── akun/page.tsx
│   │   │       │   ├── kategori/page.tsx
│   │   │       │   ├── anggaran/page.tsx
│   │   │       │   ├── tagihan/page.tsx
│   │   │       │   ├── utang/page.tsx
│   │   │       │   └── aset/page.tsx
│   │   │       ├── rencana/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [id]/page.tsx
│   │   │       ├── kalender/page.tsx
│   │   │       ├── tugas/page.tsx
│   │   │       ├── belanja/page.tsx
│   │   │       ├── anggota/page.tsx
│   │   │       ├── dokumen/page.tsx
│   │   │       ├── kesehatan/page.tsx
│   │   │       ├── pendidikan/page.tsx
│   │   │       ├── laporan/page.tsx
│   │   │       └── pengaturan/page.tsx
│   │   ├── api/
│   │   │   ├── auth/[...all]/route.ts
│   │   │   └── health/route.ts
│   │   ├── layout.tsx
│   │   ├── not-found.tsx
│   │   ├── error.tsx
│   │   ├── global-error.tsx
│   │   ├── sitemap.ts
│   │   ├── robots.ts
│   │   └── opengraph-image.tsx
│   ├── components/
│   │   ├── ui/                 # shadcn components
│   │   ├── marketing/          # navbar, hero, footer, case study card
│   │   ├── app/                # sidebar, app switcher, page header
│   │   └── shared/             # theme toggle, empty state, error state
│   ├── features/
│   │   └── keluarga/
│   │       ├── components/
│   │       ├── server/
│   │       │   ├── queries.ts
│   │       │   ├── actions.ts
│   │       │   ├── money.ts
│   │       │   ├── bills.ts
│   │       │   └── goals.ts
│   │       ├── schema.ts
│   │       ├── types.ts
│   │       └── constants.ts
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── auth-client.ts
│   │   ├── db/
│   │   │   ├── index.ts
│   │   │   ├── schema/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── household.ts
│   │   │   │   ├── finance.ts
│   │   │   │   ├── family.ts
│   │   │   │   └── index.ts
│   │   │   └── migrations/
│   │   ├── env.ts
│   │   ├── format.ts
│   │   ├── dates.ts
│   │   ├── money.ts
│   │   ├── permissions.ts
│   │   ├── rate-limit.ts
│   │   └── utils.ts
│   ├── config/
│   │   ├── site.ts
│   │   ├── apps.ts
│   │   └── navigation.ts
│   ├── content/
│   │   ├── work/
│   │   ├── apps/
│   │   └── insights/
│   ├── styles/
│   │   └── globals.css
│   └── proxy.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── components.json
├── drizzle.config.ts
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── postcss.config.mjs
├── tsconfig.json
└── vitest.config.ts
```

## 3. Batas modul

Aturan yang harus dipatuhi:

1. `features/keluarga` adalah satu-satunya modul aplikasi yang dibangun di repo ini.
2. Modul ini boleh mengimpor:
   - `@/components/ui/*`
   - `@/components/shared/*`
   - `@/lib/*`
   - `@/config/*`
3. `app/(apps)/keluarga/*` hanya boleh mengimpor dari `features/keluarga`, `components/app`, dan shared.
4. Aplikasi lama **tidak** diimpor. Mereka hanya entri di `@/config/apps`.
5. Jangan menaruh query database langsung di file page; letakkan di `features/*/server/queries.ts`.
6. Jangan menaruh `"use client"` di page yang bisa tetap server component.
7. File `server/actions.ts` wajib `import "server-only"` dan memvalidasi session + input.
8. Jangan membuat modul baru di `features/` sebelum spec-nya ada di `docs/07-apps/`.

**Enforcement:** jika nanti ada modul kedua, gunakan ESLint `no-restricted-imports` untuk melarang import lintas fitur.

```js
{
  files: ["src/features/keluarga/**/*"],
  rules: {
    "no-restricted-imports": ["error", {
      patterns: ["@/features/*/!(keluarga)/**"]
    }]
  }
}
```

## 4. Alur data

### Baca data (Server Component)

```text
Page (RSC)
  → requireSession()
  → requireHouseholdMember()
  → queries.listTransactions(householdId, member)
  → Drizzle (household + visibility filter)
  → render
```

- Data fetching langsung di server component untuk halaman yang butuh data awal.
- Jangan membuat API route hanya untuk konsumsi internal; panggil query langsung.
- Gunakan `Suspense` + `loading.tsx` untuk halaman berat.
- Cache default: dinamis untuk data app; statis/ISR untuk marketing.

### Mutasi data (Server Action)

```text
Form (client)
  → useActionState / form action
  → server action
  → requireSession()
  → parse Zod
  → authorize (household + role + visibility)
  → db.transaction(...)
  → revalidatePath()
  → return { ok, message, fieldErrors }
```

- Semua input divalidasi dengan Zod di server, walaupun sudah divalidasi di client.
- Jangan pernah menerima `householdId` dari client; ambil dari session.
- Gunakan `db.transaction()` untuk operasi yang mengubah lebih dari satu tabel.
- Kembalikan error yang aman; jangan bocorkan stack trace ke UI.

### API route

Dipakai hanya untuk:

- Auth handler (`/api/auth/[...all]`).
- Health check.
- Webhook eksternal (Resend, pembayaran) di masa depan.
- Upload handler (fase C).

## 5. Auth dan session

- Better Auth menangani session, cookie, OAuth, dan CSRF.
- `auth.ts` di `src/lib/auth.ts`; handler di `src/app/api/auth/[...all]/route.ts`.
- `proxy.ts` melakukan **optimistic redirect** untuk `/keluarga` jika tidak ada cookie session.
- Otorisasi sebenarnya dilakukan di layout/page/action dengan `requireSession()` dan `requireHouseholdMember()`.
- Jangan pernah mengandalkan `proxy.ts` sebagai satu-satunya proteksi.
- Session cookie: `HttpOnly`, `Secure` di produksi, `SameSite=Lax`.
- Tidak ada pendaftaran publik; anggota diundang oleh owner.

## 6. Household dan isolasi data

Setiap tabel aplikasi memiliki `household_id`.

```text
household
  ├── finance.accounts
  ├── finance.categories
  ├── finance.transactions
  ├── finance.budgets
  ├── finance.bills
  ├── finance.goals
  ├── family.events
  ├── family.chores
  └── ...
```

Aturan:

- `householdId` selalu berasal dari session, bukan dari URL/body.
- Setiap query aplikasi wajib menyertakan `eq(table.householdId, householdId)`.
- Buat helper `requireHouseholdMember(userId, householdId)` yang mengembalikan role.
- Untuk operasi berdasarkan `id`, query harus `where(and(eq(table.id, id), eq(table.householdId, householdId)))`.
- Jangan memakai `db.select().from(table).where(eq(table.id, id))` tanpa filter household.
- Filter visibilitas (`private`, `household`, `shared`) diterapkan di query yang sama.
- Tambahkan test isolasi: user A tidak bisa membaca data household B, dan `child` tidak bisa membaca transaksi `household`.

## 7. App registry

`src/config/apps.ts` menjadi satu sumber untuk home, hub, sidebar, dan halaman marketing.

```ts
export type AppStatus = "live" | "beta" | "building" | "soon";

export type AppEntry = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  href: string;
  external?: boolean;
  marketingHref: string;
  icon: string;
  accent: string;
  status: AppStatus;
  requiresAuth: boolean;
  builtHere?: boolean;
};

export const apps: AppEntry[] = [
  {
    id: "keluarga",
    name: "Keluarga",
    tagline: "Uang, rencana, dan ritme rumah dalam satu tempat.",
    description:
      "Catat arus kas, atur anggaran, pantau tagihan, dan capai tujuan keluarga.",
    href: "/keluarga",
    marketingHref: "/aplikasi/keluarga",
    icon: "House",
    accent: "terracotta",
    status: "building",
    requiresAuth: true,
    builtHere: true,
  },
  {
    id: "ops",
    name: "Ops",
    tagline: "Kelola klien, proyek, dan task.",
    description: "Aplikasi operasional yang sudah berjalan.",
    href: "https://...",
    external: true,
    marketingHref: "/aplikasi/ops",
    icon: "Briefcase",
    accent: "blue",
    status: "live",
    requiresAuth: true,
  },
];
```

Menambah aplikasi = menambah satu entri. Aplikasi eksternal cukup `href` + `external: true`.

## 8. Error handling

| Lapisan | Strategi |
| --- | --- |
| Server action | Return `{ ok: false, message, fieldErrors }`; log detail ke Sentry |
| Page | `error.tsx` dengan pesan ramah + tombol coba lagi |
| Global | `global-error.tsx` minimal |
| 404 | `not-found.tsx` dengan link ke home/work |
| API | JSON `{ error: { code, message } }` + status yang benar |
| Database | Jangan tampilkan error SQL ke user |
| Form | Tampilkan error per field + ringkasan |

Gunakan `ErrorBoundary` di app shell agar satu widget error tidak mematikan seluruh halaman.

## 9. Performance

- Server Components sebagai default; `"use client"` hanya untuk interaksi.
- `next/image` untuk semua gambar; ukuran dan `sizes` eksplisit.
- `next/font` untuk font; subset Latin.
- Dynamic import untuk chart, editor, dan komponen berat.
- Hindari animasi layout yang mahal; gunakan transform/opacity.
- Batasi dependency client-side.
- Audit bundle dengan `@next/bundle-analyzer` sebelum launch.
- Marketing page: static generation + ISR jika perlu.
- App page: dynamic, tetapi gunakan query yang di-index dan pagination.

## 10. Migrasi ke microfrontends (jika diperlukan)

Pemicu yang sah:

- Aplikasi butuh deploy independen karena tim/ritme rilis berbeda.
- Ada app dengan framework berbeda.
- Build satu app sudah > 5 menit dan menghambat.
- Ada kebutuhan isolasi kegagalan yang nyata.

Langkah migrasi:

1. Pecah repo menjadi `apps/web`, `apps/keluarga`, `apps/ops`, `apps/keuangan` + `packages/ui`, `packages/db`, `packages/auth`.
2. Buat satu Vercel project per app.
3. Buat Microfrontends group di Vercel.
4. Tambah `microfrontends.json` di default app.
5. Bungkus `next.config.ts` dengan `withMicrofrontends`.
6. Pastikan cookie auth berlaku untuk domain induk (bukan host per app).
7. Uji asset prefix, navigasi, dan preview.
8. Baru pindahkan traffic.

Jangan lakukan ini sebelum ada pemicu di atas.

## 11. Konvensi kode

- Nama file: `kebab-case.tsx`, komponen `PascalCase`.
- Server-only module: `import "server-only";`.
- Query function: `getX`, `listX`, `countX`.
- Action: `createX`, `updateX`, `deleteX`, `archiveX`.
- Schema: `createXSchema`, `updateXSchema`.
- Semua tanggal-waktu disimpan `timestamptz` UTC; ditampilkan di `Asia/Jakarta`. Tanggal transaksi memakai `date`.
- Semua uang disimpan `numeric(18,2)`; format di layer UI.
- Tidak ada `any`; gunakan `unknown` + Zod.
- Tidak ada `console.log` di produksi; gunakan logger/Sentry.
- Komentar menjelaskan **kenapa**, bukan **apa**.

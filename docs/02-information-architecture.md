# 02 — Information Architecture

## 1. Prinsip

- **Satu domain, dua dunia:** marketing yang publik dan aplikasi yang private.
- **Hub, bukan daftar link.** Aplikasi lama punya tempat yang jelas, bukan tombol tersembunyi.
- **URL bisa ditebak.** `/keluarga/keuangan/transaksi` lebih baik daripada `/dashboard?app=family&tab=tx`.
- **Satu halaman, satu tujuan.**
- **Halaman app tidak diindeks.** Halaman marketing dioptimalkan untuk SEO.
- **Navigasi konsisten** antara marketing dan app, tanpa memaksa keduanya terlihat sama.

## 2. Sitemap

```text
/
├── aplikasi/
│   ├── keluarga
│   ├── ops              (aplikasi lama)
│   └── keuangan         (aplikasi lama)
├── work/
│   ├── [slug]
│   └── ...
├── about
├── contact
├── insights/            (nanti)
│   └── [slug]
├── legal/
│   ├── privacy
│   └── terms
├── login
├── keluarga/            (private, noindex)
│   ├── keuangan/
│   │   ├── transaksi
│   │   ├── akun
│   │   ├── kategori
│   │   ├── anggaran
│   │   ├── tagihan
│   │   ├── utang
│   │   └── aset
│   ├── rencana/
│   │   └── [id]
│   ├── kalender
│   ├── tugas
│   ├── belanja
│   ├── anggota
│   ├── dokumen
│   ├── kesehatan
│   ├── pendidikan
│   ├── laporan
│   └── pengaturan
├── api/
│   ├── auth/[...all]
│   └── health
├── sitemap.xml
└── robots.txt
```

## 3. Route table

### Publik

| Route | Akses | Layout | Indexed | Tujuan |
| --- | --- | --- | --- | --- |
| `/` | Publik | Marketing | Ya | Menjelaskan value + mengarahkan ke aplikasi/kontak |
| `/aplikasi` | Publik | Marketing | Ya | Hub semua aplikasi |
| `/aplikasi/keluarga` | Publik | Marketing | Ya | Menjual/menjelaskan aplikasi Keluarga |
| `/aplikasi/ops` | Publik | Marketing | Ya | Halaman aplikasi lama |
| `/aplikasi/keuangan` | Publik | Marketing | Ya | Halaman aplikasi lama |
| `/work` | Publik | Marketing | Ya | Case study |
| `/work/[slug]` | Publik | Marketing | Ya | Detail case study |
| `/about` | Publik | Marketing | Ya | Kepercayaan |
| `/contact` | Publik | Marketing | Ya | Konversi |
| `/login` | Publik | Auth | Tidak | Masuk |

### Aplikasi Keluarga (private)

| Route | Isi |
| --- | --- |
| `/keluarga` | Dashboard keluarga |
| `/keluarga/keuangan` | Ringkasan keuangan |
| `/keluarga/keuangan/transaksi` | Transaksi |
| `/keluarga/keuangan/akun` | Akun |
| `/keluarga/keuangan/kategori` | Kategori |
| `/keluarga/keuangan/anggaran` | Anggaran |
| `/keluarga/keuangan/tagihan` | Tagihan |
| `/keluarga/keuangan/utang` | Utang & piutang |
| `/keluarga/keuangan/aset` | Aset |
| `/keluarga/rencana` | Tujuan keuangan |
| `/keluarga/rencana/[id]` | Detail tujuan |
| `/keluarga/kalender` | Kalender |
| `/keluarga/tugas` | Tugas rumah |
| `/keluarga/belanja` | Daftar belanja |
| `/keluarga/anggota` | Anggota keluarga |
| `/keluarga/dokumen` | Dokumen |
| `/keluarga/kesehatan` | Kesehatan |
| `/keluarga/pendidikan` | Pendidikan |
| `/keluarga/laporan` | Laporan |
| `/keluarga/pengaturan` | Pengaturan |

### Aplikasi lama

Tidak punya route internal. Muncul di hub dengan `href` eksternal. Jika nanti diintegrasikan, route-nya ditambahkan di bawah `(apps)`.

## 4. Hub aplikasi

### 4.1 Home `/`

1. **Navbar** — logo, Aplikasi, Work, Tentang, CTA.
2. **Hero** — headline hasil + visual.
3. **Aplikasi** — kartu aplikasi dari registry (Keluarga, Ops, Keuangan, dst).
4. **Layanan** — apa yang Airevo kerjakan.
5. **Selected work** — case study.
6. **Proses** — Discover → Design → Build → Launch → Improve.
7. **CTA penutup**.
8. **Footer**.

### 4.2 Hub `/aplikasi`

- Grid kartu: ikon, nama, satu baris deskripsi, status (`live`, `beta`, `soon`), tombol.
- Filter sederhana: semua / milik sendiri / untuk klien.
- Untuk aplikasi internal: tombol "Buka" (login).
- Untuk aplikasi publik: tombol "Lihat".

### 4.3 Halaman aplikasi `/aplikasi/[slug]`

1. Hero: nama, satu kalimat, status, CTA.
2. Masalah yang diselesaikan.
3. Fitur utama (3–6).
4. Screenshot.
5. Untuk siapa.
6. Catatan teknis singkat (stack, keamanan) — membangun kepercayaan.
7. CTA.

### 4.4 App registry

`src/config/apps.ts` adalah satu sumber untuk home, hub, sidebar, dan halaman marketing.

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
  {
    id: "keuangan",
    name: "Keuangan",
    tagline: "Catat arus kas dan baca laporan.",
    description: "Aplikasi keuangan yang sudah berjalan.",
    href: "https://...",
    external: true,
    marketingHref: "/aplikasi/keuangan",
    icon: "Wallet",
    accent: "green",
    status: "live",
    requiresAuth: true,
  },
];
```

Menambah aplikasi = menambah satu entri. Tidak perlu mengubah home, hub, atau sidebar.

## 5. Navigasi aplikasi Keluarga

Sidebar:

```text
Keluarga
├── Ringkasan
├── Uang
│   ├── Transaksi
│   ├── Akun
│   ├── Kategori
│   ├── Anggaran
│   ├── Tagihan
│   ├── Utang
│   └── Aset
├── Rencana
├── Kalender
├── Tugas
├── Belanja
├── Anggota
├── Catatan
│   ├── Dokumen
│   ├── Kesehatan
│   └── Pendidikan
└── Laporan
```

- Mobile: bottom nav 5 item (Ringkasan, Uang, Rencana, Kalender, Lainnya).
- App switcher di atas sidebar: kembali ke hub.
- User menu di bawah: profil, pengaturan, logout.

## 6. Content types

| Tipe | Format | Lokasi |
| --- | --- | --- |
| Case study | MDX | `src/content/work/*.mdx` |
| Halaman aplikasi | MDX/TS | `src/content/apps/*.mdx` |
| Insight | MDX | `src/content/insights/*.mdx` |
| Data aplikasi | PostgreSQL | Neon |
| Aset | `/public` atau Vercel Blob | — |

## 7. URL dan redirect

- Lowercase, hyphen-separated.
- Tanpa trailing slash.
- `www` → apex (atau sebaliknya), 308.
- 404 punya jalan kembali.
- Jangan pakai query string untuk konten yang perlu diindeks.

## 8. Noindex

Wajib `noindex, nofollow`:

- `/login`
- `/keluarga/**`
- `/api/**`

Tambahkan `Disallow` di `robots.ts`. Jangan mengandalkan `robots.txt` saja.

## 9. Aksesibilitas informasi

- Satu `h1` per halaman.
- Link punya teks jelas.
- Form punya label dan error yang terhubung.
- Tabel punya header yang benar.
- Status tidak hanya lewat warna.
- `lang="id"`.

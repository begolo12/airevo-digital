# 09 — SEO, Analytics, dan Pengukuran

## 1. Tujuan

- Website ditemukan untuk pencarian yang relevan: jasa pembuatan web app, internal tools, digitalisasi UMKM, aplikasi keuangan keluarga.
- Calon klien memahami kualitas lewat case study dan aplikasi nyata.
- Halaman aplikasi private tidak bocor ke mesin pencari.
- Keputusan konten dan desain diukur, bukan ditebak.

## 2. Prinsip SEO

1. **Satu halaman, satu niat pencarian.**
2. **Konten lebih penting daripada trik teknis.**
3. **Case study adalah aset SEO utama.** Setiap case study menjawab masalah nyata.
4. **Jangan membuat halaman tipis** hanya untuk mengejar keyword.
5. **Konsisten:** title, description, canonical, OG, heading.

## 3. Metadata

### Root

```ts
export const metadata: Metadata = {
  metadataBase: new URL("https://airevo-digital.my.id"),
  title: {
    default: "Airevo Digital — Software yang dipakai, bukan hanya dipamerkan",
    template: "%s | Airevo Digital",
  },
  description:
    "Airevo Digital membangun aplikasi web, alat internal, dan produk yang membuat pekerjaan sehari-hari berjalan lebih rapi.",
  keywords: [
    "jasa pembuatan web app",
    "internal tools Indonesia",
    "digitalisasi UMKM",
    "aplikasi keuangan keluarga",
    "software house Indonesia",
  ],
  authors: [{ name: "Airevo Digital" }],
  creator: "Airevo Digital",
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "/",
    siteName: "Airevo Digital",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};
```

### Per halaman

| Halaman | Title | Description |
| --- | --- | --- |
| `/` | Airevo Digital — Software yang dipakai, bukan hanya dipamerkan | Web app, alat internal, dan produk yang rapi. |
| `/aplikasi` | Aplikasi — Airevo Digital | Semua aplikasi dalam satu tempat. |
| `/aplikasi/keluarga` | Keluarga — Uang, rencana, dan ritme rumah | Catat arus kas, atur anggaran, pantau tagihan. |
| `/aplikasi/ops` | Ops — Kelola klien, proyek, dan task | Aplikasi operasional untuk tim kecil. |
| `/aplikasi/keuangan` | Keuangan — Catat arus kas dan budget | Aplikasi keuangan untuk bisnis. |
| `/work` | Work — Case study Airevo Digital | Studi kasus nyata. |
| `/work/[slug]` | Judul case study | Ringkasan hasil. |
| `/about` | Tentang Airevo Digital | Siapa di baliknya dan cara kerja. |
| `/contact` | Hubungi Airevo Digital | Mulai percakapan. |

### Aturan

- Title ≤ 60 karakter; description 120–160 karakter.
- Jangan duplikat title/description antar halaman.
- Setiap halaman punya canonical.
- Halaman app: `robots: { index: false, follow: false }`.

## 4. Open Graph dan social preview

- `app/opengraph-image.tsx` dengan `ImageResponse`.
- Ukuran 1200×630.
- Konten: logo, headline, satu kalimat, pola/gradient brand.
- Untuk case study, generate OG dari judul + metrik.
- Uji dengan Twitter Card Validator, Facebook Sharing Debugger, LinkedIn Post Inspector.
- Jangan memakai teks terlalu kecil; minimal 48px untuk headline.

## 5. Sitemap dan robots

### `app/sitemap.ts`

Sertakan:

- `/`
- `/aplikasi`
- `/aplikasi/keluarga`
- `/aplikasi/ops`
- `/aplikasi/keuangan`
- `/work`
- `/work/[slug]` (dari MDX)
- `/about`
- `/contact`
- `/legal/privacy`, `/legal/terms`
- `/insights` dan artikel (nanti)

Jangan sertakan `/keluarga`, `/login`, `/api`.

### `app/robots.ts`

```ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/keluarga", "/login", "/api"],
      },
    ],
    sitemap: "https://airevo-digital.my.id/sitemap.xml",
    host: "https://airevo-digital.my.id",
  };
}
```

> `robots.txt` bukan pengganti auth. Halaman app tetap dilindungi login dan `noindex`.

## 6. Structured data (JSON-LD)

- `Organization` di root.
- `WebSite` + `SearchAction` (jika ada search publik).
- `Person` di `/about`.
- `BreadcrumbList` di halaman dalam.
- `CreativeWork` atau `CaseStudy` (schema.org) untuk case study.
- `FAQPage` hanya jika FAQ benar-benar ada dan terlihat.

Contoh:

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Airevo Digital",
  "url": "https://airevo-digital.my.id",
  "logo": "https://airevo-digital.my.id/logo.png",
  "sameAs": []
}
```

## 7. Strategi konten

### Pilar

1. **Case study** — masalah, proses, solusi, hasil.
2. **Insight** — pelajaran teknis/bisnis.
3. **Halaman layanan** — web app, internal tools, integrasi.
4. **Halaman aplikasi** — Keluarga, Ops, Keuangan.

### Keyword awal (riset ulang sebelum menulis)

- “jasa pembuatan aplikasi web Indonesia”
- “internal tools untuk UMKM”
- “aplikasi keuangan keluarga”
- “aplikasi pencatat keuangan rumah tangga”
- “dashboard operasional bisnis”
- “digitalisasi proses bisnis”

### Aturan konten

- Panjang case study 800–1.500 kata.
- Setiap klaim punya bukti/angka.
- Gunakan heading yang menjawab pertanyaan.
- Sertakan screenshot asli (data disamarkan).
- Internal link ke halaman aplikasi/contact.
- Jangan menulis untuk mesin pencari saja; tulis untuk calon klien.

## 8. Analytics

### Tool

- **Vercel Analytics** — page view, referrer, negara, device.
- **Speed Insights** — Core Web Vitals.
- **Sentry** — error.
- **PostHog** (opsional, nanti) — funnel dan session replay dengan consent.

### Event yang dilacak

| Event | Kapan | Properti |
| --- | --- | --- |
| `cta_click` | CTA utama diklik | `location`, `label` |
| `contact_submit` | Form kontak sukses | `service_type` |
| `case_study_view` | Case study dibuka | `slug` |
| `app_open` | App dibuka dari hub/home | `app` |
| `login_success` | Login berhasil | `method` |
| `transaction_created` | Transaksi dibuat | `type` |
| `bill_paid` | Tagihan ditandai dibayar | — |
| `goal_contribution` | Kontribusi tujuan | — |

Jangan mengirim data pribadi/keuangan ke analytics.

### Dashboard

- Traffic mingguan.
- Conversion rate home → contact.
- Case study → contact.
- Top referrer.
- Core Web Vitals p75.
- Error rate.

## 9. Consent dan privasi

- Vercel Analytics tidak memakai cookie pihak ketiga; tetap dokumentasikan di privacy policy.
- Jika memakai PostHog/session replay: tampilkan consent banner, jangan rekam input sensitif.
- Jangan memuat script analytics sebelum consent jika kebijakan mengharuskan.
- Sediakan halaman privacy yang menjelaskan data yang dikumpulkan.

## 10. Core Web Vitals

Target:

| Metrik | Target p75 |
| --- | --- |
| LCP | < 2,5 s |
| INP | < 200 ms |
| CLS | < 0,1 |
| TTFB | < 800 ms |

Cara mencapai:

- Gambar `next/image` dengan ukuran tepat.
- Font `next/font`, `display: swap`.
- Tidak memuat chart/animasi di initial load marketing.
- Server Components untuk konten.
- Cache static marketing.
- Audit bundle sebelum launch.

## 11. Checklist SEO

- [ ] Title/description unik per halaman.
- [ ] Canonical benar.
- [ ] Sitemap berisi halaman publik.
- [ ] `robots.txt` memblokir `/keluarga`.
- [ ] App layout `noindex`.
- [ ] OG image tampil di social preview.
- [ ] JSON-LD valid.
- [ ] Heading hierarchy benar.
- [ ] Internal link ke case study/aplikasi.
- [ ] Alt text gambar.
- [ ] URL lowercase dan deskriptif.
- [ ] 404 mengembalikan status 404.
- [ ] Redirect www/apex 308.
- [ ] Lighthouse SEO ≥ 95.

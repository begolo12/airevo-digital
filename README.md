# airevo-digital.my.id — portal

Landing page portal plus konfigurasi routing Vercel yang memetakan jalur ke
proyek Vercel lain. Repo ini **tidak** berisi aplikasi: hanya satu halaman
statis (`public/`) dan satu `vercel.json`.

```
airevo-digital.my.id/             → portal (proyek ini)
airevo-digital.my.id/minisoccer/  → proyek minisoccer-club
airevo-digital.my.id/<jalur>/     → proyek lain, ditambah satu rewrite
```

## Cara kerjanya

Proyek Vercel ini adalah **satu-satunya** pemilik domain. Aplikasi lain tetap
punya proyek Vercel sendiri (URL `*.vercel.app`, deploy sendiri, env sendiri);
portal hanya meneruskan jalur.

```json
{
  "rewrites": [
    { "source": "/minisoccer/:path*", "destination": "https://minisoccer-club.vercel.app/minisoccer/:path*" }
  ]
}
```

Rewrite diteruskan **apa adanya** (prefiks ikut dikirim). Karena itu aplikasi
tujuan harus bisa melayani jalurnya sendiri:

| Yang harus disiapkan di proyek aplikasi | Kenapa |
| --- | --- |
| `flutter build web --base-href /minisoccer/` | aset (`main.dart.js`, `canvaskit/`, `assets/`) dicari di `/minisoccer/...` |
| rewrite `"/minisoccer/:path*" → "/:path*"` | berkas statis ada di akar deployment, bukan di subfolder |
| panggilan API memakai prefiks (`/minisoccer/api/sql`) | `/api/sql` absolut akan mendarat di domain portal, bukan di proyek aplikasi |

Semua itu sudah terpasang di repo `minisoccer-club`.

## Deploy pertama

1. **Deploy aplikasi dulu.** Portal meneruskan ke deployment aplikasi; kalau
   aplikasi belum siap, `/minisoccer/` akan 404.
2. **Buat proyek Vercel untuk repo ini** (Add New → Project → import repo,
   framework preset *Other*, tanpa build command). `outputDirectory` sudah
   diatur di `vercel.json`.
3. **Pasang domain.** Project → Settings → Domains → tambahkan
   `airevo-digital.my.id`. Vercel menampilkan nilai DNS yang harus dipakai.
4. **Arahkan DNS** di panel DNSCloud (nameserver domain ini
   `oka.ns.dnscloud.id` / `putra.ns.dnscloud.id`):

   | Tipe | Nama | Nilai |
   | --- | --- | --- |
   | A | `@` | IP yang ditampilkan Vercel di kartu domain (mis. `216.198.79.1`) |
   | CNAME | `www` | `cname.vercel-dns.com` |

   Hapus record parkir DNSCloud yang lama (`103.214.112.181`). Alternatif:
   ganti nameserver domain ke `ns1.vercel-dns.com` / `ns2.vercel-dns.com`,
   lalu semua DNS diatur dari Vercel.
5. Tunggu verifikasi; sertifikat SSL terbit otomatis.

## Menambah aplikasi baru

1. Deploy aplikasi itu sebagai proyek Vercel sendiri, siapkan prefiks jalurnya
   (lihat tabel di atas).
2. Tambah satu rewrite di `vercel.json`, **di atas** aturan lain:

   ```json
   { "source": "/keuangan/:path*", "destination": "https://<proyek>.vercel.app/keuangan/:path*" }
   ```
3. Tambah satu kartu di `public/index.html`.
4. Push. Vercel membangun ulang portal dalam hitungan detik.

Rewrite dicocokkan berurutan dari atas, jadi jalur yang lebih spesifik harus
didahulukan.

## Berkas

| Berkas | Isi |
| --- | --- |
| `public/index.html` | halaman portal |
| `public/style.css` | gaya halaman |
| `public/favicon.svg` | ikon |
| `vercel.json` | routing, header keamanan, output `public/` |

## Lokal

```bash
npx serve public        # atau: python -m http.server -d public 8123
```

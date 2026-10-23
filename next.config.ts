import type { NextConfig } from "next";

/**
 * Aplikasi yang hidup di proyek Vercel terpisah tapi berbagi domain ini.
 *
 * Rewrite Vercel meneruskan jalur apa adanya, jadi aplikasi tujuan wajib siap
 * dengan prefiksnya sendiri — karena itu `/minisoccer/` tetap dikirim sebagai
 * `/minisoccer/...`, bukan `/...`.
 */
const MINISOCCER_ORIGIN = "https://minisoccer-club.vercel.app";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  // Cache Components dimatikan: halaman aplikasi memakai cookies + data per-request,
  // dan kita memilih model rendering dinamis yang sederhana untuk MVP.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  /*
   * `/minisoccer/` diproksi ke proyek Vercel lain yang memakai base href
   * `/minisoccer/`. Next.js membuang garis miring di akhir dengan 308 sebelum
   * rewrite sempat jalan; Flutter lalu meresolusi `flutter_bootstrap.js`
   * relatif terhadap `/minisoccer` dan memintanya di akar — hasilnya layar
   * hitam. Normalisasi itu dimatikan agar jalur yang diproksi utuh.
   *
   * Konsekuensinya `/about/` juga melayani 200, bukan redirect. Metadata
   * canonical tiap halaman sudah menunjuk satu URL, jadi mesin pencari tidak
   * melihat dua halaman berbeda.
   */
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      /*
       * Akar jalur dan aset dipisah: `:path+` tidak cocok untuk jalur kosong,
       * sehingga akar butuh aturannya sendiri. Varian tanpa garis miring
       * diproksi langsung, bukan di-redirect, agar tidak berputar.
       */
      { source: "/minisoccer", destination: `${MINISOCCER_ORIGIN}/minisoccer/` },
      { source: "/minisoccer/", destination: `${MINISOCCER_ORIGIN}/minisoccer/` },
      { source: "/minisoccer/:path+", destination: `${MINISOCCER_ORIGIN}/minisoccer/:path+` },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

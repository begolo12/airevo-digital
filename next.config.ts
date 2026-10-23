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
   * `/minisoccer/` diproksi ke proyek Vercel lain dan memakai base href
   * `/minisoccer/`. Tanpa ini Next.js membuang garis miring di akhir sehingga
   * redirect kita sendiri berbalik arah dan berputar tanpa henti.
   */
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      /*
       * Akar jalur dan aset dipisah: `:path+` tidak cocok untuk jalur kosong,
       * sehingga `/minisoccer/` akan 404 tanpa aturan pertama. Varian tanpa
       * garis miring juga diproksi langsung — bukan di-redirect, karena
       * `source: "/minisoccer"` ikut cocok dengan bentuk bergaris miring dan
       * membuat loop.
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

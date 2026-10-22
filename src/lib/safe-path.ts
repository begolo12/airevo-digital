/**
 * Menyanitasi parameter `next` sebelum dipakai untuk redirect.
 *
 * `next` datang dari URL, jadi bisa diisi apa saja. Pemeriksaan
 * `startsWith("/")` saja **tidak cukup**: `//evil.example` lolos, dan browser
 * membacanya sebagai alamat situs lain (protocol-relative URL). Begitu juga
 * `/\evil.example`. Keduanya bisa dipakai mengarahkan pengguna yang baru masuk
 * ke situs penipu — open redirect.
 *
 * Yang diterima hanya path internal: diawali satu garis miring, bukan dua, dan
 * bukan garis miring terbalik.
 *
 * Fungsi ini dipakai di server action **dan** di halaman, karena keduanya bisa
 * melakukan redirect berdasarkan parameter yang sama.
 */
export function safeNextPath(next: string | undefined, fallback = "/keluarga"): string {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//")) return fallback;
  if (next.startsWith("/\\")) return fallback;

  /*
   * Karakter kontrol dan baris baru bisa dipakai memecah header `Location`.
   * Tidak ada path sah yang membutuhkannya.
   */
  if (/[\u0000-\u001F\u007F]/.test(next)) return fallback;

  return next;
}

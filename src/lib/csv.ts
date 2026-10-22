/**
 * Penulisan CSV yang aman.
 *
 * Dua masalah yang ditangani di sini, dan keduanya nyata:
 *
 * ## 1. CSV injection
 *
 * Excel dan Google Sheets memperlakukan sel yang dimulai `=`, `+`, `-`, atau
 * `@` sebagai **rumus**. Deskripsi transaksi diisi pengguna sendiri, jadi
 * deskripsi seperti `=HYPERLINK("http://jahat.example","klik")` akan menjadi
 * tautan aktif saat berkasnya dibuka orang lain.
 *
 * Penangkalnya: beri awalan kutip tunggal agar sel dibaca sebagai teks.
 *
 * ## 2. Escaping RFC 4180
 *
 * Sel yang memuat pemisah, tanda kutip, atau baris baru harus dibungkus tanda
 * kutip, dan tanda kutip di dalamnya digandakan. Tanpa ini, deskripsi seperti
 * `Belanja, sayur` memecah satu baris menjadi dua kolom.
 */

/** Karakter yang membuat Excel memperlakukan sel sebagai rumus. */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/** Karakter yang memaksa sel dibungkus tanda kutip. */
const NEEDS_QUOTES = /[",\r\n]/;

/**
 * Menyanitasi satu sel.
 *
 * @param value nilai apa pun; `null`/`undefined` menjadi string kosong.
 */
export function escapeCsvCell(value: string | number | null | undefined): string {
  let text = value === null || value === undefined ? "" : String(value);

  // Netralkan rumus SEBELUM escaping, agar kutip tunggal ikut terbungkus
  // dengan benar bila selnya juga memuat pemisah.
  if (FORMULA_PREFIX.test(text)) {
    text = `'${text}`;
  }

  if (NEEDS_QUOTES.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

/** Menyusun satu baris CSV dari beberapa sel. */
export function csvRow(cells: Array<string | number | null | undefined>): string {
  return cells.map(escapeCsvCell).join(",");
}

/**
 * Menyusun dokumen CSV lengkap.
 *
 * Memakai `\r\n` sesuai RFC 4180 — Excel di Windows lebih taat pada CRLF
 * daripada LF.
 *
 * BOM UTF-8 ditambahkan agar Excel mengenali huruf beraksen. Tanpa BOM, Excel
 * membaca berkas sebagai Windows-1252 dan "Rp" serta nama beraksen rusak.
 */
export function csvDocument(rows: Array<Array<string | number | null | undefined>>): string {
  return `\uFEFF${rows.map(csvRow).join("\r\n")}\r\n`;
}

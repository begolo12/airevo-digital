import { describe, expect, it } from "vitest";
import { csvDocument, csvRow, escapeCsvCell } from "@/lib/csv";

/**
 * Penulisan CSV.
 *
 * Dua hal yang diuji dan keduanya bisa berdampak nyata:
 *
 * 1. **CSV injection** — deskripsi transaksi diisi pengguna, jadi bisa berisi
 *    `=HYPERLINK(...)` yang menjadi rumus aktif saat berkasnya dibuka di Excel.
 * 2. **Escaping** — deskripsi seperti `Belanja, sayur` memecah baris menjadi
 *    dua kolom bila tidak dibungkus dengan benar.
 */

describe("escapeCsvCell", () => {
  it("membiarkan teks biasa apa adanya", () => {
    expect(escapeCsvCell("Belanja dapur")).toBe("Belanja dapur");
    expect(escapeCsvCell(150000)).toBe("150000");
  });

  it("mengubah null dan undefined menjadi sel kosong", () => {
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });

  it("membungkus sel yang memuat pemisah", () => {
    expect(escapeCsvCell("Belanja, sayur")).toBe('"Belanja, sayur"');
  });

  it("menggandakan tanda kutip di dalam sel", () => {
    expect(escapeCsvCell('Bayar "listrik"')).toBe('"Bayar ""listrik"""');
  });

  it("membungkus sel yang memuat baris baru", () => {
    expect(escapeCsvCell("Baris satu\nbaris dua")).toBe('"Baris satu\nbaris dua"');
    expect(escapeCsvCell("Baris satu\r\nbaris dua")).toBe('"Baris satu\r\nbaris dua"');
  });

  it("menetralkan sel yang dimulai karakter rumus", () => {
    /*
     * Inilah CSV injection: tanpa awalan kutip tunggal, Excel menjalankan ini
     * sebagai rumus dan membuka tautan saat berkasnya dibuka.
     */
    expect(escapeCsvCell("=HYPERLINK(\"http://jahat.example\",\"klik\")")).toMatch(/^"'=/);
    expect(escapeCsvCell("+1+1")).toBe("'+1+1");
    expect(escapeCsvCell("-2+3")).toBe("'-2+3");
    expect(escapeCsvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("menetralkan tab dan carriage return di awal sel", () => {
    // Tab tidak butuh tanda kutip menurut RFC 4180, cukup dinetralkan.
    expect(escapeCsvCell("\tabc")).toBe("'\tabc");

    // Carriage return butuh keduanya: dinetralkan DAN dibungkus.
    expect(escapeCsvCell("\rabc")).toBe('"\'\rabc"');
  });

  it("tidak menetralkan tanda minus di tengah teks", () => {
    // "Rp-500" bukan rumus; hanya awalan yang berbahaya.
    expect(escapeCsvCell("Rp-500")).toBe("Rp-500");
    expect(escapeCsvCell("belanja=hemat")).toBe("belanja=hemat");
  });

  it("menetralkan rumus sekaligus membungkus bila perlu", () => {
    // Dua masalah sekaligus: rumus DAN pemisah.
    const result = escapeCsvCell("=A1,B2");
    expect(result).toBe('"\'=A1,B2"');
  });
});

describe("csvRow", () => {
  it("menggabungkan sel dengan koma", () => {
    expect(csvRow(["a", "b", "c"])).toBe("a,b,c");
  });

  it("menjaga jumlah kolom saat sel memuat pemisah", () => {
    const row = csvRow(["Belanja, sayur", "Rp50.000"]);
    // Satu koma pemisah + satu koma di dalam tanda kutip.
    expect(row).toBe('"Belanja, sayur",Rp50.000');

    // Hitung kolom dengan parser sederhana: koma di luar tanda kutip.
    const columns = row.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.filter(Boolean) ?? [];
    expect(columns.length).toBe(2);
  });
});

describe("csvDocument", () => {
  it("memakai CRLF sesuai RFC 4180", () => {
    const document = csvDocument([["a"], ["b"]]);
    expect(document).toContain("a\r\nb");
  });

  it("diawali BOM agar Excel mengenali UTF-8", () => {
    const document = csvDocument([["Nama"]]);
    expect(document.charCodeAt(0)).toBe(0xfeff);
  });

  it("diakhiri baris baru", () => {
    expect(csvDocument([["a"]])).toMatch(/\r\n$/);
  });

  it("menyusun header dan data dengan urutan benar", () => {
    const document = csvDocument([
      ["Tanggal", "Jumlah"],
      ["22 Okt 2026", 150000],
    ]);

    const lines = document.replace(/^\uFEFF/, "").trim().split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe("Tanggal,Jumlah");
    expect(lines[1]).toBe("22 Okt 2026,150000");
  });
});

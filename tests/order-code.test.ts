import { describe, expect, it } from "vitest";
import { newLicenseKey, newOrderCode, randomCode } from "@/lib/data/orders";

/**
 * Kode pesanan dan lisensi.
 *
 * Kode pesanan adalah **satu-satunya** proteksi halaman `/pesanan/[code]`, yang
 * menampilkan email pembeli. Karena itu kode harus:
 *
 * 1. cukup panjang dan acak sehingga tidak bisa ditebak,
 * 2. memakai sumber acak kriptografis (bukan `Math.random()`),
 * 3. tidak memuat karakter yang mudah tertukar saat diketik ulang.
 */

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

describe("randomCode", () => {
  it("menghasilkan panjang yang diminta", () => {
    for (const length of [1, 5, 10, 24]) {
      expect(randomCode(length)).toHaveLength(length);
    }
  });

  it("hanya memakai huruf yang tidak mudah tertukar", () => {
    for (let run = 0; run < 200; run += 1) {
      for (const character of randomCode(12)) {
        expect(ALPHABET).toContain(character);
      }
    }
  });

  it("tidak pernah memuat 0, O, 1, I, atau L", () => {
    const sample = Array.from({ length: 400 }, () => randomCode(10)).join("");
    for (const forbidden of ["0", "O", "1", "I", "L"]) {
      expect(sample).not.toContain(forbidden);
    }
  });

  it("hampir tidak pernah berulang dalam jumlah besar", () => {
    /*
     * Tabrakan pada 31^8 (≈ 8,5 × 10^11) praktis nol, tetapi tidak mustahil.
     * Assertion "semua unik" akan gagal sesekali tanpa ada bug — dan test yang
     * gagal acak lebih buruk daripada test yang tidak ada, karena membuat
     * kegagalan sungguhan diabaikan.
     *
     * Karena itu dipakai toleransi satu tabrakan.
     */
    const codes = new Set(Array.from({ length: 500 }, () => randomCode(8)));
    expect(codes.size).toBeGreaterThanOrEqual(499);
  });

  it("menyebar merata, tanpa bias modulo", () => {
    /*
     * 256 tidak habis dibagi 31. Tanpa penolakan sampel, huruf pertama alfabet
     * akan muncul lebih sering. Uji ini memastikan sebarannya rata.
     */
    const counts = new Map<string, number>();
    const total = 20_000;

    for (const character of randomCode(total)) {
      counts.set(character, (counts.get(character) ?? 0) + 1);
    }

    const expected = total / ALPHABET.length;
    for (const character of ALPHABET) {
      const actual = counts.get(character) ?? 0;
      // Toleransi 25% — cukup ketat untuk menangkap bias, cukup longgar
      // agar tidak gagal karena kebetulan statistik.
      expect(actual).toBeGreaterThan(expected * 0.75);
      expect(actual).toBeLessThan(expected * 1.25);
    }
  });
});

describe("newOrderCode", () => {
  it("berformat ARV- diikuti 5 karakter", () => {
    const code = newOrderCode();
    expect(code).toMatch(/^ARV-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/);
  });

  it("hampir tidak pernah berulang", () => {
    /*
     * 300 kode × 5 karakter dari 31 huruf = 28,6 juta kemungkinan.
     * Peluang satu tabrakan ≈ 0,16% — cukup untuk membuat assertion "semua
     * unik" gagal sesekali. Toleransi satu tabrakan menjaga test tetap
     * deterministik tanpa melemahkan maknanya.
     */
    const codes = new Set(Array.from({ length: 300 }, () => newOrderCode()));
    expect(codes.size).toBeGreaterThanOrEqual(299);
  });
});

describe("newLicenseKey", () => {
  it("memakai awalan produk dan tiga kelompok", () => {
    const key = newLicenseKey("keluarga");
    expect(key).toMatch(
      /^KELU-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/,
    );
  });

  it("hampir tidak pernah berulang", () => {
    // 31^12 kemungkinan; toleransi satu tabrakan menjaga test deterministik.
    const keys = new Set(Array.from({ length: 200 }, () => newLicenseKey("keluarga")));
    expect(keys.size).toBeGreaterThanOrEqual(199);
  });
});

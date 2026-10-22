import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/safe-path";

/**
 * Sanitasi parameter `next`.
 *
 * `next` datang dari URL dan dipakai untuk redirect setelah login. Bila tidak
 * disaring, penyerang bisa mengirim tautan `?next=//evil.example` — pengguna
 * melihat domain aplikasi, mengetik kata sandi, lalu dilempar ke situs penipu.
 *
 * Pemeriksaan `startsWith("/")` **tidak cukup** karena `//evil.example` juga
 * diawali garis miring, tetapi browser membacanya sebagai host lain
 * (protocol-relative URL).
 */

describe("safeNextPath", () => {
  it("menerima path internal biasa", () => {
    expect(safeNextPath("/keluarga")).toBe("/keluarga");
    expect(safeNextPath("/keluarga/keuangan/transaksi")).toBe(
      "/keluarga/keuangan/transaksi",
    );
    expect(safeNextPath("/keluarga?bulan=2026-01")).toBe("/keluarga?bulan=2026-01");
  });

  it("menolak protocol-relative URL", () => {
    // Inilah bentuk serangan yang paling mudah lolos.
    expect(safeNextPath("//evil.example")).toBe("/keluarga");
    expect(safeNextPath("//evil.example/masuk")).toBe("/keluarga");
  });

  it("menolak garis miring terbalik di awal", () => {
    expect(safeNextPath("/\\evil.example")).toBe("/keluarga");
    expect(safeNextPath("/\\\\evil.example")).toBe("/keluarga");
  });

  it("menolak URL absolut", () => {
    expect(safeNextPath("https://evil.example")).toBe("/keluarga");
    expect(safeNextPath("http://evil.example/masuk")).toBe("/keluarga");
    expect(safeNextPath("javascript:alert(1)")).toBe("/keluarga");
  });

  it("menolak karakter kontrol", () => {
    // Baris baru bisa dipakai memecah header `Location`.
    expect(safeNextPath("/keluarga\nSet-Cookie: a=b")).toBe("/keluarga");
    expect(safeNextPath("/keluarga\r\nLocation: https://evil.example")).toBe("/keluarga");
    expect(safeNextPath("/keluarga\u0000")).toBe("/keluarga");
  });

  it("memakai fallback saat kosong", () => {
    expect(safeNextPath(undefined)).toBe("/keluarga");
    expect(safeNextPath("")).toBe("/keluarga");
  });

  it("menghormati fallback khusus", () => {
    expect(safeNextPath(undefined, "/dashboard")).toBe("/dashboard");
    expect(safeNextPath("//evil.example", "/dashboard")).toBe("/dashboard");
  });
});

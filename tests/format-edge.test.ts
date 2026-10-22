import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  currentMonth,
  daysFromToday,
  daysInMonth,
  formatIDR,
  formatIDRCompact,
  lastMonths,
  percent,
  safeDueDate,
  todayISO,
} from "@/lib/format";

/**
 * Kasus batas tanggal dan angka.
 *
 * Ini sumber bug yang paling mudah lolos: kode terlihat benar, test umum
 * lulus, tetapi meleset pada tahun kabisat, pergantian tahun, atau nominal
 * besar. Semuanya memengaruhi angka yang dilihat pengguna.
 */

describe("daysInMonth", () => {
  it("mengenali tahun kabisat", () => {
    expect(daysInMonth("2024-02")).toBe(29); // kabisat
    expect(daysInMonth("2026-02")).toBe(28); // bukan kabisat
    expect(daysInMonth("2000-02")).toBe(29); // kabisat abad
    expect(daysInMonth("1900-02")).toBe(28); // bukan kabisat abad
  });

  it("mengenali bulan 30 dan 31 hari", () => {
    expect(daysInMonth("2026-01")).toBe(31);
    expect(daysInMonth("2026-04")).toBe(30);
    expect(daysInMonth("2026-12")).toBe(31);
  });
});

describe("addMonths", () => {
  it("menyeberang pergantian tahun", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });

  it("menangani lompatan lebih dari satu tahun", () => {
    expect(addMonths("2026-06", 18)).toBe("2027-12");
    expect(addMonths("2026-06", -18)).toBe("2024-12");
  });

  it("selalu memberi bulan dua digit", () => {
    expect(addMonths("2026-09", 1)).toBe("2026-10");
    expect(addMonths("2026-10", -1)).toBe("2026-09");
    expect(addMonths("2026-01", 0)).toBe("2026-01");
  });
});

describe("addDays", () => {
  it("menyeberang bulan dan tahun", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("menangani tahun kabisat", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2024-02-29", 1)).toBe("2024-03-01");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("tidak bergeser karena zona waktu", () => {
    /*
     * Bug klasik: memakai `new Date(iso)` (lokal) lalu `toISOString()` (UTC)
     * membuat tanggal mundur satu hari di zona waktu positif seperti WIB.
     */
    for (const iso of ["2026-01-01", "2026-06-15", "2026-12-31"]) {
      expect(addDays(iso, 0)).toBe(iso);
    }
  });
});

describe("safeDueDate", () => {
  it("menjepit tanggal ke akhir bulan", () => {
    // Jatuh tempo tanggal 31 di bulan 30 hari.
    expect(safeDueDate("2026-04", 31)).toBe("2026-04-30");
    expect(safeDueDate("2026-02", 31)).toBe("2026-02-28");
    expect(safeDueDate("2024-02", 31)).toBe("2024-02-29");
  });

  it("membiarkan tanggal yang sah apa adanya", () => {
    expect(safeDueDate("2026-01", 15)).toBe("2026-01-15");
    expect(safeDueDate("2026-01", 31)).toBe("2026-01-31");
  });

  it("menjepit tanggal 0 atau negatif ke 1", () => {
    // Tanggal 0 tidak sah; hasilnya harus tetap tanggal yang bisa dipakai.
    expect(safeDueDate("2026-01", 0)).toBe("2026-01-01");
    expect(safeDueDate("2026-01", -5)).toBe("2026-01-01");
  });
});

describe("lastMonths", () => {
  it("memberi urutan lama ke baru", () => {
    expect(lastMonths(3, "2026-03")).toEqual(["2026-01", "2026-02", "2026-03"]);
  });

  it("menyeberang tahun", () => {
    expect(lastMonths(3, "2026-01")).toEqual(["2025-11", "2025-12", "2026-01"]);
  });
});

describe("todayISO dan currentMonth", () => {
  it("berbentuk YYYY-MM-DD", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("currentMonth adalah awalan todayISO", () => {
    expect(todayISO().startsWith(currentMonth())).toBe(true);
  });

  it("hari ini berjarak nol hari dari hari ini", () => {
    expect(daysFromToday(todayISO())).toBe(0);
  });

  it("besok berjarak satu hari", () => {
    expect(daysFromToday(addDays(todayISO(), 1))).toBe(1);
  });

  it("kemarin berjarak minus satu hari", () => {
    expect(daysFromToday(addDays(todayISO(), -1))).toBe(-1);
  });
});

describe("percent", () => {
  it("membulatkan ke bilangan bulat", () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(2, 3)).toBe(67);
  });

  it("mengembalikan 0 saat total nol atau negatif", () => {
    // Pembagian nol akan menghasilkan NaN atau Infinity tanpa penjagaan ini.
    expect(percent(100, 0)).toBe(0);
    expect(percent(100, -50)).toBe(0);
  });

  it("bisa melebihi 100 saat pemakaian melebihi rencana", () => {
    // Anggaran yang terlampaui harus terlihat sebagai >100%, bukan dijepit.
    expect(percent(150, 100)).toBe(150);
  });
});

describe("formatIDR", () => {
  it("memberi format rupiah tanpa desimal", () => {
    expect(formatIDR(150_000)).toMatch(/^Rp/);
    expect(formatIDR(150_000)).toMatch(/150/);
    expect(formatIDR(150_000)).not.toMatch(/,\d\d$/);
  });

  it("menangani nol dan negatif", () => {
    expect(formatIDR(0)).toMatch(/^Rp/);

    /*
     * Nominal negatif ditulis "-Rp50.000" — tanda minus mendahului "Rp",
     * bukan sesudahnya. Ini bentuk yang lazim di Indonesia.
     */
    expect(formatIDR(-50_000)).toBe("-Rp50.000");
  });
});

describe("formatIDRCompact", () => {
  it("menyingkat nominal besar", () => {
    const compact = formatIDRCompact(1_900_000);
    // Harus lebih pendek dari format penuh.
    expect(compact.length).toBeLessThanOrEqual(formatIDR(1_900_000).length);
  });

  it("tetap memberi awalan Rp", () => {
    expect(formatIDRCompact(500_000)).toMatch(/^Rp/);
    expect(formatIDRCompact(0)).toMatch(/^Rp/);
  });
});

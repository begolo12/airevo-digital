import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  daysFromToday,
  daysInMonth,
  formatIDR,
  formatMonth,
  lastMonths,
  parseAmountInput,
  percent,
  safeDueDate,
  todayISO,
} from "@/lib/format";

describe("format uang", () => {
  it("memformat rupiah tanpa desimal", () => {
    expect(formatIDR(1_500_000)).toBe("Rp1.500.000");
    expect(formatIDR(0)).toBe("Rp0");
    expect(formatIDR(999)).toBe("Rp999");
  });

  it("membulatkan nilai pecahan", () => {
    expect(formatIDR(1500.4)).toBe("Rp1.500");
    expect(formatIDR(1500.6)).toBe("Rp1.501");
  });

  it("mem-parse input dengan titik ribuan", () => {
    expect(parseAmountInput("1.250.000")).toBe(1_250_000);
    expect(parseAmountInput("Rp 90.000")).toBe(90_000);
    expect(parseAmountInput("")).toBe(0);
    expect(parseAmountInput("abc")).toBe(0);
  });
});

describe("tanggal", () => {
  it("menghitung jumlah hari per bulan", () => {
    expect(daysInMonth("2026-01")).toBe(31);
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2028-02")).toBe(29); // kabisat
    expect(daysInMonth("2026-04")).toBe(30);
  });

  it("menggeser bulan melewati batas tahun", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-08", -6)).toBe("2026-02");
  });

  it("menggeser hari melewati batas bulan", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("mengamankan tanggal jatuh tempo 31 di bulan pendek", () => {
    expect(safeDueDate("2026-02", 31)).toBe("2026-02-28");
    expect(safeDueDate("2028-02", 31)).toBe("2028-02-29");
    expect(safeDueDate("2026-04", 31)).toBe("2026-04-30");
    expect(safeDueDate("2026-01", 31)).toBe("2026-01-31");
    expect(safeDueDate("2026-05", 15)).toBe("2026-05-15");
  });

  it("menghasilkan deret bulan urut lama ke baru", () => {
    const months = lastMonths(3, "2026-03");
    expect(months).toEqual(["2026-01", "2026-02", "2026-03"]);
  });

  it("menghitung selisih hari dari hari ini", () => {
    expect(daysFromToday(todayISO())).toBe(0);
    expect(daysFromToday(addDays(todayISO(), 5))).toBe(5);
    expect(daysFromToday(addDays(todayISO(), -3))).toBe(-3);
  });

  it("memformat bulan dalam bahasa Indonesia", () => {
    expect(formatMonth("2026-10")).toContain("Oktober");
    expect(formatMonth("2026-10")).toContain("2026");
  });
});

describe("persentase", () => {
  it("menghitung rasio dan menangani pembagi nol", () => {
    expect(percent(50, 100)).toBe(50);
    expect(percent(150, 100)).toBe(150);
    expect(percent(10, 0)).toBe(0);
  });
});

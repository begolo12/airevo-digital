import { describe, expect, it } from "vitest";
import {
  billOccurrencesInMonth,
  occurrencesInMonth,
  projectCashFlow,
  projectionSummary,
} from "@/lib/data/projection";
import type { Bill, RecurringRule } from "@/lib/data/types";

/**
 * Proyeksi arus kas.
 *
 * Yang dijaga: angka proyeksi masuk akal dan **tidak melebih-lebihkan**. Salah
 * proyeksi lebih berbahaya daripada tidak ada proyeksi — pengguna mengambil
 * keputusan berdasarkan angka itu.
 */

function rule(overrides: Partial<RecurringRule> = {}): RecurringRule {
  return {
    id: "rr-1",
    workspaceId: "ws-family",
    type: "income",
    amount: 10_000_000,
    description: "Gaji",
    accountId: "a-bca",
    visibility: "household",
    frequency: "monthly",
    startAt: "2026-01-02",
    nextAt: "2026-11-02",
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function bill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: "bill-1",
    workspaceId: "ws-family",
    name: "Listrik",
    amount: 450_000,
    frequency: "monthly",
    dueDay: 15,
    nextDueDate: "2026-11-15",
    reminderDaysBefore: 3,
    status: "active",
    ...overrides,
  };
}

describe("occurrencesInMonth", () => {
  it("bulanan jatuh sekali per bulan", () => {
    const subject = rule({ nextAt: "2026-11-02" });
    expect(occurrencesInMonth(subject, "2026-11")).toBe(1);
    expect(occurrencesInMonth(subject, "2026-12")).toBe(1);
  });

  it("bulanan tidak jatuh sebelum nextAt", () => {
    const subject = rule({ nextAt: "2026-11-02" });
    expect(occurrencesInMonth(subject, "2026-10")).toBe(0);
  });

  it("bulanan berhenti setelah endAt", () => {
    const subject = rule({ nextAt: "2026-11-02", endAt: "2026-12-31" });
    expect(occurrencesInMonth(subject, "2026-12")).toBe(1);
    expect(occurrencesInMonth(subject, "2027-01")).toBe(0);
  });

  it("tahunan hanya jatuh di bulan yang sama", () => {
    const subject = rule({ frequency: "yearly", nextAt: "2026-11-02" });
    expect(occurrencesInMonth(subject, "2026-11")).toBe(1);
    expect(occurrencesInMonth(subject, "2026-12")).toBe(0);
    expect(occurrencesInMonth(subject, "2027-11")).toBe(1);
  });

  it("mingguan menghitung 4–5 kali per bulan", () => {
    const subject = rule({ frequency: "weekly", nextAt: "2026-11-03" });
    const count = occurrencesInMonth(subject, "2026-11");
    expect(count).toBeGreaterThanOrEqual(4);
    expect(count).toBeLessThanOrEqual(5);
  });

  it("mingguan tidak menghitung sebelum nextAt", () => {
    const subject = rule({ frequency: "weekly", nextAt: "2026-11-03" });
    expect(occurrencesInMonth(subject, "2026-10")).toBe(0);
  });
});

describe("billOccurrencesInMonth", () => {
  it("bulanan sekali per bulan", () => {
    expect(billOccurrencesInMonth(bill(), "2026-11")).toBe(1);
    expect(billOccurrencesInMonth(bill(), "2026-12")).toBe(1);
  });

  it("triwulanan setiap tiga bulan", () => {
    const subject = bill({ frequency: "quarterly", nextDueDate: "2026-11-15" });
    expect(billOccurrencesInMonth(subject, "2026-11")).toBe(1);
    expect(billOccurrencesInMonth(subject, "2026-12")).toBe(0);
    expect(billOccurrencesInMonth(subject, "2027-01")).toBe(0);
    expect(billOccurrencesInMonth(subject, "2027-02")).toBe(1);
  });

  it("tahunan sekali setahun", () => {
    const subject = bill({ frequency: "yearly", nextDueDate: "2026-11-15" });
    expect(billOccurrencesInMonth(subject, "2026-11")).toBe(1);
    expect(billOccurrencesInMonth(subject, "2027-11")).toBe(1);
    expect(billOccurrencesInMonth(subject, "2027-05")).toBe(0);
  });
});

describe("projectCashFlow", () => {
  const base = {
    openingBalance: 50_000_000,
    startMonth: "2026-11",
    months: 3,
    averageUnplannedExpense: 3_000_000,
  };

  it("memproyeksikan jumlah bulan yang diminta", () => {
    const result = projectCashFlow({ ...base, rules: [], bills: [] });
    expect(result).toHaveLength(3);
    expect(result.map((month) => month.month)).toEqual([
      "2026-11",
      "2026-12",
      "2027-01",
    ]);
  });

  it("menghitung pemasukan berulang", () => {
    const result = projectCashFlow({
      ...base,
      rules: [rule({ nextAt: "2026-11-02" })],
      bills: [],
    });

    expect(result[0].income).toBe(10_000_000);
    expect(result[1].income).toBe(10_000_000);
  });

  it("menghitung tagihan sebagai pengeluaran terjadwal", () => {
    const result = projectCashFlow({
      ...base,
      rules: [],
      bills: [bill()],
    });

    expect(result[0].scheduledExpense).toBe(450_000);
  });

  it("menambahkan perkiraan pengeluaran harian", () => {
    const result = projectCashFlow({ ...base, rules: [], bills: [] });
    expect(result[0].estimatedExpense).toBe(3_000_000);
  });

  it("menghitung saldo kumulatif", () => {
    const result = projectCashFlow({
      ...base,
      rules: [rule({ nextAt: "2026-11-02" })],
      bills: [],
    });

    // Bulan 1: 50jt + 10jt - 3jt = 57jt
    expect(result[0].runningBalance).toBe(57_000_000);
    // Bulan 2: 57jt + 10jt - 3jt = 64jt
    expect(result[1].runningBalance).toBe(64_000_000);
    expect(result[2].runningBalance).toBe(71_000_000);
  });

  it("mendeteksi bulan yang saldonya minus", () => {
    const result = projectCashFlow({
      ...base,
      openingBalance: 5_000_000,
      rules: [],
      bills: [bill({ amount: 8_000_000 })],
    });

    expect(result[0].runningBalance).toBeLessThan(0);
  });

  it("tidak menghitung transfer sebagai pemasukan atau pengeluaran", () => {
    /*
     * Transfer antar akun sendiri tidak mengubah total kekayaan. Menghitungnya
     * sebagai pengeluaran akan membuat proyeksi terlihat jauh lebih buruk
     * daripada kenyataan.
     */
    const result = projectCashFlow({
      ...base,
      rules: [
        rule({
          type: "transfer",
          amount: 5_000_000,
          nextAt: "2026-11-02",
          toAccountId: "a-bca",
        }),
      ],
      bills: [],
    });

    expect(result[0].income).toBe(0);
    expect(result[0].scheduledExpense).toBe(0);
  });

  it("mengabaikan aturan yang dimatikan", () => {
    const result = projectCashFlow({
      ...base,
      rules: [rule({ nextAt: "2026-11-02", active: false })],
      bills: [],
    });

    expect(result[0].income).toBe(0);
  });

  it("mengembalikan kosong untuk jumlah bulan nol", () => {
    expect(projectCashFlow({ ...base, months: 0, rules: [], bills: [] })).toEqual([]);
  });

  it("menyertakan rincian pembentuk angka", () => {
    const result = projectCashFlow({
      ...base,
      rules: [rule({ nextAt: "2026-11-02" })],
      bills: [bill()],
    });

    const items = result[0].items;
    expect(items.some((item) => item.source === "recurring")).toBe(true);
    expect(items.some((item) => item.source === "bill")).toBe(true);
    expect(items.some((item) => item.source === "estimate")).toBe(true);
  });

  it("total pengeluaran sama dengan jumlah komponennya", () => {
    const result = projectCashFlow({
      ...base,
      rules: [rule({ type: "expense", amount: 2_000_000, nextAt: "2026-11-05" })],
      bills: [bill()],
    });

    const month = result[0];
    expect(month.totalExpense).toBe(month.scheduledExpense + month.estimatedExpense);
  });

  it("arus kas bersih sama dengan pemasukan dikurangi pengeluaran", () => {
    const result = projectCashFlow({
      ...base,
      rules: [rule({ nextAt: "2026-11-02" })],
      bills: [bill()],
    });

    const month = result[0];
    expect(month.net).toBe(month.income - month.totalExpense);
  });
});

describe("projectionSummary", () => {
  it("menemukan bulan dengan saldo terendah", () => {
    const months = projectCashFlow({
      openingBalance: 10_000_000,
      startMonth: "2026-11",
      months: 3,
      rules: [],
      bills: [bill({ amount: 4_000_000 })],
      averageUnplannedExpense: 0,
    });

    /*
     * Saldo: Nov 10-4 = 6jt, Des 6-4 = 2jt, Jan 2-4 = -2jt.
     * Saldo baru minus di bulan ketiga — bukan bulan pertama.
     */
    const summary = projectionSummary(months);
    expect(summary.lowestMonth).toBe("2027-01");
    expect(summary.hasShortfall).toBe(true);
    expect(summary.firstShortfallMonth).toBe("2027-01");
  });

  it("melaporkan tidak ada kekurangan bila saldo selalu cukup", () => {
    const months = projectCashFlow({
      openingBalance: 100_000_000,
      startMonth: "2026-11",
      months: 3,
      rules: [rule({ nextAt: "2026-11-02" })],
      bills: [bill()],
      averageUnplannedExpense: 3_000_000,
    });

    const summary = projectionSummary(months);
    expect(summary.hasShortfall).toBe(false);
    expect(summary.firstShortfallMonth).toBeNull();
    expect(summary.lowestBalance).toBeGreaterThan(0);
  });

  it("menangani daftar kosong", () => {
    const summary = projectionSummary([]);
    expect(summary.lowestMonth).toBeNull();
    expect(summary.hasShortfall).toBe(false);
    expect(summary.averageNet).toBe(0);
  });
});

describe("pemasukan tanpa aturan berulang", () => {
  const base = {
    openingBalance: 50_000_000,
    startMonth: "2026-11",
    months: 2,
    averageUnplannedExpense: 3_000_000,
  };

  it("memakai rata-rata historis bila tidak ada aturan pemasukan", () => {
    /*
     * Tanpa ini, pengguna yang mencatat gaji sebagai transaksi biasa akan
     * melihat proyeksi dengan pemasukan Rp0 — angka yang jelas salah dan
     * membuat seluruh proyeksi tidak berguna.
     */
    const result = projectCashFlow({
      ...base,
      rules: [],
      bills: [],
      averageHistoricalIncome: 12_000_000,
    });

    expect(result[0].income).toBe(12_000_000);
    expect(result[0].items.some((item) => item.source === "estimate")).toBe(true);
  });

  it("tidak memakai rata-rata bila sudah ada aturan pemasukan", () => {
    // Aturan berulang lebih akurat daripada rata-rata; jangan dicampur.
    const result = projectCashFlow({
      ...base,
      rules: [rule({ nextAt: "2026-11-02", amount: 15_000_000 })],
      bills: [],
      averageHistoricalIncome: 12_000_000,
    });

    expect(result[0].income).toBe(15_000_000);
  });

  it("tetap nol bila tidak ada data historis", () => {
    const result = projectCashFlow({ ...base, rules: [], bills: [] });
    expect(result[0].income).toBe(0);
  });
});
import { describe, expect, it } from "vitest";
import { comparePayoff, simulatePayoff } from "@/lib/debt-payoff";

/**
 * Simulator pelunasan utang.
 *
 * Yang dijaga: hasilnya harus cocok dengan perhitungan bunga bank yang lazim
 * di Indonesia (bunga per bulan dari sisa pokok), dan kasus batas harus
 * dijelaskan — bukan menghasilkan angka yang menyesatkan.
 */

describe("simulatePayoff — tanpa bunga", () => {
  it("melunasi sesuai pembagian sederhana", () => {
    // Rp12.000.000 dibayar Rp1.000.000/bulan → 12 bulan.
    const result = simulatePayoff({ remaining: 12_000_000, monthlyPayment: 1_000_000 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.months).toBe(12);
    expect(result.totalInterest).toBe(0);
    expect(result.totalPaid).toBe(12_000_000);
  });

  it("bulan terakhir tidak melebihi sisa pokok", () => {
    // Rp2.500.000 dibayar Rp1.000.000 → 3 bulan, terakhir Rp500.000.
    const result = simulatePayoff({ remaining: 2_500_000, monthlyPayment: 1_000_000 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.months).toBe(3);
    const last = result.schedule.at(-1);
    expect(last?.closingBalance).toBe(0);
    expect(last?.principal).toBe(500_000);
  });

  it("lunas dalam satu bulan bila bayaran melebihi utang", () => {
    const result = simulatePayoff({ remaining: 500_000, monthlyPayment: 5_000_000 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.months).toBe(1);
    expect(result.totalPaid).toBe(500_000);
  });
});

describe("simulatePayoff — dengan bunga", () => {
  it("menghitung bunga per bulan dari sisa pokok", () => {
    // Rp12.000.000, bunga 12%/tahun = 1%/bulan, bayar Rp1.000.000.
    const result = simulatePayoff({
      remaining: 12_000_000,
      annualRatePercent: 12,
      monthlyPayment: 1_000_000,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Bunga bulan pertama = 12.000.000 × 1% = 120.000.
    expect(result.schedule[0].interest).toBe(120_000);
    expect(result.schedule[0].principal).toBe(880_000);
    expect(result.schedule[0].closingBalance).toBe(11_120_000);
  });

  it("total bayaran lebih besar dari pokok", () => {
    const result = simulatePayoff({
      remaining: 12_000_000,
      annualRatePercent: 12,
      monthlyPayment: 1_000_000,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.totalInterest).toBeGreaterThan(0);
    expect(result.totalPaid).toBeGreaterThan(12_000_000);
    expect(result.months).toBeGreaterThan(12);
  });

  it("sisa pokok selalu menurun", () => {
    const result = simulatePayoff({
      remaining: 20_000_000,
      annualRatePercent: 8,
      monthlyPayment: 1_500_000,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (let index = 1; index < result.schedule.length; index += 1) {
      expect(result.schedule[index].closingBalance).toBeLessThanOrEqual(
        result.schedule[index - 1].closingBalance,
      );
    }
  });
});

describe("simulatePayoff — kasus batas", () => {
  it("menolak utang yang sudah lunas", () => {
    const result = simulatePayoff({ remaining: 0, monthlyPayment: 1_000_000 });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("paid");
  });

  it("menolak bayaran nol atau negatif", () => {
    for (const monthlyPayment of [0, -1000]) {
      const result = simulatePayoff({ remaining: 1_000_000, monthlyPayment });
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.reason).toBe("no-payment");
    }
  });

  it("menjelaskan bila bayaran tidak menutup bunga", () => {
    /*
     * Rp100.000.000 bunga 24%/tahun = 2%/bulan = Rp2.000.000 bunga bulan
     * pertama. Bayar Rp1.000.000 tidak akan pernah melunasi. Tanpa
     * penjelasan, pengguna hanya melihat simulasi yang tidak berakhir.
     */
    const result = simulatePayoff({
      remaining: 100_000_000,
      annualRatePercent: 24,
      monthlyPayment: 1_000_000,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.reason).toBe("never-paid-off");
    expect(result.message).toMatch(/bunga/i);
    // Pesannya menyebutkan angka minimal yang perlu dibayar.
    expect(result.message).toMatch(/\d/);
  });

  it("menolak masukan tidak valid", () => {
    expect(simulatePayoff({ remaining: -1, monthlyPayment: 1000 }).ok).toBe(false);
    expect(
      simulatePayoff({ remaining: 1000, annualRatePercent: -5, monthlyPayment: 100 }).ok,
    ).toBe(false);
    expect(
      simulatePayoff({ remaining: Number.NaN, monthlyPayment: 100 }).ok,
    ).toBe(false);
  });

  it("memotong jadwal panjang agar respons tetap kecil", () => {
    const result = simulatePayoff(
      { remaining: 600_000_000, monthlyPayment: 1_000_000 },
      12,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.schedule).toHaveLength(12);
    expect(result.months).toBe(600);
    expect(result.truncated).toBe(true);
  });
});

describe("comparePayoff", () => {
  it("menambah bayaran mempercepat pelunasan dan menghemat bunga", () => {
    const comparison = comparePayoff(
      { remaining: 12_000_000, annualRatePercent: 12, monthlyPayment: 1_000_000 },
      500_000,
    );

    expect(comparison.base.ok).toBe(true);
    expect(comparison.faster.ok).toBe(true);

    // Bayar lebih besar → lebih cepat.
    expect(comparison.monthsSaved).toBeGreaterThan(0);
    // Dan bunga lebih sedikit.
    expect(comparison.interestSaved).toBeGreaterThan(0);
  });

  it("mengembalikan nol bila salah satu simulasi gagal", () => {
    const comparison = comparePayoff(
      { remaining: 0, monthlyPayment: 1_000_000 },
      500_000,
    );

    expect(comparison.monthsSaved).toBe(0);
    expect(comparison.interestSaved).toBe(0);
  });
});

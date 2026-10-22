import { describe, expect, it } from "vitest";
import { splitBill } from "@/lib/data/bill-split";
import type { Member } from "@/lib/data/types";

/**
 * Pembagian tagihan antar anggota.
 *
 * Aturan terpenting: **total bagian harus selalu sama dengan jumlah tagihan**.
 * Selisih satu rupiah pun akan membuat laporan keuangan tidak pernah cocok,
 * dan orang akan mempertanyakannya.
 */

const MEMBERS: Member[] = [
  { id: "m-1", name: "Irvan", relationship: "self", role: "owner", color: "butter", active: true },
  { id: "m-2", name: "Sari", relationship: "spouse", role: "adult", color: "plum", active: true },
  { id: "m-3", name: "Bima", relationship: "child", role: "teen", color: "sky", active: true },
];

function sum(shares: Array<{ amount: number }>): number {
  return shares.reduce((total, share) => total + share.amount, 0);
}

describe("splitBill — rata", () => {
  it("membagi rata saat habis dibagi", () => {
    const result = splitBill({ total: 300_000, mode: "equal", members: MEMBERS });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.shares).toHaveLength(3);
    expect(result.shares.every((share) => share.amount === 100_000)).toBe(true);
    expect(sum(result.shares)).toBe(300_000);
  });

  it("membagi sisa pembulatan tanpa kehilangan satu rupiah", () => {
    /*
     * 100.000 / 3 = 33.333,33. Pembulatan naif (33.333 × 3) menyisakan
     * 1 rupiah yang hilang. Total bagian harus tetap 100.000.
     */
    const result = splitBill({ total: 100_000, mode: "equal", members: MEMBERS });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(sum(result.shares)).toBe(100_000);
    expect(result.shares[0].amount).toBe(33_334);
    expect(result.shares[1].amount).toBe(33_333);
    expect(result.shares[2].amount).toBe(33_333);
  });

  it("tetap benar untuk angka yang sangat kecil", () => {
    // 5 rupiah dibagi 3 orang — kasus ekstrem pembulatan.
    const result = splitBill({ total: 5, mode: "equal", members: MEMBERS });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(sum(result.shares)).toBe(5);
  });

  it("bekerja untuk satu anggota", () => {
    const result = splitBill({
      total: 250_000,
      mode: "equal",
      members: [MEMBERS[0]],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.shares[0].amount).toBe(250_000);
  });

  it("menolak tagihan nol atau negatif", () => {
    for (const total of [0, -1000]) {
      const result = splitBill({ total, mode: "equal", members: MEMBERS });
      expect(result.ok).toBe(false);
    }
  });

  it("menolak tanpa anggota", () => {
    const result = splitBill({ total: 100_000, mode: "equal", members: [] });
    expect(result.ok).toBe(false);
  });
});

describe("splitBill — bobot", () => {
  it("membagi sesuai proporsi bobot", () => {
    // 60% / 40% dari 1.000.000.
    const result = splitBill({
      total: 1_000_000,
      mode: "weighted",
      members: [MEMBERS[0], MEMBERS[1]],
      weights: [60, 40],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.shares[0].amount).toBe(600_000);
    expect(result.shares[1].amount).toBe(400_000);
    expect(sum(result.shares)).toBe(1_000_000);
  });

  it("membagi sisa dengan metode sisa terbesar", () => {
    /*
     * 100.000 dengan bobot 1:1:1 sama dengan pembagian rata, tetapi jalur
     * kodenya berbeda — hasilnya harus tetap utuh.
     */
    const result = splitBill({
      total: 100_000,
      mode: "weighted",
      members: MEMBERS,
      weights: [1, 1, 1],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(sum(result.shares)).toBe(100_000);
  });

  it("menangani bobot yang tidak bulat", () => {
    const result = splitBill({
      total: 333_333,
      mode: "weighted",
      members: [MEMBERS[0], MEMBERS[1]],
      weights: [1, 2],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(sum(result.shares)).toBe(333_333);
    // Bobot 2 harus mendapat kira-kira dua kali lipat.
    expect(result.shares[1].amount).toBeGreaterThan(result.shares[0].amount);
  });

  it("menolak bobot yang jumlahnya tidak cocok", () => {
    const result = splitBill({
      total: 100_000,
      mode: "weighted",
      members: MEMBERS,
      weights: [1, 2],
    });

    expect(result.ok).toBe(false);
  });

  it("menolak bobot negatif", () => {
    const result = splitBill({
      total: 100_000,
      mode: "weighted",
      members: [MEMBERS[0], MEMBERS[1]],
      weights: [-1, 2],
    });

    expect(result.ok).toBe(false);
  });

  it("menolak total bobot nol", () => {
    const result = splitBill({
      total: 100_000,
      mode: "weighted",
      members: [MEMBERS[0], MEMBERS[1]],
      weights: [0, 0],
    });

    expect(result.ok).toBe(false);
  });

  it("mengizinkan bobot nol untuk satu anggota", () => {
    // Satu anggota tidak menanggung apa pun — sah, mis. anak yang belum bekerja.
    const result = splitBill({
      total: 100_000,
      mode: "weighted",
      members: [MEMBERS[0], MEMBERS[1]],
      weights: [100, 0],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.shares[1].amount).toBe(0);
    expect(sum(result.shares)).toBe(100_000);
  });
});

describe("splitBill — nominal tetap", () => {
  it("menerima nominal yang jumlahnya pas", () => {
    const result = splitBill({
      total: 900_000,
      mode: "custom",
      members: MEMBERS,
      amounts: [400_000, 400_000, 100_000],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(sum(result.shares)).toBe(900_000);
  });

  it("menolak nominal yang jumlahnya tidak pas", () => {
    /*
     * Lebih baik menolak daripada menyimpan pembagian yang tidak cocok —
     * selisihnya akan muncul di laporan tanpa penjelasan.
     */
    const result = splitBill({
      total: 900_000,
      mode: "custom",
      members: MEMBERS,
      amounts: [400_000, 400_000, 50_000],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/harus sama/i);
  });

  it("menolak nominal negatif", () => {
    const result = splitBill({
      total: 100_000,
      mode: "custom",
      members: [MEMBERS[0], MEMBERS[1]],
      amounts: [150_000, -50_000],
    });

    expect(result.ok).toBe(false);
  });
});

describe("splitBill — persentase", () => {
  it("menghitung persentase tiap bagian", () => {
    const result = splitBill({ total: 200_000, mode: "equal", members: MEMBERS });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const share of result.shares) {
      expect(share.percent).toBeGreaterThanOrEqual(33);
      expect(share.percent).toBeLessThanOrEqual(34);
    }
  });

  it("persentase mendekati 100", () => {
    const result = splitBill({
      total: 1_000_000,
      mode: "weighted",
      members: [MEMBERS[0], MEMBERS[1]],
      weights: [70, 30],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const totalPercent = result.shares.reduce((sum, share) => sum + share.percent, 0);
    expect(totalPercent).toBe(100);
  });
});

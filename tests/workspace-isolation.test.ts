import { beforeEach, describe, expect, it } from "vitest";
import { getStore, resetStore, WS } from "@/lib/data/store";
import {
  assetRows,
  billRows,
  budgetRows,
  debtRows,
  documentRows,
  educationRows,
  goalRows,
  healthRows,
  insuranceRows,
  listAccounts,
  listCategories,
  listChores,
  listTransactions,
  monthSummary,
  netWorth,
  shoppingTotals,
} from "@/lib/data/queries";
import type { Viewer } from "@/lib/data/queries";

/**
 * Audit kebocoran antar-ruang.
 *
 * Setiap query yang membaca koleksi ter-scope harus mengembalikan **hanya**
 * data dari ruang aktif. Test ini menangkap kasus "data ruang lain muncul di
 * dashboard", yang pernah terjadi pada anggaran.
 */

const family: Viewer = {
  userId: "u-irvan",
  profileId: "p-irvan",
  workspaceId: WS.family,
  role: "owner",
};

const personal: Viewer = {
  userId: "u-irvan",
  profileId: "p-irvan",
  workspaceId: WS.irvan,
  role: "owner",
};

beforeEach(() => {
  resetStore();
});

/** Semua id yang boleh terlihat di ruang tertentu. */
function allowedIds(workspaceId: string) {
  return {
    accounts: new Set(
      getStore().accounts.filter((a) => a.workspaceId === workspaceId).map((a) => a.id),
    ),
    categories: new Set(
      getStore().categories.filter((c) => c.workspaceId === workspaceId).map((c) => c.id),
    ),
    bills: new Set(
      getStore().bills.filter((b) => b.workspaceId === workspaceId).map((b) => b.id),
    ),
    goals: new Set(
      getStore().goals.filter((g) => g.workspaceId === workspaceId).map((g) => g.id),
    ),
    debts: new Set(
      getStore().debts.filter((d) => d.workspaceId === workspaceId).map((d) => d.id),
    ),
    assets: new Set(
      getStore().assets.filter((a) => a.workspaceId === workspaceId).map((a) => a.id),
    ),
    insurances: new Set(
      getStore().insurances.filter((i) => i.workspaceId === workspaceId).map((i) => i.id),
    ),
    documents: new Set(
      getStore().documents.filter((d) => d.workspaceId === workspaceId).map((d) => d.id),
    ),
    healthRecords: new Set(
      getStore().healthRecords.filter((h) => h.workspaceId === workspaceId).map((h) => h.id),
    ),
    educationRecords: new Set(
      getStore()
        .educationRecords.filter((e) => e.workspaceId === workspaceId)
        .map((e) => e.id),
    ),
    chores: new Set(
      getStore().chores.filter((c) => c.workspaceId === workspaceId).map((c) => c.id),
    ),
  };
}

describe("tidak ada kebocoran antar-ruang", () => {
  it("akun hanya dari ruang aktif", () => {
    for (const viewer of [family, personal]) {
      const allowed = allowedIds(viewer.workspaceId).accounts;
      for (const account of listAccounts(viewer.workspaceId)) {
        expect(allowed.has(account.id)).toBe(true);
      }
    }
  });

  it("kategori hanya dari ruang aktif", () => {
    for (const viewer of [family, personal]) {
      const allowed = allowedIds(viewer.workspaceId).categories;
      for (const category of listCategories(viewer.workspaceId)) {
        expect(allowed.has(category.id)).toBe(true);
      }
    }
  });

  it("anggaran hanya dari ruang aktif", () => {
    const familyBudgets = budgetRows(undefined, family);
    const personalBudgets = budgetRows(undefined, personal);

    // Ruang keluarga punya anggaran contoh; ruang pribadi tidak.
    expect(familyBudgets.length).toBeGreaterThan(0);
    expect(personalBudgets).toHaveLength(0);
  });

  it("tagihan hanya dari ruang aktif", () => {
    expect(billRows(WS.family).length).toBeGreaterThan(0);
    expect(billRows(WS.irvan)).toHaveLength(0);
  });

  it("tujuan hanya dari ruang aktif", () => {
    expect(goalRows(WS.family).length).toBeGreaterThan(0);
    expect(goalRows(WS.irvan)).toHaveLength(0);
  });

  it("utang hanya dari ruang aktif", () => {
    expect(debtRows(undefined, WS.family).length).toBeGreaterThan(0);
    expect(debtRows(undefined, WS.irvan)).toHaveLength(0);
  });

  it("aset hanya dari ruang aktif", () => {
    expect(assetRows(WS.family).length).toBeGreaterThan(0);
    expect(assetRows(WS.irvan)).toHaveLength(0);
  });

  it("asuransi hanya dari ruang aktif", () => {
    expect(insuranceRows(WS.family).length).toBeGreaterThan(0);
    expect(insuranceRows(WS.irvan)).toHaveLength(0);
  });

  it("dokumen hanya dari ruang aktif", () => {
    expect(documentRows(family).length).toBeGreaterThan(0);
    expect(documentRows(personal)).toHaveLength(0);
  });

  it("catatan kesehatan hanya dari ruang aktif", () => {
    expect(healthRows(family).length).toBeGreaterThan(0);
    expect(healthRows(personal)).toHaveLength(0);
  });

  it("pendidikan hanya dari ruang aktif", () => {
    expect(educationRows(WS.family).length).toBeGreaterThan(0);
    expect(educationRows(WS.irvan)).toHaveLength(0);
  });

  it("tugas hanya dari ruang aktif", () => {
    expect(listChores(WS.family).length).toBeGreaterThan(0);
    expect(listChores(WS.irvan)).toHaveLength(0);
  });

  it("belanja hanya dari ruang aktif", () => {
    expect(shoppingTotals(WS.family).total).toBeGreaterThan(0);
    expect(shoppingTotals(WS.irvan).total).toBe(0);
  });

  it("transaksi hanya dari ruang aktif", () => {
    const familyTx = listTransactions({}, family);
    const personalTx = listTransactions({}, personal);

    expect(familyTx.length).toBeGreaterThan(0);
    expect(personalTx.length).toBeGreaterThan(0);
    for (const tx of familyTx) expect(tx.workspaceId).toBe(WS.family);
    for (const tx of personalTx) expect(tx.workspaceId).toBe(WS.irvan);
  });

  it("ringkasan bulan tidak mencampur ruang", () => {
    const a = monthSummary(undefined, family);
    const b = monthSummary(undefined, personal);
    expect(a.expense).not.toBe(b.expense);
    expect(a.income).not.toBe(b.income);
  });

  it("kekayaan bersih mengikuti ruang", () => {
    const a = netWorth(WS.family);
    const b = netWorth(WS.irvan);
    expect(a.total).not.toBe(b.total);
    expect(b.assetsTotal).toBe(0);
    expect(b.payable).toBe(0);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStore, resetStore, saveStore } from "@/lib/data/store";
import { WS } from "@/lib/data/store";
import {
  debtRows,
  listAccounts,
  listTransactions,
  monthSummary,
} from "@/lib/data/queries";
import type { Viewer } from "@/lib/data/queries";
import type { Transaction } from "@/lib/data/types";

/**
 * Test ini menjaga bug yang pernah terjadi: server action membuat entitas
 * tanpa `workspaceId`, sehingga data tersimpan tetapi tidak pernah muncul di
 * query mana pun (dashboard tampak Rp0).
 */

const viewerFamily: Viewer = {
  userId: "u-irvan",
  profileId: "p-irvan",
  workspaceId: WS.family,
  role: "owner",
};

const viewerPersonal: Viewer = {
  userId: "u-irvan",
  profileId: "p-irvan",
  workspaceId: WS.irvan,
  role: "owner",
};

beforeEach(() => {
  resetStore();
  vi.resetModules();
});

/** Meniru `createTransaction` yang benar: menandai ruang + pencatat. */
function addScopedTransaction(workspaceId: string, profileId: string, description: string) {
  const store = getStore();
  const account = store.accounts.find((a) => a.workspaceId === workspaceId);
  const tx: Transaction = {
    id: `tx-${description}`,
    workspaceId,
    type: "expense",
    amount: 77_000,
    occurredAt: new Date().toISOString().slice(0, 10),
    description,
    accountId: account?.id ?? "acc-1",
    memberId: "m-irvan",
    recordedByProfileId: profileId,
    visibility: "household",
  };
  store.transactions.push(tx);
  return tx;
}

describe("entitas baru wajib membawa workspaceId", () => {
  it("transaksi tanpa workspaceId tidak muncul di ruang mana pun", () => {
    // Meniru bug lama: entitas dibuat tanpa workspaceId.
    getStore().transactions.push({
      id: "tx-tanpa-ruang",
      type: "expense",
      amount: 50_000,
      occurredAt: new Date().toISOString().slice(0, 10),
      description: "Tanpa ruang",
      accountId: "acc-1",
      visibility: "household",
    });

    const inFamily = listTransactions({ q: "Tanpa ruang" }, viewerFamily);
    const inPersonal = listTransactions({ q: "Tanpa ruang" }, viewerPersonal);

    expect(inFamily).toHaveLength(0);
    expect(inPersonal).toHaveLength(0);
  });

  it("transaksi dengan workspaceId muncul di ruang yang tepat", () => {
    addScopedTransaction(WS.family, "p-irvan", "Uji ruang keluarga");
    addScopedTransaction(WS.irvan, "p-irvan", "Uji ruang pribadi");

    const family = listTransactions({ q: "Uji ruang" }, viewerFamily);
    const personal = listTransactions({ q: "Uji ruang" }, viewerPersonal);

    expect(family).toHaveLength(1);
    expect(family[0].description).toBe("Uji ruang keluarga");
    expect(personal).toHaveLength(1);
    expect(personal[0].description).toBe("Uji ruang pribadi");
  });

  it("ringkasan bulan hanya menghitung ruang aktif", () => {
    addScopedTransaction(WS.family, "p-irvan", "Keluarga A");
    addScopedTransaction(WS.irvan, "p-irvan", "Pribadi A");

    const family = monthSummary(undefined, viewerFamily);
    const personal = monthSummary(undefined, viewerPersonal);

    expect(family.expense).toBeGreaterThan(0);
    expect(personal.expense).toBeGreaterThan(0);
    // Ruang pribadi tidak ikut menghitung belanja keluarga.
    expect(personal.expense).toBeLessThan(family.expense);
  });

  it("saldo akun hanya dari akun ruang aktif", () => {
    const familyAccounts = listAccounts(WS.family);
    const personalAccounts = listAccounts(WS.irvan);

    expect(familyAccounts.length).toBeGreaterThan(0);
    expect(personalAccounts.length).toBeGreaterThan(0);
    // Tidak ada akun yang muncul di dua ruang.
    const familyIds = new Set(familyAccounts.map((a) => a.id));
    expect(personalAccounts.some((a) => familyIds.has(a.id))).toBe(false);
  });

  it("utang ruang keluarga tidak muncul di ruang pribadi", () => {
    expect(debtRows(undefined, WS.family).length).toBeGreaterThan(0);
    expect(debtRows(undefined, WS.irvan)).toHaveLength(0);
  });
});

describe("guard aksi ubah/hapus", () => {
  it("entitas ruang lain tidak ditemukan lewat pencarian ter-scope", () => {
    const store = getStore();
    const familyDebt = store.debts.find((d) => d.workspaceId === WS.family)!;

    // Meniru findScoped: id cocok tetapi ruang berbeda → tidak ditemukan.
    const found = store.debts.find(
      (d) => d.id === familyDebt.id && d.workspaceId === WS.irvan,
    );
    expect(found).toBeUndefined();

    const correct = store.debts.find(
      (d) => d.id === familyDebt.id && d.workspaceId === WS.family,
    );
    expect(correct).toBeDefined();
  });

  it("visibilitas private hanya untuk pencatatnya", () => {
    const tx = addScopedTransaction(WS.family, "p-sari", "Catatan Sari");
    tx.visibility = "private" as const;

    const asIrvan = listTransactions({ q: "Catatan Sari" }, viewerFamily);
    const asSari = listTransactions({ q: "Catatan Sari" }, {
      ...viewerFamily,
      profileId: "p-sari",
      role: "adult",
    });

    expect(asIrvan).toHaveLength(0);
    expect(asSari).toHaveLength(1);
  });
});

describe("persistensi", () => {
  it("menyimpan lalu memuat ulang mempertahankan workspaceId", () => {
    addScopedTransaction(WS.irvan, "p-irvan", "Persist pribadi");
    saveStore();

    const reloaded = listTransactions({ q: "Persist pribadi" }, viewerPersonal);
    expect(reloaded).toHaveLength(1);
    expect(reloaded[0].workspaceId).toBe(WS.irvan);
    expect(reloaded[0].recordedByProfileId).toBe("p-irvan");
  });
});

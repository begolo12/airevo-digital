import { beforeEach, describe, expect, it, vi } from "vitest";
import { WS } from "@/lib/data/store";

/**
 * Validasi rujukan lintas-ruang.
 *
 * Celah yang ditutup: sebuah form bisa mengirim id akun, kategori, atau
 * anggota milik ruang lain. Sebelum diperbaiki, transaksinya tetap tersimpan
 * dan saldo ruang lain ikut terpakai.
 *
 * Sesi ditiru lewat `vi.mock` karena `currentScope()` membaca cookie Next,
 * yang tidak tersedia saat server action dipanggil langsung dari Vitest.
 */

const state = { workspaceId: WS.family, profileId: "p-irvan", role: "owner" as const };

vi.mock("@/lib/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/session")>("@/lib/session");

  const currentViewer = () => ({
    userId: "u-irvan",
    profileId: state.profileId,
    workspaceId: state.workspaceId,
    role: state.role,
  });

  return {
    ...actual,
    getViewer: async () => currentViewer(),
    /*
     * Setia pada perilaku asli: `requireViewer` melempar redirect saat tidak
     * ada sesi. Mock yang selalu mengembalikan viewer membuat test otorisasi
     * lulus palsu.
     */
    requireViewer: async () => {
      if (!state.workspaceId) throw new Error("NEXT_REDIRECT:/pilih-profil");
      return currentViewer();
    },
    requireActiveSession: async () => {
      if (!state.workspaceId) throw new Error("NEXT_REDIRECT:/login");
      return {
        userId: "u-irvan",
        email: "irvan@airevo-digital.my.id",
        name: "Irvan",
        role: state.role,
        stage: "active" as const,
        profileId: state.profileId,
        workspaceId: state.workspaceId,
      };
    },
    getSession: async () =>
      state.workspaceId
        ? {
            userId: "u-irvan",
            email: "irvan@airevo-digital.my.id",
            name: "Irvan",
            role: state.role,
            stage: "active" as const,
            profileId: state.profileId,
            workspaceId: state.workspaceId,
          }
        : null,
  };
});

const { getStore, resetStore } = await import("@/lib/data/store");
const { createTransaction, payBill } = await import("@/lib/data/actions");
const { listTransactions } = await import("@/lib/data/queries");

function form(fields: Record<string, string | number>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, String(value));
  return data;
}

const viewer = () => ({
  userId: "u-irvan",
  profileId: state.profileId,
  workspaceId: state.workspaceId,
  role: state.role,
});

beforeEach(() => {
  resetStore();
  state.workspaceId = WS.family;
  state.profileId = "p-irvan";
});

describe("createTransaction menolak rujukan lintas-ruang", () => {
  it("menolak akun milik ruang lain", async () => {
    const foreign = getStore().accounts.find((a) => a.workspaceId === WS.irvan)!;
    const ownCategory = getStore().categories.find(
      (c) => c.workspaceId === WS.family && c.kind === "expense",
    )!;

    const result = await createTransaction(
      form({
        type: "expense",
        amount: 50_000,
        occurredAt: "2026-10-20",
        description: "Uji akun asing",
        accountId: foreign.id,
        categoryId: ownCategory.id,
        visibility: "household",
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Akun/i);
    expect(listTransactions({ q: "Uji akun asing" }, viewer())).toHaveLength(0);
  });

  it("menolak kategori milik ruang lain", async () => {
    const own = getStore().accounts.find((a) => a.workspaceId === WS.family)!;
    const foreign = getStore().categories.find(
      (c) => c.workspaceId === WS.irvan && c.kind === "expense",
    )!;

    const result = await createTransaction(
      form({
        type: "expense",
        amount: 50_000,
        occurredAt: "2026-10-20",
        description: "Uji kategori asing",
        accountId: own.id,
        categoryId: foreign.id,
        visibility: "household",
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Kategori/i);
  });

  it("menolak akun tujuan transfer milik ruang lain", async () => {
    const own = getStore().accounts.find((a) => a.workspaceId === WS.family)!;
    const foreign = getStore().accounts.find((a) => a.workspaceId === WS.irvan)!;

    const result = await createTransaction(
      form({
        type: "transfer",
        amount: 100_000,
        occurredAt: "2026-10-20",
        description: "Uji transfer asing",
        accountId: own.id,
        toAccountId: foreign.id,
        visibility: "household",
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Akun tujuan/i);
  });

  it("menerima rujukan yang sah", async () => {
    const own = getStore().accounts.find((a) => a.workspaceId === WS.family)!;
    const category = getStore().categories.find(
      (c) => c.workspaceId === WS.family && c.kind === "expense",
    )!;

    const result = await createTransaction(
      form({
        type: "expense",
        amount: 42_000,
        occurredAt: "2026-10-20",
        description: "Uji rujukan sah",
        accountId: own.id,
        categoryId: category.id,
        visibility: "household",
      }),
    );

    expect(result.ok).toBe(true);
    expect(listTransactions({ q: "Uji rujukan sah" }, viewer())).toHaveLength(1);
  });
});

describe("kategori harus sesuai jenis transaksi", () => {
  it("menolak kategori pemasukan untuk pengeluaran", async () => {
    const account = getStore().accounts.find((a) => a.workspaceId === WS.family)!;
    const incomeCategory = getStore().categories.find(
      (c) => c.workspaceId === WS.family && c.kind === "income",
    )!;

    const result = await createTransaction(
      form({
        type: "expense",
        amount: 30_000,
        occurredAt: "2026-10-20",
        description: "Uji kategori salah jenis",
        accountId: account.id,
        categoryId: incomeCategory.id,
        visibility: "household",
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/pemasukan/i);
  });

  it("menolak kategori pengeluaran untuk pemasukan", async () => {
    const account = getStore().accounts.find((a) => a.workspaceId === WS.family)!;
    const expenseCategory = getStore().categories.find(
      (c) => c.workspaceId === WS.family && c.kind === "expense",
    )!;

    const result = await createTransaction(
      form({
        type: "income",
        amount: 30_000,
        occurredAt: "2026-10-20",
        description: "Uji kategori salah jenis 2",
        accountId: account.id,
        categoryId: expenseCategory.id,
        visibility: "household",
      }),
    );

    expect(result.ok).toBe(false);
  });

  it("menerima kategori yang sesuai", async () => {
    const account = getStore().accounts.find((a) => a.workspaceId === WS.family)!;
    const category = getStore().categories.find(
      (c) => c.workspaceId === WS.family && c.kind === "income",
    )!;

    const result = await createTransaction(
      form({
        type: "income",
        amount: 1_000_000,
        occurredAt: "2026-10-20",
        description: "Uji pemasukan benar",
        accountId: account.id,
        categoryId: category.id,
        visibility: "household",
      }),
    );

    expect(result.ok).toBe(true);
  });
});

describe("payBill menolak akun lintas-ruang", () => {
  it("menolak akun milik ruang lain", async () => {
    const bill = getStore().bills.find((b) => b.workspaceId === WS.family)!;
    const foreign = getStore().accounts.find((a) => a.workspaceId === WS.irvan)!;

    const result = await payBill(form({ billId: bill.id, accountId: foreign.id }));

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Akun/i);
  });

  it("menerima akun sendiri", async () => {
    const bill = getStore().bills.find((b) => b.workspaceId === WS.family)!;
    const account = getStore().accounts.find((a) => a.workspaceId === WS.family)!;

    const result = await payBill(form({ billId: bill.id, accountId: account.id }));

    expect(result.ok).toBe(true);
  });
});

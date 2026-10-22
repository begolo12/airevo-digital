import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Pembagian tagihan antar anggota lewat server action.
 *
 * Yang dijaga: pembagian dihitung di **server**, bukan diterima dari klien.
 * Bila nominal bagian dikirim dari browser, angka bisa dimanipulasi dan total
 * bagian tidak lagi cocok dengan tagihan.
 */

vi.mock("@/lib/session", async () => {
  const { sessionMock } = await import("./helpers/session");
  return sessionMock();
});

vi.mock("next/cache", async () => {
  const actual = await vi.importActual<typeof import("next/cache")>("next/cache");
  return { ...actual, revalidatePath: () => {} };
});

const { getStore, resetStore, WS } = await import("@/lib/data/store");
const { setViewer } = await import("./helpers/session");
const { createBill } = await import("@/lib/data/actions");

/** Membuat FormData; `splitMembers` boleh banyak nilai. */
function billForm(
  fields: Record<string, string | number>,
  splitMembers: string[] = [],
): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, String(value));
  for (const id of splitMembers) data.append("splitMembers", id);
  return data;
}

function baseFields(overrides: Record<string, string | number> = {}) {
  return {
    name: "Listrik PLN",
    amount: 900_000,
    frequency: "monthly",
    dueDay: 15,
    nextDueDate: "2026-11-15",
    reminderDaysBefore: 3,
    ...overrides,
  };
}

function activeMembers() {
  const members = getStore().members.filter((member) => member.active);
  if (members.length < 2) throw new Error("Data contoh butuh minimal 2 anggota");
  return members;
}

beforeEach(() => {
  resetStore();
  setViewer({ workspaceId: WS.family, role: "owner" });
});

describe("createBill dengan pembagian", () => {
  it("menyimpan pembagian rata saat anggota dipilih", async () => {
    const members = activeMembers().slice(0, 2);

    const result = await createBill(
      billForm(baseFields(), members.map((member) => member.id)),
    );

    expect(result.ok).toBe(true);

    const bill = getStore().bills.at(-1)!;
    expect(bill.split).toBeTruthy();
    expect(bill.split?.mode).toBe("equal");
    expect(bill.split?.shares).toHaveLength(2);
  });

  it("total bagian selalu sama dengan jumlah tagihan", async () => {
    /*
     * 900.000 / 4 anggota tidak habis dibagi — inilah kasus yang paling mudah
     * kehilangan satu rupiah.
     */
    const members = activeMembers();

    await createBill(
      billForm(baseFields({ amount: 900_001 }), members.map((member) => member.id)),
    );

    const bill = getStore().bills.at(-1)!;
    const sum = bill.split!.shares.reduce((acc, share) => acc + share.amount, 0);
    expect(sum).toBe(900_001);
  });

  it("tidak menyimpan pembagian bila tidak ada anggota dipilih", async () => {
    const result = await createBill(billForm(baseFields(), []));

    expect(result.ok).toBe(true);
    const bill = getStore().bills.at(-1)!;
    expect(bill.split).toBeUndefined();
  });

  it("menerima banyak anggota sekaligus", async () => {
    /*
     * `formData.get()` hanya mengembalikan nilai pertama untuk kotak centang
     * bernama sama. Bila aksi memakai `get`, pembagian diam-diam hanya untuk
     * satu anggota — test ini menangkapnya.
     */
    const members = activeMembers();

    await createBill(
      billForm(baseFields(), members.map((member) => member.id)),
    );

    const bill = getStore().bills.at(-1)!;
    expect(bill.split?.shares).toHaveLength(members.length);
  });

  it("menolak anggota yang tidak dikenal", async () => {
    const result = await createBill(
      billForm(baseFields(), ["m-tidak-ada"]),
    );

    expect(result.ok).toBe(false);
  });

  it("tidak menyimpan tagihan saat anggota tidak sah", async () => {
    const before = getStore().bills.length;

    await createBill(billForm(baseFields(), ["m-tidak-ada"]));

    expect(getStore().bills).toHaveLength(before);
  });

  it("pembagian memakai nominal tagihan, bukan kiriman klien", async () => {
    /*
     * Nominal bagian tidak pernah diterima dari klien. Test ini memastikan
     * totalnya mengikuti `amount` tagihan.
     */
    const members = activeMembers().slice(0, 3);

    await createBill(
      billForm(baseFields({ amount: 750_000 }), members.map((member) => member.id)),
    );

    const bill = getStore().bills.at(-1)!;
    const sum = bill.split!.shares.reduce((acc, share) => acc + share.amount, 0);
    expect(sum).toBe(750_000);
    expect(bill.amount).toBe(750_000);
  });
});

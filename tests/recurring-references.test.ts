import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Rujukan dari aturan berulang.
 *
 * Aturan berulang menyimpan `accountId`, `categoryId`, dan `memberId`. Bila
 * entitas itu dihapus atau diarsipkan, aturan tetap ada dan akan membuat
 * transaksi yang merujuk sesuatu yang sudah tidak ada — transaksi seperti itu
 * muncul tanpa nama akun dan tidak masuk hitungan saldo mana pun.
 *
 * Test ini menjaga agar aksi hapus/arsip memeriksa rujukan dari aturan
 * berulang, bukan hanya dari transaksi.
 */

vi.mock("@/lib/session", async () => {
  const { sessionMock } = await import("./helpers/session");
  return sessionMock();
});

vi.mock("next/cache", async () => {
  const actual = await vi.importActual<typeof import("next/cache")>("next/cache");
  return { ...actual, revalidatePath: () => {} };
});

const { getStore, resetStore } = await import("@/lib/data/store");
const { setViewer } = await import("./helpers/session");
const { archiveAccount, archiveCategory, createRecurringRule, toggleRecurringRule, runDueRecurring } =
  await import("@/lib/data/actions");

function form(fields: Record<string, string | number>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, String(value));
  return data;
}

/**
 * Akun baru tanpa transaksi, agar bisa diarsipkan.
 *
 * Data contoh sudah memakai semua akunnya, jadi akun dibuat langsung di store
 * alih-alih dicari.
 */
function unusedAccount() {
  const store = getStore();
  const account = {
    id: `a-uji-${Math.random().toString(36).slice(2, 8)}`,
    workspaceId: "ws-family",
    name: "Akun Uji",
    type: "bank" as const,
    openingBalance: 0,
    balance: 0,
    color: "sky",
    isShared: true,
    archived: false,
  };
  store.accounts.push(account);
  return account;
}

function familyCategory() {
  const category = getStore().categories.find(
    (item) => item.workspaceId === "ws-family" && item.kind === "expense" && !item.archived,
  );
  if (!category) throw new Error("Tidak ada kategori pengeluaran");
  return category;
}

beforeEach(() => {
  resetStore();
  setViewer({ workspaceId: "ws-family", role: "owner" });
});

describe("arsip akun yang dirujuk aturan berulang", () => {
  it("menolak mengarsipkan akun yang masih dipakai aturan berulang", async () => {
    const account = unusedAccount();

    // Buat aturan yang memakai akun ini.
    const created = await createRecurringRule(
      form({
        type: "expense",
        amount: 100_000,
        description: "Langganan uji",
        accountId: account.id,
        categoryId: familyCategory().id,
        visibility: "household",
        frequency: "monthly",
        startAt: "2030-01-01",
      }),
    );
    expect(created.ok).toBe(true);

    /*
     * Tanpa pemeriksaan ini, akun bisa diarsipkan. Aturan berulang lalu
     * membuat transaksi yang merujuk akun terarsip — transaksi itu tidak
     * masuk hitungan saldo mana pun dan muncul tanpa nama akun.
     */
    const result = await archiveAccount(form({ id: account.id }));

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/berulang|aturan/i);
    expect(getStore().accounts.find((item) => item.id === account.id)?.archived).toBe(
      false,
    );
  });

  it("tetap mengizinkan arsip akun yang tidak dirujuk apa pun", async () => {
    const account = unusedAccount();

    const result = await archiveAccount(form({ id: account.id }));

    expect(result.ok).toBe(true);
    expect(getStore().accounts.find((item) => item.id === account.id)?.archived).toBe(
      true,
    );
  });
});

describe("arsip kategori yang dirujuk aturan berulang", () => {
  it("menolak mengarsipkan kategori yang masih dipakai aturan berulang", async () => {
    const account = unusedAccount();
    const category = familyCategory();

    const created = await createRecurringRule(
      form({
        type: "expense",
        amount: 50_000,
        description: "Uji kategori",
        accountId: account.id,
        categoryId: category.id,
        visibility: "household",
        frequency: "monthly",
        startAt: "2030-01-01",
      }),
    );
    expect(created.ok).toBe(true);

    const result = await archiveCategory(form({ id: category.id }));

    expect(result.ok).toBe(false);
    expect(getStore().categories.find((item) => item.id === category.id)?.archived).toBe(
      false,
    );
  });
});

describe("aturan yang merujuk entitas hilang", () => {
  it("tidak membuat transaksi bila akunnya sudah tidak ada", async () => {
    /*
     * Sabuk pengaman terakhir: meskipun data sudah tidak konsisten (mis. dari
     * versi lama), pembuatan transaksi harus melewati aturan yang rujukannya
     * hilang — bukan membuat transaksi rusak.
     */
    const store = getStore();
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

    store.recurringRules.push({
      id: "rr-rusak",
      workspaceId: "ws-family",
      type: "expense",
      amount: 10_000,
      description: "Rujukan hilang",
      accountId: "a-tidak-ada",
      categoryId: "c-tidak-ada",
      visibility: "household",
      frequency: "monthly",
      startAt: yesterday,
      nextAt: yesterday,
      active: true,
      createdAt: new Date().toISOString(),
    });

    const before = store.transactions.length;
    const result = await runDueRecurring();

    expect(result.ok).toBe(true);
    expect(store.transactions).toHaveLength(before);
  });
});

describe("kasus tepi: aturan diaktifkan setelah akunnya diarsipkan", () => {
  it("tidak membuat transaksi untuk akun yang sudah diarsipkan", async () => {
    /*
     * Urutan yang bisa terjadi di dunia nyata:
     *
     * 1. Aturan dimatikan → akun tidak lagi "dipakai aturan aktif"
     * 2. Akun diarsipkan → sekarang akun terarsip
     * 3. Aturan diaktifkan kembali → menunjuk akun terarsip
     *
     * Tanpa penyaringan akun terarsip, langkah 3 menghasilkan transaksi yang
     * merujuk akun yang sudah tidak dipakai — tidak masuk saldo mana pun.
     */
    const account = unusedAccount();
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

    const created = await createRecurringRule(
      form({
        type: "expense",
        amount: 75_000,
        description: "Aturan akun terarsip",
        accountId: account.id,
        categoryId: familyCategory().id,
        visibility: "household",
        frequency: "monthly",
        startAt: yesterday,
      }),
    );
    expect(created.ok).toBe(true);

    const rule = getStore().recurringRules.at(-1)!;

    // 1. Matikan aturan, lalu arsipkan akun.
    await toggleRecurringRule(form({ id: rule.id }));
    expect((await archiveAccount(form({ id: account.id }))).ok).toBe(true);

    // 2. Aktifkan kembali — harus DITOLAK karena akunnya terarsip.
    const reactivate = await toggleRecurringRule(form({ id: rule.id }));
    expect(reactivate.ok).toBe(false);
    expect(reactivate.message).toMatch(/arsip/i);

    // Aturan tetap nonaktif, jadi tidak ada transaksi.
    expect(getStore().recurringRules.find((item) => item.id === rule.id)?.active).toBe(
      false,
    );

    const before = getStore().transactions.length;
    await runDueRecurring();
    expect(getStore().transactions).toHaveLength(before);
  });

  it("lapis kedua: data tidak konsisten pun tidak menghasilkan transaksi", async () => {
    /*
     * Sabuk pengaman `applyDueRules` diuji terpisah: seandainya data sudah
     * terlanjur tidak konsisten (mis. dari versi lama atau perubahan langsung
     * di database), pembuatan transaksi tetap harus melewati aturan yang
     * akunnya terarsip.
     */
    const store = getStore();
    const account = unusedAccount();
    account.archived = true;

    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

    store.recurringRules.push({
      id: "rr-akun-terarsip",
      workspaceId: "ws-family",
      type: "expense",
      amount: 50_000,
      description: "Menunjuk akun terarsip",
      accountId: account.id,
      categoryId: familyCategory().id,
      visibility: "household",
      frequency: "monthly",
      startAt: yesterday,
      nextAt: yesterday,
      active: true,
      createdAt: new Date().toISOString(),
    });

    const before = store.transactions.length;
    await runDueRecurring();

    expect(store.transactions).toHaveLength(before);
  });
});
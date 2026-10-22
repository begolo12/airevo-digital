import { beforeEach, describe, expect, it, vi } from "vitest";
import { addMonths, safeDueDate } from "@/lib/format";
import type { ActionResult } from "@/lib/data/types";
import { clearViewer, form, setViewer } from "./helpers/session";

/**
 * Test server action keuangan: akun, kategori, anggaran, tagihan, dan
 * pembatalan transaksi.
 *
 * Semua aksi membaca sesi lewat `getViewer()`, yang bergantung pada cookie
 * Next. Modul sesi karena itu diganti tiruan yang bisa diatur per test lewat
 * `setViewer()` / `clearViewer()`.
 *
 * Tiruan dipasang di tingkat modul (bukan di dalam fungsi) karena `vi.mock`
 * diangkat ke atas oleh Vitest; itulah sebabnya helper menyediakan
 * `sessionMock()` untuk dipanggil dari sini.
 *
 * `it.fails` dipakai untuk MENDOKUMENTASIKAN celah di kode produksi: test itu
 * gagal hari ini, dan sengaja ditulis sebagai "seharusnya begini". Begitu
 * celahnya diperbaiki, `it.fails` akan ikut gagal sehingga penandanya harus
 * diubah menjadi `it`.
 */

vi.mock("@/lib/session", async () => {
  const { sessionMock } = await import("./helpers/session");
  return sessionMock();
});

const { getStore, resetStore, WS } = await import("@/lib/data/store");
const {
  archiveAccount,
  archiveCategory,
  createAccount,
  createBill,
  createCategory,
  createTransaction,
  updateTransaction,
  restoreTransaction,
  payBill,
  removeBudget,
  setBudget,
  skipBill,
  voidTransaction,
} = await import("@/lib/data/actions");
const { listCategories, listTransactions } = await import("@/lib/data/queries");

const VIEWER = {
  userId: "u-irvan",
  profileId: "p-irvan",
  workspaceId: WS.family,
  role: "owner" as const,
};

const OWNER = { workspaceId: WS.family, profileId: "p-irvan", role: "owner" as const };

beforeEach(() => {
  resetStore();
  setViewer(OWNER);
});

/* --------------------------------- bantuan -------------------------------- */

/** Akun milik ruang keluarga. */
function familyAccount() {
  return getStore().accounts.find((a) => a.workspaceId === WS.family)!;
}

/** Kategori ruang keluarga dengan jenis tertentu. */
function familyCategory(kind: "income" | "expense") {
  return getStore().categories.find(
    (c) => c.workspaceId === WS.family && c.kind === kind,
  )!;
}

/** Akun milik ruang pribadi Irvan — dipakai untuk uji isolasi ruang. */
function foreignAccount() {
  return getStore().accounts.find((a) => a.workspaceId === WS.irvan)!;
}

/** Kategori milik ruang pribadi Irvan — dipakai untuk uji isolasi ruang. */
function foreignCategory() {
  return getStore().categories.find((c) => c.workspaceId === WS.irvan)!;
}

/**
 * Jumlah baris tiap koleksi.
 *
 * Dipakai untuk membuktikan "store tidak berubah" pada jalur gagal, tanpa
 * terpaku pada isi lengkap data contoh.
 */
function counts() {
  const store = getStore();
  return {
    accounts: store.accounts.length,
    categories: store.categories.length,
    transactions: store.transactions.length,
    budgets: store.budgets.length,
    bills: store.bills.length,
    billPayments: store.billPayments.length,
  };
}

function lastTransaction() {
  const rows = getStore().transactions;
  return rows[rows.length - 1];
}

function lastPayment() {
  const rows = getStore().billPayments;
  return rows[rows.length - 1];
}

/* --------------------------------- akun ---------------------------------- */

describe("createAccount", () => {
  it("menyimpan akun baru di ruang aktif beserta pencatatnya", async () => {
    const before = getStore().accounts.length;

    const result = await createAccount(
      form({ name: "Dompet Uji", type: "bank", openingBalance: 250_000, color: "sky" }),
    );

    expect(result.ok).toBe(true);
    expect(getStore().accounts).toHaveLength(before + 1);
    const created = getStore().accounts.find((a) => a.name === "Dompet Uji")!;
    // Tanpa workspaceId + pencatat, akun tersimpan tetapi tidak muncul di query.
    expect(created.workspaceId).toBe(WS.family);
    expect(created.recordedByProfileId).toBe("p-irvan");
    expect(created).toMatchObject({
      type: "bank",
      openingBalance: 250_000,
      archived: false,
    });
  });

  it("menolak nama kosong tanpa menambah akun", async () => {
    const before = counts();

    const result = await createAccount(
      form({ name: "   ", type: "bank", openingBalance: 0 }),
    );

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Nama akun wajib diisi/);
    expect(counts()).toEqual(before);
  });

  it("menolak saldo awal negatif", async () => {
    const before = counts();

    const result = await createAccount(
      form({ name: "Akun Minus", type: "cash", openingBalance: -1 }),
    );

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Saldo awal tidak boleh negatif/);
    expect(counts()).toEqual(before);
  });

  it("menulis ke ruang pribadi saat sesi berada di ruang pribadi", async () => {
    setViewer({ workspaceId: WS.irvan, profileId: "p-irvan", role: "owner" });
    const familyBefore = getStore().accounts.filter(
      (a) => a.workspaceId === WS.family,
    ).length;

    const result = await createAccount(
      form({ name: "Dompet Pribadi Uji", type: "cash", openingBalance: 1_000 }),
    );

    expect(result.ok).toBe(true);
    const created = getStore().accounts.find(
      (a) => a.name === "Dompet Pribadi Uji",
    )!;
    expect(created.workspaceId).toBe(WS.irvan);
    // Ruang keluarga tidak ikut terisi.
    expect(getStore().accounts.filter((a) => a.workspaceId === WS.family)).toHaveLength(
      familyBefore,
    );
  });
});

describe("archiveAccount", () => {
  it("mengarsipkan akun tanpa transaksi tanpa menghapusnya", async () => {
    await createAccount(
      form({ name: "Dompet Baru", type: "cash", openingBalance: 5_000 }),
    );
    const account = getStore().accounts.find((a) => a.name === "Dompet Baru")!;
    const before = getStore().accounts.length;

    const result = await archiveAccount(form({ id: account.id }));

    expect(result.ok).toBe(true);
    expect(account.archived).toBe(true);
    // Arsip bukan hapus: baris akun tetap ada.
    expect(getStore().accounts).toHaveLength(before);
  });

  it("menolak arsip akun yang sudah punya transaksi", async () => {
    const used = getStore().accounts.find((a) => a.id === "a-bca")!;

    const result = await archiveAccount(form({ id: used.id }));

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/sudah punya transaksi/);
    expect(used.archived).toBe(false);
  });

  it("menolak arsip akun yang hanya dipakai sebagai akun tujuan transfer", async () => {
    // a-mandiri tidak pernah menjadi akun asal, tetapi menerima transfer t-10.
    const target = getStore().accounts.find((a) => a.id === "a-mandiri")!;

    const result = await archiveAccount(form({ id: target.id }));

    expect(result.ok).toBe(false);
    expect(target.archived).toBe(false);
  });

  it("menolak arsip akun milik ruang lain", async () => {
    const foreign = foreignAccount();

    const result = await archiveAccount(form({ id: foreign.id }));

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Akun tidak ditemukan/);
    expect(foreign.archived).toBe(false);
  });

  it("menolak id kosong", async () => {
    const before = counts();

    const result = await archiveAccount(form({ id: "" }));

    expect(result.ok).toBe(false);
    expect(counts()).toEqual(before);
  });
});

/* -------------------------------- kategori -------------------------------- */

describe("createCategory", () => {
  it("menyimpan kategori baru di ruang aktif", async () => {
    const before = getStore().categories.length;

    const result = await createCategory(
      form({ name: "Hobi Keluarga", kind: "expense", color: "plum" }),
    );

    expect(result.ok).toBe(true);
    expect(getStore().categories).toHaveLength(before + 1);
    const created = getStore().categories.find((c) => c.name === "Hobi Keluarga")!;
    expect(created).toMatchObject({
      workspaceId: WS.family,
      recordedByProfileId: "p-irvan",
      kind: "expense",
      archived: false,
    });
  });

  it("menolak nama kosong", async () => {
    const before = counts();

    const result = await createCategory(form({ name: "  ", kind: "expense" }));

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Nama kategori wajib diisi/);
    expect(counts()).toEqual(before);
  });

  it("menolak kategori kembar dalam satu ruang tanpa peduli huruf besar/kecil", async () => {
    const before = counts();

    const result = await createCategory(form({ name: "gaji", kind: "income" }));

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/sudah ada/);
    expect(counts()).toEqual(before);
  });

  it("mengizinkan nama kategori yang sudah diarsipkan dipakai lagi", async () => {
    /*
     * `c-gaji` dipakai aturan berulang pada data contoh, sehingga kini tidak
     * bisa diarsipkan. Pakai kategori yang tidak dirujuk aturan mana pun.
     */
    const free = getStore().categories.find(
      (category) =>
        category.workspaceId === WS.family &&
        !category.archived &&
        !getStore().recurringRules.some((rule) => rule.categoryId === category.id),
    );
    if (!free) throw new Error("Tidak ada kategori bebas untuk diuji");

    expect((await archiveCategory(form({ id: free.id }))).ok).toBe(true);

    const result = await createCategory(form({ name: free.name, kind: free.kind }));

    expect(result.ok).toBe(true);
    const active = getStore().categories.filter(
      (category) => category.name === free.name && !category.archived,
    );
    expect(active).toHaveLength(1);
    expect(active[0].workspaceId).toBe(WS.family);
  });

  it("belum bisa memakai nama yang sama dengan kategori ruang lain (bug)", async () => {
    // "Jajan" hanya ada di ruang-ruang pribadi; di ruang keluarga nama itu
    // belum dipakai. Tetapi pemeriksaan duplikat mencari di SELURUH store,
    // bukan hanya ruang aktif, sehingga input yang sah ikut ditolak.
    const result = await createCategory(form({ name: "Jajan", kind: "expense" }));

    expect(result.ok).toBe(true);
  });
});

describe("archiveCategory", () => {
  it("mengarsipkan kategori, menyembunyikannya dari daftar aktif, tetapi riwayat tetap utuh", async () => {
    const category = getStore().categories.find((c) => c.id === "c-hiburan")!;
    const budgetsBefore = getStore().budgets.filter(
      (b) => b.categoryId === "c-hiburan",
    ).length;
    const transactionsBefore = getStore().transactions.length;

    const result = await archiveCategory(form({ id: "c-hiburan" }));

    expect(result.ok).toBe(true);
    expect(category.archived).toBe(true);
    // Arsip bukan hapus: anggaran & transaksi lama tidak ikut dibuang.
    expect(
      getStore().budgets.filter((b) => b.categoryId === "c-hiburan"),
    ).toHaveLength(budgetsBefore);
    expect(getStore().transactions).toHaveLength(transactionsBefore);
    // Kategori arsip hilang dari daftar pilihan.
    expect(listCategories(WS.family).some((c) => c.id === "c-hiburan")).toBe(false);
  });

  it("menolak kategori milik ruang lain", async () => {
    const foreign = foreignCategory();

    const result = await archiveCategory(form({ id: foreign.id }));

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Kategori tidak ditemukan/);
    expect(foreign.archived).toBe(false);
  });

  it("menolak id yang tidak dikenal", async () => {
    const before = counts();

    const result = await archiveCategory(form({ id: "c-tidak-ada" }));

    expect(result.ok).toBe(false);
    expect(counts()).toEqual(before);
  });

  it("kategori arsip tidak bisa dipakai transaksi baru", async () => {
    await archiveCategory(form({ id: "c-hiburan" }));

    const result = await createTransaction(
      form({
        type: "expense",
        amount: 60_000,
        occurredAt: "2031-02-03",
        description: "Uji kategori arsip",
        accountId: familyAccount().id,
        categoryId: "c-hiburan",
        visibility: "household",
      }),
    );

    // Mengarsipkan kategori berarti menutupnya untuk pemakaian baru. Riwayat
    // lama tetap utuh; yang dicegah hanya pencatatan berikutnya.
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/arsip/i);
  });
});

/* --------------------------------- anggaran ------------------------------- */

describe("setBudget", () => {
  it("menyimpan anggaran baru untuk kategori dan bulan tertentu", async () => {
    const before = getStore().budgets.length;

    const result = await setBudget(
      form({ categoryId: "c-belanja", month: "2031-01", amount: 1_500_000 }),
    );

    expect(result.ok).toBe(true);
    expect(getStore().budgets).toHaveLength(before + 1);
    const budget = getStore().budgets.find(
      (b) => b.categoryId === "c-belanja" && b.month === "2031-01",
    )!;
    expect(budget).toMatchObject({
      workspaceId: WS.family,
      recordedByProfileId: "p-irvan",
      amount: 1_500_000,
    });
  });

  it("memanggil dua kali untuk kategori+bulan yang sama mengubah anggaran, bukan menduplikat", async () => {
    const existing = getStore().budgets.find((b) => b.id === "b-1")!;
    const totalBefore = getStore().budgets.length;

    await setBudget(
      form({ categoryId: "c-belanja", month: existing.month, amount: 3_000_000 }),
    );
    await setBudget(
      form({ categoryId: "c-belanja", month: existing.month, amount: 4_250_000 }),
    );

    const rows = getStore().budgets.filter(
      (b) =>
        b.workspaceId === WS.family &&
        b.categoryId === "c-belanja" &&
        b.month === existing.month,
    );
    expect(rows).toHaveLength(1);
    // Baris lama yang diperbarui, bukan baris baru.
    expect(rows[0].id).toBe("b-1");
    expect(rows[0].amount).toBe(4_250_000);
    expect(getStore().budgets).toHaveLength(totalBefore);
  });

  it("menolak isian tidak valid tanpa mengubah anggaran", async () => {
    const before = counts();

    const noCategory = await setBudget(
      form({ categoryId: "", month: "2031-01", amount: 1_000 }),
    );
    expect(noCategory.ok).toBe(false);
    expect(noCategory.message).toMatch(/Pilih kategori/);

    const badMonth = await setBudget(
      form({ categoryId: "c-belanja", month: "2031-1", amount: 1_000 }),
    );
    expect(badMonth.ok).toBe(false);
    expect(badMonth.message).toMatch(/Bulan tidak valid/);

    const negative = await setBudget(
      form({ categoryId: "c-belanja", month: "2031-01", amount: -1 }),
    );
    expect(negative.ok).toBe(false);
    expect(negative.message).toMatch(/tidak boleh negatif/);

    expect(counts()).toEqual(before);
  });

  it("menolak kategori ruang lain saat menetapkan anggaran", async () => {
    const familyBudget = getStore().budgets.find((b) => b.id === "b-1")!;
    setViewer({ workspaceId: WS.irvan, profileId: "p-irvan", role: "owner" });

    const result = await setBudget(
      form({ categoryId: "c-belanja", month: familyBudget.month, amount: 999_000 }),
    );

    // Kategori keluarga tidak boleh dipakai dari ruang pribadi: anggaran akan
    // merujuk kategori yang tidak terlihat di ruang itu.
    expect(result.ok).toBe(false);
    expect(familyBudget.amount).toBe(2_500_000);
    expect(
      getStore().budgets.some(
        (b) => b.workspaceId === WS.irvan && b.categoryId === "c-belanja",
      ),
    ).toBe(false);
  });

  it("menolak kategori yang tidak dikenal atau milik ruang lain (bug)", async () => {
    // `setBudget` sama sekali tidak memeriksa keberadaan/ruang kategori,
    // padahal aksi lain memakai `invalidReference` untuk ini.
    const foreign = await setBudget(
      form({ categoryId: foreignCategory().id, month: "2031-04", amount: 100_000 }),
    );
    const ghost = await setBudget(
      form({ categoryId: "c-tidak-ada", month: "2031-04", amount: 100_000 }),
    );

    expect({ foreign: foreign.ok, ghost: ghost.ok }).toEqual({
      foreign: false,
      ghost: false,
    });
  });
});

describe("removeBudget", () => {
  it("menghapus anggaran yang dipilih", async () => {
    const before = getStore().budgets.length;

    const result = await removeBudget(form({ id: "b-6" }));

    expect(result.ok).toBe(true);
    expect(getStore().budgets).toHaveLength(before - 1);
    expect(getStore().budgets.some((b) => b.id === "b-6")).toBe(false);
  });

  it("melaporkan gagal saat id anggaran tidak ada", async () => {
    // Sukses palsu membuat UI tidak bisa membedakan "terhapus" dari
    // "tidak ada apa-apa".
    const before = counts();

    const result = await removeBudget(form({ id: "b-tidak-ada" }));

    expect(result.ok).toBe(false);
    expect(counts()).toEqual(before);
  });

  it("menolak menghapus anggaran milik ruang lain (bug)", async () => {
    // Siapkan anggaran di ruang pribadi.
    setViewer({ workspaceId: WS.irvan, profileId: "p-irvan", role: "owner" });
    await setBudget(
      form({ categoryId: "cat-irvan-jajan", month: "2031-05", amount: 75_000 }),
    );
    const foreign = getStore().budgets.find(
      (b) => b.workspaceId === WS.irvan && b.month === "2031-05",
    )!;

    setViewer(OWNER);
    const result = await removeBudget(form({ id: foreign.id }));

    // Seharusnya ditolak dan anggaran tetap ada; saat ini penyaringan hanya
    // memakai id, tanpa memeriksa workspaceId.
    expect(result.ok).toBe(false);
    expect(getStore().budgets.some((b) => b.id === foreign.id)).toBe(true);
  });
});

/* --------------------------------- tagihan -------------------------------- */

describe("createBill", () => {
  it("menyimpan tagihan baru sebagai tagihan aktif", async () => {
    const before = getStore().bills.length;

    const result = await createBill(
      form({
        name: "Iuran Uji",
        amount: 250_000,
        categoryId: "c-listrik",
        accountId: "a-bca",
        frequency: "monthly",
        dueDay: 12,
        nextDueDate: "2031-01-12",
      }),
    );

    expect(result.ok).toBe(true);
    expect(getStore().bills).toHaveLength(before + 1);
    const bill = getStore().bills.find((b) => b.name === "Iuran Uji")!;
    expect(bill).toMatchObject({
      workspaceId: WS.family,
      recordedByProfileId: "p-irvan",
      amount: 250_000,
      status: "active",
      frequency: "monthly",
      reminderDaysBefore: 3,
    });
  });

  it("menolak isian tidak valid tanpa menambah tagihan", async () => {
    const before = counts();

    const noName = await createBill(
      form({
        name: "   ",
        amount: 1_000,
        frequency: "monthly",
        dueDay: 1,
        nextDueDate: "2031-01-01",
      }),
    );
    expect(noName.ok).toBe(false);
    expect(noName.message).toMatch(/Nama tagihan wajib diisi/);

    const zeroAmount = await createBill(
      form({
        name: "Nominal Nol",
        amount: 0,
        frequency: "monthly",
        dueDay: 1,
        nextDueDate: "2031-01-01",
      }),
    );
    expect(zeroAmount.ok).toBe(false);

    const badDate = await createBill(
      form({
        name: "Tanggal Salah",
        amount: 1_000,
        frequency: "monthly",
        dueDay: 1,
        nextDueDate: "01-01-2031",
      }),
    );
    expect(badDate.ok).toBe(false);

    expect(counts()).toEqual(before);
  });

  it("menolak kategori dan akun milik ruang lain", async () => {
    const before = counts();

    const foreignCat = await createBill(
      form({
        name: "Tagihan Kategori Asing",
        amount: 1_000,
        categoryId: foreignCategory().id,
        accountId: "a-bca",
        frequency: "monthly",
        dueDay: 1,
        nextDueDate: "2031-01-01",
      }),
    );
    expect(foreignCat.ok).toBe(false);
    expect(foreignCat.message).toMatch(/Kategori tidak ditemukan di ruang ini/);

    const foreignAcc = await createBill(
      form({
        name: "Tagihan Akun Asing",
        amount: 1_000,
        categoryId: "c-listrik",
        accountId: foreignAccount().id,
        frequency: "monthly",
        dueDay: 1,
        nextDueDate: "2031-01-01",
      }),
    );
    expect(foreignAcc.ok).toBe(false);
    expect(foreignAcc.message).toMatch(/Akun tidak ditemukan di ruang ini/);

    expect(counts()).toEqual(before);
  });

  it("menolak kategori pemasukan untuk tagihan (bug)", async () => {
    // Tagihan selalu menjadi pengeluaran saat dibayar, tetapi jenis kategori
    // belum diperiksa — berbeda dari `createTransaction` yang memeriksanya.
    const result = await createBill(
      form({
        name: "Tagihan Salah Jenis",
        amount: 1_000,
        categoryId: familyCategory("income").id,
        frequency: "monthly",
        dueDay: 1,
        nextDueDate: "2031-01-01",
      }),
    );

    expect(result.ok).toBe(false);
  });
});

describe("payBill", () => {
  it("mencatat pengeluaran, pembayaran periode ini, dan memajukan jatuh tempo", async () => {
    const bill = getStore().bills.find((b) => b.id === "bill-listrik")!;
    const dueBefore = bill.nextDueDate;
    const txBefore = getStore().transactions.length;
    const paymentBefore = getStore().billPayments.length;

    const result = await payBill(
      form({ billId: bill.id, accountId: "a-bca", paidAt: "2026-10-15" }),
    );

    expect(result.ok).toBe(true);
    expect(getStore().transactions).toHaveLength(txBefore + 1);
    const tx = lastTransaction();
    expect(tx).toMatchObject({
      type: "expense",
      amount: 450_000,
      occurredAt: "2026-10-15",
      description: "Bayar Listrik PLN",
      accountId: "a-bca",
      categoryId: "c-listrik",
      workspaceId: WS.family,
      recordedByProfileId: "p-irvan",
      visibility: "household",
    });

    expect(getStore().billPayments).toHaveLength(paymentBefore + 1);
    const payment = lastPayment();
    expect(payment).toMatchObject({
      billId: bill.id,
      dueDate: dueBefore,
      amount: 450_000,
      status: "paid",
      transactionId: tx.id,
      workspaceId: WS.family,
    });

    // Periode berikutnya mengikuti frekuensi bulanan dan hari jatuh tempo.
    expect(bill.nextDueDate).toBe(
      safeDueDate(addMonths(dueBefore.slice(0, 7), 1), bill.dueDay),
    );
  });

  it("menolak tagihan yang periodenya sudah dibayar", async () => {
    const bill = getStore().bills.find((b) => b.id === "bill-air")!;
    const dueBefore = bill.nextDueDate;
    // Tiru periode yang sudah dibayar sebelumnya.
    getStore().billPayments.push({
      id: "bp-uji",
      workspaceId: WS.family,
      billId: bill.id,
      dueDate: dueBefore,
      paidAt: new Date().toISOString(),
      amount: bill.amount,
      status: "paid",
    });
    const txBefore = getStore().transactions.length;

    const result = await payBill(form({ billId: bill.id, accountId: "a-bca" }));

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/sudah dibayar/);
    // Tidak ada transaksi baru dan periode tidak ikut maju.
    expect(getStore().transactions).toHaveLength(txBefore);
    expect(bill.nextDueDate).toBe(dueBefore);
  });

  it("mengizinkan pembayaran periode berikutnya setelah periode ini lunas", async () => {
    const bill = getStore().bills.find((b) => b.id === "bill-listrik")!;

    const first = await payBill(form({ billId: bill.id, accountId: "a-bca" }));
    expect(first.ok).toBe(true);
    const afterFirst = bill.nextDueDate;

    const second = await payBill(form({ billId: bill.id, accountId: "a-bca" }));

    expect(second.ok).toBe(true);
    expect(bill.nextDueDate > afterFirst).toBe(true);
    expect(getStore().billPayments.filter((p) => p.billId === bill.id)).toHaveLength(2);
  });

  it("menolak isian tidak valid tanpa mencatat pembayaran", async () => {
    const before = counts();

    const noAccount = await payBill(form({ billId: "bill-listrik", accountId: "" }));
    expect(noAccount.ok).toBe(false);
    expect(noAccount.message).toMatch(/Pilih akun pembayaran/);

    const unknownBill = await payBill(
      form({ billId: "bill-tidak-ada", accountId: "a-bca" }),
    );
    expect(unknownBill.ok).toBe(false);
    expect(unknownBill.message).toMatch(/Tagihan tidak ditemukan/);

    const foreignAcc = await payBill(
      form({ billId: "bill-listrik", accountId: foreignAccount().id }),
    );
    expect(foreignAcc.ok).toBe(false);
    expect(foreignAcc.message).toMatch(/Akun tidak ditemukan di ruang ini/);

    expect(counts()).toEqual(before);
  });

  it("menolak tanggal bayar yang bukan tanggal (bug)", async () => {
    // `createTransaction` memvalidasi `occurredAt` dengan regex YYYY-MM-DD,
    // tetapi `payBill` menyalin `paidAt` apa adanya ke `occurredAt` transaksi.
    // Akibatnya laporan bulanan (`occurredAt.slice(0, 7)`) bisa menerima
    // potongan teks sembarang.
    const result = await payBill(
      form({ billId: "bill-listrik", accountId: "a-bca", paidAt: "kemarin-sore" }),
    );

    expect(result.ok).toBe(false);
  });

  it("menolak tagihan milik ruang lain", async () => {
    setViewer({ workspaceId: WS.irvan, profileId: "p-irvan", role: "owner" });
    await createBill(
      form({
        name: "Tagihan Pribadi",
        amount: 90_000,
        frequency: "monthly",
        dueDay: 3,
        nextDueDate: "2031-01-03",
      }),
    );
    const foreignBill = getStore().bills.find((b) => b.name === "Tagihan Pribadi")!;

    setViewer(OWNER);
    const result = await payBill(form({ billId: foreignBill.id, accountId: "a-bca" }));

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Tagihan tidak ditemukan/);
    expect(foreignBill.nextDueDate).toBe("2031-01-03");
  });
});

describe("skipBill", () => {
  it("mencatat lewatan periode dan memajukan jatuh tempo tanpa membuat transaksi", async () => {
    const bill = getStore().bills.find((b) => b.id === "bill-air")!;
    const dueBefore = bill.nextDueDate;
    const txBefore = getStore().transactions.length;

    const result = await skipBill(form({ billId: bill.id }));

    expect(result.ok).toBe(true);
    // Melewati tagihan bukan pengeluaran: tidak ada uang berpindah.
    expect(getStore().transactions).toHaveLength(txBefore);
    const payment = lastPayment();
    expect(payment).toMatchObject({
      billId: bill.id,
      dueDate: dueBefore,
      amount: bill.amount,
      status: "skipped",
      workspaceId: WS.family,
    });
    expect(payment.transactionId).toBeUndefined();
    expect(bill.nextDueDate).toBe(
      safeDueDate(addMonths(dueBefore.slice(0, 7), 1), bill.dueDay),
    );
  });

  it("menolak tagihan yang tidak dikenal atau milik ruang lain", async () => {
    const paymentsBefore = getStore().billPayments.length;
    const txBefore = getStore().transactions.length;

    const unknown = await skipBill(form({ billId: "bill-tidak-ada" }));
    expect(unknown.ok).toBe(false);
    expect(unknown.message).toMatch(/Tagihan tidak ditemukan/);

    setViewer({ workspaceId: WS.irvan, profileId: "p-irvan", role: "owner" });
    await createBill(
      form({
        name: "Tagihan Pribadi Skip",
        amount: 10_000,
        frequency: "monthly",
        dueDay: 3,
        nextDueDate: "2031-01-03",
      }),
    );
    const foreignBill = getStore().bills.find(
      (b) => b.name === "Tagihan Pribadi Skip",
    )!;
    setViewer(OWNER);

    const foreign = await skipBill(form({ billId: foreignBill.id }));

    expect(foreign.ok).toBe(false);
    expect(foreign.message).toMatch(/Tagihan tidak ditemukan/);
    expect(getStore().billPayments).toHaveLength(paymentsBefore);
    expect(getStore().transactions).toHaveLength(txBefore);
  });
});

/* ------------------------------- pembatalan ------------------------------- */

describe("voidTransaction", () => {
  it("menandai transaksi batal tanpa menghapusnya agar jejak audit tetap ada", async () => {
    const before = getStore().transactions.length;

    const result = await voidTransaction(form({ id: "t-3" }));

    expect(result.ok).toBe(true);
    // Tidak dihapus: baris tetap ada, hanya diberi penanda.
    expect(getStore().transactions).toHaveLength(before);
    const stored = getStore().transactions.find((t) => t.id === "t-3")!;
    expect(stored.voidedAt).toBeTruthy();
    // Data asli tidak diubah, sehingga masih bisa ditelusuri.
    expect(stored).toMatchObject({
      amount: 1_850_000,
      description: "Belanja bulanan",
      workspaceId: WS.family,
    });
    // Laporan tidak lagi menghitungnya.
    const visible = listTransactions({ q: "Belanja bulanan" }, VIEWER);
    expect(visible.some((t) => t.id === "t-3")).toBe(false);
  });

  it("menolak id yang tidak dikenal tanpa mengubah data", async () => {
    const before = counts();

    const result = await voidTransaction(form({ id: "t-tidak-ada" }));

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Transaksi tidak ditemukan/);
    expect(counts()).toEqual(before);
  });

  it("menolak transaksi milik ruang lain", async () => {
    const foreign = getStore().transactions.find(
      (t) => t.workspaceId === WS.irvan,
    )!;

    const result = await voidTransaction(form({ id: foreign.id }));

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Transaksi tidak ditemukan/);
    expect(foreign.voidedAt).toBeUndefined();
  });
});

/* ------------------------------- sesi habis ------------------------------- */

describe("sesi berakhir", () => {
  it("semua aksi keuangan menolak dan tidak mengubah data", async () => {
    clearViewer();
    const before = counts();

    const cases: Array<[string, () => Promise<ActionResult>]> = [
      [
        "createAccount",
        () => createAccount(form({ name: "X", type: "bank", openingBalance: 1_000 })),
      ],
      ["archiveAccount", () => archiveAccount(form({ id: "a-bca" }))],
      ["createCategory", () => createCategory(form({ name: "X", kind: "expense" }))],
      ["archiveCategory", () => archiveCategory(form({ id: "c-hiburan" }))],
      [
        "setBudget",
        () => setBudget(form({ categoryId: "c-belanja", month: "2031-01", amount: 1_000 })),
      ],
      ["removeBudget", () => removeBudget(form({ id: "b-1" }))],
      [
        "createBill",
        () =>
          createBill(
            form({
              name: "X",
              amount: 1_000,
              frequency: "monthly",
              dueDay: 1,
              nextDueDate: "2031-01-01",
            }),
          ),
      ],
      ["payBill", () => payBill(form({ billId: "bill-listrik", accountId: "a-bca" }))],
      ["skipBill", () => skipBill(form({ billId: "bill-listrik" }))],
      ["voidTransaction", () => voidTransaction(form({ id: "t-3" }))],
    ];

    for (const [label, run] of cases) {
      const result = await run();
      expect(result.ok, label).toBe(false);
      expect(result.message, label).toMatch(/Sesi berakhir/);
    }

    // Tidak satu pun aksi yang sempat menulis sebelum memeriksa sesi.
    expect(counts()).toEqual(before);
  });
});

/* ----------------------------- sunting transaksi --------------------------- */

describe("updateTransaction", () => {
  /** Transaksi aktif milik ruang keluarga. */
  function activeTransaction() {
    const store = getStore();
    const transaction = store.transactions.find(
      (item) => item.workspaceId === WS.family && !item.voidedAt,
    );
    if (!transaction) throw new Error("Data contoh tidak punya transaksi aktif");
    return transaction;
  }

  function fieldsFrom(transaction: ReturnType<typeof activeTransaction>) {
    return {
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      occurredAt: transaction.occurredAt,
      description: transaction.description,
      accountId: transaction.accountId,
      toAccountId: transaction.toAccountId ?? "",
      categoryId: transaction.categoryId ?? "",
      memberId: transaction.memberId ?? "",
      visibility: transaction.visibility,
    };
  }

  it("mengubah nominal dan deskripsi", async () => {
    const transaction = activeTransaction();

    const result = await updateTransaction(
      form({
        ...fieldsFrom(transaction),
        amount: 123_456,
        description: "Deskripsi setelah disunting",
      }),
    );

    expect(result.ok).toBe(true);
    expect(transaction.amount).toBe(123_456);
    expect(transaction.description).toBe("Deskripsi setelah disunting");
  });

  it("mempertahankan pencatat asli meski disunting orang lain", async () => {
    const transaction = activeTransaction();
    const originalRecorder = transaction.recordedByProfileId;

    await updateTransaction(
      form({ ...fieldsFrom(transaction), amount: 99_000 }),
    );

    /*
     * Jejak audit: yang menyunting tidak boleh mengaku sebagai pencatat.
     * Tanpa ini, riwayat "dicatat oleh" berubah dan tidak bisa dipercaya.
     */
    expect(transaction.recordedByProfileId).toBe(originalRecorder);
  });

  it("menolak transaksi yang sudah dibatalkan", async () => {
    const transaction = activeTransaction();
    transaction.voidedAt = new Date().toISOString();

    const result = await updateTransaction(
      form({ ...fieldsFrom(transaction), amount: 50_000 }),
    );

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/dibatalkan/i);
  });

  it("menolak transaksi milik ruang lain", async () => {
    const store = getStore();
    const other = store.transactions.find(
      (item) => item.workspaceId !== WS.family && !item.voidedAt,
    );
    if (!other) return;

    const before = other.amount;
    const result = await updateTransaction(
      form({
        id: other.id,
        type: other.type,
        amount: 1,
        occurredAt: other.occurredAt,
        description: "Percobaan lintas ruang",
        accountId: other.accountId,
        visibility: other.visibility,
      }),
    );

    expect(result.ok).toBe(false);
    expect(other.amount).toBe(before);
  });

  it("menolak nominal nol atau negatif", async () => {
    const transaction = activeTransaction();
    const before = transaction.amount;

    for (const amount of [0, -5000]) {
      const result = await updateTransaction(
        form({ ...fieldsFrom(transaction), amount }),
      );
      expect(result.ok).toBe(false);
    }

    expect(transaction.amount).toBe(before);
  });

  it("menolak kategori yang tidak sejenis dengan transaksi", async () => {
    const store = getStore();
    const transaction = store.transactions.find(
      (item) =>
        item.workspaceId === WS.family && !item.voidedAt && item.type === "expense",
    );
    if (!transaction) return;

    const incomeCategory = store.categories.find(
      (item) => item.workspaceId === WS.family && item.kind === "income",
    );
    if (!incomeCategory) return;

    const result = await updateTransaction(
      form({ ...fieldsFrom(transaction), categoryId: incomeCategory.id }),
    );

    expect(result.ok).toBe(false);
  });

  it("menolak deskripsi kosong", async () => {
    const transaction = activeTransaction();

    const result = await updateTransaction(
      form({ ...fieldsFrom(transaction), description: "   " }),
    );

    expect(result.ok).toBe(false);
  });

  it("menolak id yang tidak ada", async () => {
    const transaction = activeTransaction();

    const result = await updateTransaction(
      form({ ...fieldsFrom(transaction), id: "t-tidak-ada" }),
    );

    expect(result.ok).toBe(false);
  });
});

/* --------------------------- kembalikan transaksi -------------------------- */

describe("restoreTransaction", () => {
  function voidedTransaction() {
    const store = getStore();
    const transaction = store.transactions.find(
      (item) => item.workspaceId === WS.family && item.voidedAt,
    );
    if (transaction) return transaction;

    // Bila data contoh tidak punya yang dibatalkan, batalkan satu.
    const target = store.transactions.find(
      (item) => item.workspaceId === WS.family && !item.voidedAt,
    );
    if (!target) throw new Error("Tidak ada transaksi di ws-family");
    target.voidedAt = new Date().toISOString();
    return target;
  }

  it("mengembalikan transaksi yang dibatalkan", async () => {
    const transaction = voidedTransaction();

    const result = await restoreTransaction(form({ id: transaction.id }));

    expect(result.ok).toBe(true);
    expect(transaction.voidedAt).toBeUndefined();
  });

  it("menolak transaksi yang tidak sedang dibatalkan", async () => {
    const store = getStore();
    const transaction = store.transactions.find(
      (item) => item.workspaceId === WS.family && !item.voidedAt,
    );
    if (!transaction) return;

    const result = await restoreTransaction(form({ id: transaction.id }));

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/tidak sedang dibatalkan/i);
  });

  it("menolak transaksi milik ruang lain", async () => {
    const store = getStore();
    const other = store.transactions.find((item) => item.workspaceId !== WS.family);
    if (!other) return;

    other.voidedAt = new Date().toISOString();
    const result = await restoreTransaction(form({ id: other.id }));

    expect(result.ok).toBe(false);
    expect(other.voidedAt).toBeTruthy();
  });

  it("menolak id yang tidak ada", async () => {
    const result = await restoreTransaction(form({ id: "t-tidak-ada" }));
    expect(result.ok).toBe(false);
  });

  it("mempertahankan pencatat asli setelah dikembalikan", async () => {
    const transaction = voidedTransaction();
    const recorder = transaction.recordedByProfileId;

    await restoreTransaction(form({ id: transaction.id }));

    expect(transaction.recordedByProfileId).toBe(recorder);
  });
});
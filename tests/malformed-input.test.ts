import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Server action dengan masukan yang rusak.
 *
 * FormData datang dari browser, dan browser bukan satu-satunya klien. Siapa pun
 * bisa mengirim permintaan ke server action dengan isian apa saja — termasuk
 * yang tidak mungkin dihasilkan formulir aplikasi.
 *
 * Yang diuji di sini: apakah aksi **menolak dengan rapi**, bukan melempar
 * exception yang membocorkan jejak tumpukan, dan bukan menyimpan data rusak.
 */

vi.mock("@/lib/session", async () => {
  const { sessionMock } = await import("./helpers/session");
  return sessionMock();
});

const { getStore, resetStore } = await import("@/lib/data/store");
const { setViewer } = await import("./helpers/session");
const {
  createTransaction,
  createAccount,
  createBill,
  setBudget,
  createChore,
  updateMember,
  submitContact,
} = await import("@/lib/data/actions");

/** Membuat FormData dari nilai apa pun, termasuk yang bukan string. */
function rawForm(entries: Array<[string, unknown]>): FormData {
  const data = new FormData();
  for (const [key, value] of entries) {
    data.set(key, value as string);
  }
  return data;
}

function familyAccount() {
  const account = getStore().accounts.find(
    (item) => item.workspaceId === "ws-family",
  );
  if (!account) throw new Error("Data contoh tidak punya akun di ws-family");
  return account;
}

function familyCategory() {
  const category = getStore().categories.find(
    (item) => item.workspaceId === "ws-family" && item.kind === "expense",
  );
  if (!category) throw new Error("Data contoh tidak punya kategori pengeluaran");
  return category;
}

beforeEach(() => {
  resetStore();
  setViewer({ workspaceId: "ws-family", role: "owner" });
});

describe("createTransaction — masukan rusak", () => {
  it("menolak FormData kosong tanpa melempar", async () => {
    const before = getStore().transactions.length;

    const result = await createTransaction(new FormData());

    expect(result.ok).toBe(false);
    expect(getStore().transactions).toHaveLength(before);
  });

  it("menolak nominal bukan angka", async () => {
    const before = getStore().transactions.length;

    for (const amount of ["abc", "", "  ", "NaN", "Infinity", "1e999"]) {
      const result = await createTransaction(
        rawForm([
          ["type", "expense"],
          ["amount", amount],
          ["occurredAt", "2026-10-01"],
          ["description", "Uji"],
          ["accountId", familyAccount().id],
          ["categoryId", familyCategory().id],
          ["visibility", "household"],
        ]),
      );

      expect(result.ok).toBe(false);
    }

    expect(getStore().transactions).toHaveLength(before);
  });

  it("menolak nominal negatif dan nol", async () => {
    for (const amount of ["0", "-5000", "-0.01"]) {
      const result = await createTransaction(
        rawForm([
          ["type", "expense"],
          ["amount", amount],
          ["occurredAt", "2026-10-01"],
          ["description", "Uji"],
          ["accountId", familyAccount().id],
          ["categoryId", familyCategory().id],
          ["visibility", "household"],
        ]),
      );

      expect(result.ok).toBe(false);
    }
  });

  it("menolak nominal pecahan", async () => {
    // Rupiah tidak memakai sen; 1000.5 berarti bug di klien.
    const result = await createTransaction(
      rawForm([
        ["type", "expense"],
        ["amount", "1000.5"],
        ["occurredAt", "2026-10-01"],
        ["description", "Uji"],
        ["accountId", familyAccount().id],
        ["categoryId", familyCategory().id],
        ["visibility", "household"],
      ]),
    );

    expect(result.ok).toBe(false);
  });

  it("menolak tanggal yang bentuknya salah", async () => {
    for (const occurredAt of ["2026-13-01", "2026-02-30", "01-10-2026", "kemarin", ""]) {
      const result = await createTransaction(
        rawForm([
          ["type", "expense"],
          ["amount", "10000"],
          ["occurredAt", occurredAt],
          ["description", "Uji"],
          ["accountId", familyAccount().id],
          ["categoryId", familyCategory().id],
          ["visibility", "household"],
        ]),
      );

      expect(result.ok).toBe(false);
    }
  });

  it("menolak jenis transaksi yang tidak dikenal", async () => {
    for (const type of ["", "belanja", "EXPENSE", "transfer-in"]) {
      const result = await createTransaction(
        rawForm([
          ["type", type],
          ["amount", "10000"],
          ["occurredAt", "2026-10-01"],
          ["description", "Uji"],
          ["accountId", familyAccount().id],
          ["categoryId", familyCategory().id],
          ["visibility", "household"],
        ]),
      );

      expect(result.ok).toBe(false);
    }
  });

  it("menolak deskripsi kosong atau hanya spasi", async () => {
    for (const description of ["", "   ", "\t\n"]) {
      const result = await createTransaction(
        rawForm([
          ["type", "expense"],
          ["amount", "10000"],
          ["occurredAt", "2026-10-01"],
          ["description", description],
          ["accountId", familyAccount().id],
          ["categoryId", familyCategory().id],
          ["visibility", "household"],
        ]),
      );

      expect(result.ok).toBe(false);
    }
  });

  it("menolak deskripsi yang sangat panjang", async () => {
    const result = await createTransaction(
      rawForm([
        ["type", "expense"],
        ["amount", "10000"],
        ["occurredAt", "2026-10-01"],
        ["description", "x".repeat(5000)],
        ["accountId", familyAccount().id],
        ["categoryId", familyCategory().id],
        ["visibility", "household"],
      ]),
    );

    expect(result.ok).toBe(false);
  });

  it("menolak visibilitas yang tidak dikenal", async () => {
    for (const visibility of ["", "public", "semua", "PRIVATE"]) {
      const result = await createTransaction(
        rawForm([
          ["type", "expense"],
          ["amount", "10000"],
          ["occurredAt", "2026-10-01"],
          ["description", "Uji"],
          ["accountId", familyAccount().id],
          ["categoryId", familyCategory().id],
          ["visibility", visibility],
        ]),
      );

      expect(result.ok).toBe(false);
    }
  });
});

describe("createAccount — masukan rusak", () => {
  it("menolak nama kosong", async () => {
    const before = getStore().accounts.length;
    const result = await createAccount(rawForm([["name", "  "], ["type", "bank"]]));
    expect(result.ok).toBe(false);
    expect(getStore().accounts).toHaveLength(before);
  });

  it("menolak jenis akun yang tidak dikenal", async () => {
    const result = await createAccount(
      rawForm([["name", "Akun Uji"], ["type", "kripto"]]),
    );
    expect(result.ok).toBe(false);
  });
});

describe("createBill — masukan rusak", () => {
  it("menolak tanggal jatuh tempo di luar 1–31", async () => {
    for (const dueDay of ["0", "-1", "32", "99", "abc"]) {
      const result = await createBill(
        rawForm([
          ["name", "Tagihan Uji"],
          ["amount", "100000"],
          ["dueDay", dueDay],
          ["frequency", "monthly"],
          ["nextDueDate", "2026-11-01"],
        ]),
      );

      expect(result.ok).toBe(false);
    }
  });
});

describe("setBudget — masukan rusak", () => {
  it("menolak nominal bukan angka", async () => {
    const result = await setBudget(
      rawForm([
        ["categoryId", familyCategory().id],
        ["month", "2026-10"],
        ["amount", "banyak"],
      ]),
    );

    expect(result.ok).toBe(false);
  });

  it("menolak bulan yang bentuknya salah", async () => {
    for (const month of ["2026-13", "oktober", "", "2026"]) {
      const result = await setBudget(
        rawForm([
          ["categoryId", familyCategory().id],
          ["month", month],
          ["amount", "100000"],
        ]),
      );

      expect(result.ok).toBe(false);
    }
  });
});

describe("updateMember — masukan rusak", () => {
  it("menolak nama kosong", async () => {
    const member = getStore().members[0];
    const result = await updateMember(rawForm([["id", member.id], ["name", "  "]]));
    expect(result.ok).toBe(false);
  });

  it("menolak peran yang tidak dikenal", async () => {
    const member = getStore().members[0];
    const result = await updateMember(
      rawForm([["id", member.id], ["name", "Nama"], ["role", "raja"]]),
    );
    // Peran tidak dikenal diabaikan, bukan disimpan — aksi tetap berhasil.
    expect(member.role).not.toBe("raja");
    expect(result.ok).toBe(true);
  });
});

describe("submitContact — masukan rusak", () => {
  it("menolak email tidak valid", async () => {
    const before = getStore().messages.length;

    for (const email of ["bukan-email", "", "a@", "@b.c", "a b@c.d"]) {
      const result = await submitContact(
        rawForm([
          ["name", "Pengirim"],
          ["email", email],
          ["need", "Aplikasi keluarga"],
          ["message", "Pesan yang cukup panjang untuk lolos validasi."],
        ]),
      );

      expect(result.ok).toBe(false);
    }

    expect(getStore().messages).toHaveLength(before);
  });

  it("menolak pesan yang terlalu pendek", async () => {
    const result = await submitContact(
      rawForm([
        ["name", "Pengirim"],
        ["email", "uji@contoh.id"],
        ["need", "Aplikasi keluarga"],
        ["message", "hai"],
      ]),
    );

    expect(result.ok).toBe(false);
  });
});

describe("createChore — masukan rusak", () => {
  it("menolak poin bukan angka", async () => {
    /*
     * Sebelum diperbaiki, `Number("abc")` menghasilkan NaN yang lolos
     * pemeriksaan dan tersimpan — membuat total papan poin menjadi NaN.
     */
    const before = getStore().chores.length;

    /*
     * String kosong tidak termasuk: `Number("")` = 0, dan poin kosong memang
     * berarti "tanpa poin" — bukan masukan rusak.
     */
    for (const points of ["abc", "NaN", "1e999", "12abc"]) {
      const result = await createChore(
        rawForm([["title", "Cuci piring"], ["points", points]]),
      );

      expect(result.ok).toBe(false);
    }

    expect(getStore().chores).toHaveLength(before);
  });

  it("menolak poin negatif", async () => {
    const result = await createChore(
      rawForm([["title", "Cuci piring"], ["points", "-10"]]),
    );

    expect(result.ok).toBe(false);
  });

  it("menolak frekuensi yang tidak dikenal", async () => {
    for (const frequency of ["kadang", "SETIAP HARI", "", "yearly"]) {
      const result = await createChore(
        rawForm([["title", "Cuci piring"], ["points", "10"], ["frequency", frequency]]),
      );

      expect(result.ok).toBe(false);
    }
  });

  it("menolak tanggal yang tidak ada di kalender", async () => {
    const result = await createChore(
      rawForm([
        ["title", "Cuci piring"],
        ["points", "10"],
        ["frequency", "once"],
        ["dueDate", "2026-02-30"],
      ]),
    );

    expect(result.ok).toBe(false);
  });

  it("menerima tugas yang sah", async () => {
    const result = await createChore(
      rawForm([
        ["title", "Menyapu"],
        ["points", "15"],
        ["frequency", "weekly"],
        ["dueDate", "2026-11-01"],
      ]),
    );

    expect(result.ok).toBe(true);
    expect(getStore().chores.at(-1)?.points).toBe(15);
  });
});
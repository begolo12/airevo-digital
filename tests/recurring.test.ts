import { beforeEach, describe, expect, it, vi } from "vitest";
import { advance, dueOccurrences, nextAfter, MAX_CATCH_UP } from "@/lib/data/recurring";
import type { RecurringRule } from "@/lib/data/types";

/**
 * Transaksi berulang.
 *
 * Yang dijaga: jadwal maju dengan benar di bulan pendek dan tahun kabisat, dan
 * pembuatan bersifat **idempoten** — memanggilnya dua kali tidak menghasilkan
 * duplikat.
 */

/** Aturan contoh dengan nilai default yang bisa ditimpa. */
function rule(overrides: Partial<RecurringRule> = {}): RecurringRule {
  return {
    id: "rr-1",
    workspaceId: "ws-family",
    type: "expense",
    amount: 150_000,
    description: "Langganan internet",
    accountId: "a-bca",
    categoryId: "c-listrik",
    visibility: "household",
    frequency: "monthly",
    startAt: "2026-01-15",
    nextAt: "2026-01-15",
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("advance", () => {
  it("mingguan menambah 7 hari", () => {
    expect(advance("2026-01-01", "weekly")).toBe("2026-01-08");
    expect(advance("2026-01-28", "weekly")).toBe("2026-02-04");
  });

  it("bulanan mempertahankan tanggal", () => {
    expect(advance("2026-01-15", "monthly")).toBe("2026-02-15");
    expect(advance("2026-06-10", "monthly")).toBe("2026-07-10");
  });

  it("bulanan menjepit tanggal 31 ke akhir bulan pendek", () => {
    /*
     * Ini kasus yang paling mudah salah. Tanpa penjepitan, 31 Januari + 1
     * bulan menjadi 3 Maret — melewati Februari sepenuhnya.
     */
    expect(advance("2026-01-31", "monthly")).toBe("2026-02-28");
    expect(advance("2024-01-31", "monthly")).toBe("2024-02-29"); // kabisat
    expect(advance("2026-03-31", "monthly")).toBe("2026-04-30");
  });

  it("bulanan menyeberang tahun", () => {
    expect(advance("2026-12-15", "monthly")).toBe("2027-01-15");
  });

  it("tahunan menambah 12 bulan", () => {
    expect(advance("2026-03-10", "yearly")).toBe("2027-03-10");
  });

  it("tahunan menjepit 29 Februari ke tahun bukan kabisat", () => {
    expect(advance("2024-02-29", "yearly")).toBe("2025-02-28");
  });
});

describe("dueOccurrences", () => {
  it("mengembalikan kejadian yang sudah jatuh tempo", () => {
    const result = dueOccurrences([rule({ nextAt: "2026-01-10" })], "2026-01-15");
    expect(result).toHaveLength(1);
    expect(result[0].occurredAt).toBe("2026-01-10");
  });

  it("tidak mengembalikan kejadian yang belum jatuh tempo", () => {
    const result = dueOccurrences([rule({ nextAt: "2026-02-01" })], "2026-01-15");
    expect(result).toHaveLength(0);
  });

  it("mengejar beberapa periode tertinggal", () => {
    // nextAt Januari, hari ini April → 4 kejadian (Jan, Feb, Mar, Apr).
    const result = dueOccurrences([rule({ nextAt: "2026-01-15" })], "2026-04-20");
    expect(result.map((item) => item.occurredAt)).toEqual([
      "2026-01-15",
      "2026-02-15",
      "2026-03-15",
      "2026-04-15",
    ]);
  });

  it("membatasi pengejaran agar tidak membanjiri", () => {
    // Aturan dari 2020 dengan hari ini 2026 → lebih dari MAX_CATCH_UP.
    const result = dueOccurrences(
      [rule({ nextAt: "2020-01-15" })],
      "2026-12-31",
    );
    expect(result).toHaveLength(MAX_CATCH_UP);
  });

  it("menghormati tanggal berakhir", () => {
    const result = dueOccurrences(
      [rule({ nextAt: "2026-01-15", endAt: "2026-03-01" })],
      "2026-06-30",
    );
    // Jan, Feb — Maret sudah lewat endAt.
    expect(result.map((item) => item.occurredAt)).toEqual(["2026-01-15", "2026-02-15"]);
  });

  it("mengabaikan aturan yang dimatikan", () => {
    const result = dueOccurrences(
      [rule({ nextAt: "2026-01-15", active: false })],
      "2026-06-30",
    );
    expect(result).toHaveLength(0);
  });

  it("mengabaikan aturan yang nextAt-nya sudah lewat endAt", () => {
    const result = dueOccurrences(
      [rule({ nextAt: "2026-05-15", endAt: "2026-03-01" })],
      "2026-06-30",
    );
    expect(result).toHaveLength(0);
  });

  it("menangani beberapa aturan sekaligus", () => {
    const result = dueOccurrences(
      [
        rule({ id: "rr-a", nextAt: "2026-01-10" }),
        rule({ id: "rr-b", nextAt: "2026-01-20", frequency: "weekly" }),
        rule({ id: "rr-c", nextAt: "2026-03-01" }),
      ],
      "2026-01-25",
    );

    const ids = result.map((item) => item.rule.id);
    expect(ids).toContain("rr-a");
    expect(ids).toContain("rr-b");
    expect(ids).not.toContain("rr-c");
  });

  it("idempoten: memajukan nextAt mencegah duplikat", () => {
    /*
     * Inilah inti keamanan fitur ini. Setelah kejadian dibuat, `nextAt`
     * dimajukan. Panggilan kedua pada hari yang sama tidak menghasilkan
     * transaksi lagi.
     */
    const subject = rule({ nextAt: "2026-01-15" });

    const first = dueOccurrences([subject], "2026-01-15");
    expect(first).toHaveLength(1);

    // Majukan seperti yang dilakukan `runDueRecurring`.
    subject.nextAt = nextAfter(subject, first.length);

    const second = dueOccurrences([subject], "2026-01-15");
    expect(second).toHaveLength(0);
  });
});

describe("nextAfter", () => {
  it("memajukan satu periode per kejadian", () => {
    const subject = rule({ nextAt: "2026-01-15" });

    expect(nextAfter(subject, 0)).toBe("2026-01-15");
    expect(nextAfter(subject, 1)).toBe("2026-02-15");
    expect(nextAfter(subject, 3)).toBe("2026-04-15");
  });

  it("mempertahankan tanggal saat menjepit bulan pendek", () => {
    // 31 Jan → 28 Feb → 28 Mar (bukan kembali ke 31).
    const subject = rule({ nextAt: "2026-01-31" });
    expect(nextAfter(subject, 2)).toBe("2026-03-28");
  });
});

/* ------------------------- alur lengkap lewat aksi ------------------------- */

const state = { loggedIn: true };

vi.mock("@/lib/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/session")>("@/lib/session");

  const viewer = () =>
    state.loggedIn
      ? {
          userId: "u-irvan",
          profileId: "p-irvan",
          workspaceId: "ws-family",
          role: "owner" as const,
        }
      : null;

  return {
    ...actual,
    getViewer: async () => viewer(),
    requireViewer: async () => {
      const current = viewer();
      if (!current) throw new Error("NEXT_REDIRECT:/pilih-profil");
      return current;
    },
    getSession: async () => null,
    getAccountSession: async () => viewer(),
    requireActiveSession: async () => {
      if (!viewer()) throw new Error("NEXT_REDIRECT:/login");
      return {
        userId: "u-irvan",
        email: "irvan@airevo-digital.my.id",
        name: "Irvan",
        role: "owner" as const,
        stage: "active" as const,
        profileId: "p-irvan",
        workspaceId: "ws-family",
      };
    },
    requireSession: async () => viewer(),
    requireAccountSession: async () => viewer(),
    createSession: async () => {},
    destroySession: async () => {},
  };
});

vi.mock("next/cache", async () => {
  const actual = await vi.importActual<typeof import("next/cache")>("next/cache");
  return { ...actual, revalidatePath: () => {} };
});

const { getStore, resetStore } = await import("@/lib/data/store");
const {
  createRecurringRule,
  toggleRecurringRule,
  deleteRecurringRule,
  runDueRecurring,
} = await import("@/lib/data/actions");

function form(fields: Record<string, string | number>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, String(value));
  return data;
}

function familyAccount() {
  const account = getStore().accounts.find((item) => item.workspaceId === "ws-family");
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
  state.loggedIn = true;
});

describe("createRecurringRule", () => {
  it("membuat aturan dengan nextAt sama dengan startAt", async () => {
    const before = getStore().recurringRules.length;

    const result = await createRecurringRule(
      form({
        type: "expense",
        amount: 200_000,
        description: "Langganan streaming",
        accountId: familyAccount().id,
        categoryId: familyCategory().id,
        visibility: "household",
        frequency: "monthly",
        startAt: "2026-11-05",
      }),
    );

    expect(result.ok).toBe(true);
    expect(getStore().recurringRules).toHaveLength(before + 1);

    const created = getStore().recurringRules.at(-1);
    expect(created?.nextAt).toBe("2026-11-05");
    expect(created?.active).toBe(true);
  });

  it("tidak langsung membuat transaksi", async () => {
    /*
     * Aturan menyimpan cetakan, bukan transaksi. Membuat transaksi di muka
     * akan mengubah saldo untuk uang yang belum keluar.
     */
    const before = getStore().transactions.length;

    await createRecurringRule(
      form({
        type: "expense",
        amount: 100_000,
        description: "Uji",
        accountId: familyAccount().id,
        categoryId: familyCategory().id,
        visibility: "household",
        frequency: "monthly",
        startAt: "2026-12-01",
      }),
    );

    expect(getStore().transactions).toHaveLength(before);
  });

  it("menolak nominal nol atau negatif", async () => {
    for (const amount of [0, -1000]) {
      const result = await createRecurringRule(
        form({
          type: "expense",
          amount,
          description: "Uji",
          accountId: familyAccount().id,
          categoryId: familyCategory().id,
          visibility: "household",
          frequency: "monthly",
          startAt: "2026-12-01",
        }),
      );
      expect(result.ok).toBe(false);
    }
  });

  it("menolak tanggal mulai yang tidak ada di kalender", async () => {
    const result = await createRecurringRule(
      form({
        type: "expense",
        amount: 100_000,
        description: "Uji",
        accountId: familyAccount().id,
        categoryId: familyCategory().id,
        visibility: "household",
        frequency: "monthly",
        startAt: "2026-02-30",
      }),
    );

    expect(result.ok).toBe(false);
  });

  it("menolak tanggal berakhir sebelum tanggal mulai", async () => {
    const result = await createRecurringRule(
      form({
        type: "expense",
        amount: 100_000,
        description: "Uji",
        accountId: familyAccount().id,
        categoryId: familyCategory().id,
        visibility: "household",
        frequency: "monthly",
        startAt: "2026-12-01",
        endAt: "2026-11-01",
      }),
    );

    expect(result.ok).toBe(false);
  });

  it("menolak kategori yang tidak ada", async () => {
    const result = await createRecurringRule(
      form({
        type: "expense",
        amount: 100_000,
        description: "Uji",
        accountId: familyAccount().id,
        categoryId: "c-tidak-ada",
        visibility: "household",
        frequency: "monthly",
        startAt: "2026-12-01",
      }),
    );

    expect(result.ok).toBe(false);
  });

  it("menolak frekuensi yang tidak dikenal", async () => {
    const result = await createRecurringRule(
      form({
        type: "expense",
        amount: 100_000,
        description: "Uji",
        accountId: familyAccount().id,
        categoryId: familyCategory().id,
        visibility: "household",
        frequency: "harian",
        startAt: "2026-12-01",
      }),
    );

    expect(result.ok).toBe(false);
  });
});

describe("runDueRecurring", () => {
  /** Aturan yang sudah jatuh tempo (kemarin). */
  async function overdueRule() {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

    await createRecurringRule(
      form({
        type: "expense",
        amount: 175_000,
        description: "Langganan listrik",
        accountId: familyAccount().id,
        categoryId: familyCategory().id,
        visibility: "household",
        frequency: "monthly",
        startAt: yesterday,
      }),
    );

    return getStore().recurringRules.at(-1)!;
  }

  it("membuat transaksi untuk aturan yang jatuh tempo", async () => {
    await overdueRule();
    const before = getStore().transactions.length;

    const result = await runDueRecurring();

    expect(result.ok).toBe(true);
    expect(getStore().transactions.length).toBeGreaterThan(before);

    const created = getStore().transactions.at(-1);
    expect(created?.recurringRuleId).toBeTruthy();
    expect(created?.amount).toBe(175_000);
  });

  it("idempoten: dipanggil dua kali tidak menduplikasi", async () => {
    await overdueRule();

    await runDueRecurring();
    const afterFirst = getStore().transactions.length;

    await runDueRecurring();
    const afterSecond = getStore().transactions.length;

    /*
     * Inilah inti keamanan fitur ini. Tanpa `nextAt` yang dimajukan,
     * dashboard yang dibuka berulang kali akan membuat transaksi berulang.
     */
    expect(afterSecond).toBe(afterFirst);
  });

  it("memajukan nextAt setelah membuat transaksi", async () => {
    const rule = await overdueRule();
    const before = rule.nextAt;

    await runDueRecurring();

    const updated = getStore().recurringRules.find((item) => item.id === rule.id);
    expect(updated?.nextAt).not.toBe(before);
    expect(updated && updated.nextAt > before).toBe(true);
  });

  it("tidak membuat transaksi untuk aturan yang dimatikan", async () => {
    const rule = await overdueRule();

    await toggleRecurringRule(form({ id: rule.id }));
    const before = getStore().transactions.length;

    const result = await runDueRecurring();

    expect(result.ok).toBe(true);
    expect(getStore().transactions).toHaveLength(before);
  });

  it("tidak membuat transaksi untuk aturan masa depan", async () => {
    await createRecurringRule(
      form({
        type: "expense",
        amount: 100_000,
        description: "Masa depan",
        accountId: familyAccount().id,
        categoryId: familyCategory().id,
        visibility: "household",
        frequency: "monthly",
        startAt: "2030-01-01",
      }),
    );

    const before = getStore().transactions.length;
    await runDueRecurring();

    expect(getStore().transactions).toHaveLength(before);
  });
});

describe("toggleRecurringRule dan deleteRecurringRule", () => {
  it("mematikan lalu mengaktifkan kembali", async () => {
    const rule = getStore().recurringRules[0];

    const off = await toggleRecurringRule(form({ id: rule.id }));
    expect(off.ok).toBe(true);
    expect(getStore().recurringRules[0].active).toBe(false);

    const on = await toggleRecurringRule(form({ id: rule.id }));
    expect(on.ok).toBe(true);
    expect(getStore().recurringRules[0].active).toBe(true);
  });

  it("menghapus aturan tanpa menghapus transaksi yang sudah dibuat", async () => {
    const rule = getStore().recurringRules[0];
    const transactionsBefore = getStore().transactions.length;

    const result = await deleteRecurringRule(form({ id: rule.id }));

    expect(result.ok).toBe(true);
    expect(getStore().recurringRules.some((item) => item.id === rule.id)).toBe(false);
    // Transaksi lama tetap ada — riwayat tidak boleh hilang.
    expect(getStore().transactions).toHaveLength(transactionsBefore);
  });

  it("menolak menghapus aturan yang tidak ada", async () => {
    const result = await deleteRecurringRule(form({ id: "rr-tidak-ada" }));
    expect(result.ok).toBe(false);
  });
});

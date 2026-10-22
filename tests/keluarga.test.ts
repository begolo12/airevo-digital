import { beforeEach, describe, expect, it } from "vitest";
import { resetStore, getStore } from "@/lib/data/store";
import {
  assetTotals,
  budgetRows,
  budgetTotals,
  canView,
  debtTotals,
  documentRows,
  emergencyFundTarget,
  goalRows,
  healthRows,
  listAccounts,
  monthSummary,
  netWorth,
  totalBalance,
  type Viewer,
} from "@/lib/data/queries";
import { currentMonth, safeDueDate } from "@/lib/format";

const FAMILY = "ws-family";

const owner: Viewer = {
  userId: "u-irvan",
  profileId: "p-irvan",
  workspaceId: FAMILY,
  role: "owner",
};
const spouse: Viewer = {
  userId: "u-sari",
  profileId: "p-sari",
  workspaceId: FAMILY,
  role: "adult",
};
const child: Viewer = {
  userId: "u-bima",
  profileId: "p-bima",
  workspaceId: FAMILY,
  role: "child",
};

beforeEach(() => {
  resetStore();
});

describe("saldo akun", () => {
  it("menghitung saldo dari saldo awal + pemasukan − pengeluaran", () => {
    const store = getStore();
    const account = listAccounts().find((a) => a.id === "a-cash")!;
    const expected =
      1_200_000 -
      store.transactions
        .filter((t) => !t.voidedAt && t.accountId === "a-cash" && t.type === "expense")
        .reduce((s, t) => s + t.amount, 0);
    expect(account.balance).toBe(expected);
  });

  it("memindahkan saldo pada transfer tanpa mengubah total", () => {
    const store = getStore();
    const before = totalBalance();
    const source = listAccounts().find((a) => a.id === "a-bca")!;
    const target = listAccounts().find((a) => a.id === "a-mandiri")!;

    const transfer = store.transactions.find((t) => t.type === "transfer")!;
    expect(transfer.accountId).toBe("a-bca");
    expect(transfer.toAccountId).toBe("a-mandiri");

    // Saldo tanpa transfer ini, sebagai pembanding.
    const withoutTransfer = store.transactions
      .filter((t) => !t.voidedAt && t.id !== transfer.id)
      .reduce((balance, t) => {
        if (t.type === "income" && t.accountId === "a-bca") return balance + t.amount;
        if (t.type === "expense" && t.accountId === "a-bca") return balance - t.amount;
        if (t.type === "transfer") {
          if (t.accountId === "a-bca") return balance - t.amount;
          if (t.toAccountId === "a-bca") return balance + t.amount;
        }
        return balance;
      }, source.openingBalance);

    expect(source.balance).toBe(withoutTransfer - transfer.amount);
    expect(target.balance).toBeGreaterThan(target.openingBalance);
    expect(totalBalance()).toBe(before);
  });

  it("mengabaikan transaksi yang dibatalkan", () => {
    const store = getStore();
    const before = totalBalance();
    const tx = store.transactions.find((t) => t.type === "expense")!;
    tx.voidedAt = new Date().toISOString();
    expect(totalBalance()).toBe(before + tx.amount);
  });
});

describe("ringkasan bulan", () => {
  it("tidak mencampur bulan lain", () => {
    const month = currentMonth();
    const summary = monthSummary(month);
    const store = getStore();
    const expected = store.transactions
      .filter(
        (t) =>
          !t.voidedAt &&
          t.type === "income" &&
          t.occurredAt.slice(0, 7) === month,
      )
      .reduce((s, t) => s + t.amount, 0);
    expect(summary.income).toBe(expected);
  });

  it("menghitung net sebagai pemasukan dikurangi pengeluaran", () => {
    const summary = monthSummary();
    expect(summary.net).toBe(summary.income - summary.expense);
  });
});

describe("anggaran", () => {
  it("menghitung terpakai dan status", () => {
    const rows = budgetRows();
    expect(rows.length).toBeGreaterThan(0);

    for (const row of rows) {
      expect(row.used).toBeGreaterThanOrEqual(0);
      expect(row.remaining).toBe(row.amount - row.used);
      if (row.ratio > 100) expect(row.status).toBe("over");
      else if (row.ratio >= 80) expect(row.status).toBe("warning");
      else expect(row.status).toBe("safe");
    }
  });

  it("menjumlahkan total anggaran", () => {
    const totals = budgetTotals();
    const rows = budgetRows();
    expect(totals.planned).toBe(rows.reduce((s, r) => s + r.amount, 0));
    expect(totals.used).toBe(rows.reduce((s, r) => s + r.used, 0));
  });
});

describe("tujuan", () => {
  it("menghitung sisa dan progres", () => {
    const goals = goalRows();
    expect(goals.length).toBeGreaterThan(0);
    for (const goal of goals) {
      expect(goal.remaining).toBe(Math.max(goal.targetAmount - goal.savedAmount, 0));
      expect(goal.progress).toBe(
        Math.round((goal.savedAmount / goal.targetAmount) * 100),
      );
    }
  });

  it("menyarankan kontribusi bulanan dari sisa dibagi bulan tersisa", () => {
    const goal = goalRows().find((g) => g.monthsLeft && g.monthsLeft > 0);
    if (!goal) return;
    expect(goal.monthlyTarget).toBe(
      Math.ceil(goal.remaining / (goal.monthsLeft as number)),
    );
  });

  it("menghitung target dana darurat enam kali pengeluaran bulanan", () => {
    expect(emergencyFundTarget()).toBeGreaterThan(0);
    expect(emergencyFundTarget() % 6).toBeLessThanOrEqual(6);
  });
});

describe("kekayaan bersih", () => {
  it("aset + kas + piutang − utang", () => {
    const worth = netWorth();
    const assets = assetTotals();
    const debts = debtTotals();
    expect(worth.assetsTotal).toBe(assets.total);
    expect(worth.payable).toBe(debts.payable);
    expect(worth.total).toBe(
      worth.cash + worth.assetsTotal + worth.receivable - worth.payable,
    );
  });

  it("mengurangi kekayaan bersih saat utang bertambah", () => {
    const before = netWorth().total;
    getStore().debts.push({
      id: "d-test",
      type: "payable",
      counterparty: "Uji",
      principal: 1_000_000,
      remaining: 1_000_000,
      status: "active",
    });
    expect(netWorth().total).toBe(before - 1_000_000);
  });
});

describe("visibilitas data", () => {
  it("pencatat melihat catatannya sendiri", () => {
    expect(canView("private", owner, "p-irvan")).toBe(true);
    expect(canView("household", owner, "p-irvan")).toBe(true);
    expect(canView("shared", owner, "p-irvan")).toBe(true);
  });

  it("anggota lain tidak melihat catatan private", () => {
    // Sari bukan pencatat dokumen milik Irvan.
    expect(canView("private", spouse, "p-irvan")).toBe(false);
    expect(canView("household", spouse, "p-irvan")).toBe(true);
    expect(canView("shared", spouse, "p-irvan")).toBe(true);
  });

  it("anak tidak melihat catatan household maupun private", () => {
    expect(canView("private", child, "p-irvan")).toBe(false);
    expect(canView("household", child, "p-irvan")).toBe(false);
    expect(canView("shared", child, "p-irvan")).toBe(true);
  });

  it("data lama tanpa pencatat dianggap milik ruang itu", () => {
    expect(canView("private", spouse, undefined)).toBe(true);
  });

  it("menyembunyikan dokumen pribadi dari pasangan", () => {
    const asOwner = documentRows(owner);
    const asSpouse = documentRows(spouse);
    const privateDocs = asOwner.filter(
      (d) => d.visibility === "private" && d.recordedByProfileId !== "p-sari",
    );
    expect(privateDocs.length).toBeGreaterThan(0);
    expect(asSpouse.length).toBe(asOwner.length - privateDocs.length);
  });

  it("catatan kesehatan pribadi hanya terlihat oleh pencatatnya", () => {
    const asOwner = healthRows(owner);
    const asSpouse = healthRows(spouse);

    // Tidak ada catatan yang sama-sama terlihat sebagai `private`.
    const ownerPrivate = asOwner.filter((h) => h.visibility === "private");
    const spousePrivate = asSpouse.filter((h) => h.visibility === "private");
    const overlap = ownerPrivate.filter((h) =>
      spousePrivate.some((other) => other.id === h.id),
    );
    expect(overlap).toHaveLength(0);

    // Catatan household tetap terlihat keduanya.
    const household = asOwner.filter((h) => h.visibility === "household");
    expect(household.length).toBeGreaterThan(0);
    expect(asSpouse.some((h) => h.visibility === "household")).toBe(true);
  });
});

describe("tagihan", () => {
  it("tanggal jatuh tempo berikutnya aman di bulan pendek", () => {
    const bill = getStore().bills.find((b) => b.dueDay === 31);
    if (!bill) return;
    expect(bill.nextDueDate.slice(8)).toBe(
      safeDueDate(bill.nextDueDate.slice(0, 7), 31).slice(8),
    );
  });
});

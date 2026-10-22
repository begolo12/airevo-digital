import "server-only";

import {
  currentMonth,
  daysFromToday,
  lastMonths,
  percent,
  todayISO,
} from "@/lib/format";
import { getStore } from "./store";
import { dueOccurrences } from "./recurring";
import type {
  Account,
  Asset,
  AssetType,
  Bill,
  Category,
  Debt,
  DebtType,
  EducationRecord,
  FamilyDocument,
  FamilyEvent,
  Goal,
  HealthRecord,
  Insurance,
  Role,
  Transaction,
  Visibility,
} from "./types";

/* ------------------------------ akses ----------------------------------- */

/**
 * Konteks pengguna yang sedang melihat data.
 *
 * `workspaceId` wajib: semua query hanya boleh membaca data dari satu ruang.
 * Tanpa ini, data ruang pribadi orang lain bisa ikut terhitung.
 */
export type Viewer = {
  userId: string;
  profileId: string;
  workspaceId: string;
  role: Role;
};

/**
 * Aturan visibilitas di dalam satu workspace.
 *
 * - `private`   → hanya profil yang mencatat
 * - `household` → semua kecuali anak
 * - `shared`    → semua anggota workspace
 *
 * Isolasi antar workspace ditangani terpisah (setiap query memfilter
 * `workspaceId`), jadi `private` di sini berarti "privat di dalam ruang ini".
 */
export function canView(
  visibility: Visibility,
  viewer: Viewer,
  recorderProfileId?: string,
): boolean {
  if (visibility === "private") {
    // Tanpa pencatat (data lama), anggap milik ruang itu sendiri.
    if (!recorderProfileId) return true;
    return recorderProfileId === viewer.profileId;
  }
  if (visibility === "household") return viewer.role !== "child";
  return true;
}

export type AccountBalance = Account & { balance: number };

function activeTx(workspaceId?: string): Transaction[] {
  const rows = getStore().transactions.filter((t) => !t.voidedAt);
  return workspaceId ? rows.filter((t) => t.workspaceId === workspaceId) : rows;
}

export function listAccounts(
  workspaceId?: string,
  includeArchived = false,
): AccountBalance[] {
  const store = getStore();
  const tx = activeTx(workspaceId);
  const accounts = workspaceId
    ? store.accounts.filter((a) => a.workspaceId === workspaceId)
    : store.accounts;
  return accounts
    .filter((a) => includeArchived || !a.archived)
    .map((account) => {
      let balance = account.openingBalance;
      for (const t of tx) {
        if (t.type === "income" && t.accountId === account.id) balance += t.amount;
        if (t.type === "expense" && t.accountId === account.id) balance -= t.amount;
        if (t.type === "transfer") {
          if (t.accountId === account.id) balance -= t.amount;
          if (t.toAccountId === account.id) balance += t.amount;
        }
      }
      return { ...account, balance };
    });
}

export function totalBalance(workspaceId?: string): number {
  return listAccounts(workspaceId).reduce((sum, a) => sum + a.balance, 0);
}

export function listCategories(
  workspaceId?: string,
  kind?: "income" | "expense",
): Category[] {
  const rows = workspaceId
    ? getStore().categories.filter((c) => c.workspaceId === workspaceId)
    : getStore().categories;
  return rows.filter((c) => !c.archived && (!kind || c.kind === kind));
}

export function categoryById(id?: string): Category | undefined {
  return id ? getStore().categories.find((c) => c.id === id) : undefined;
}

export function accountById(id?: string): Account | undefined {
  return id ? getStore().accounts.find((a) => a.id === id) : undefined;
}

export function memberById(id?: string) {
  return id ? getStore().members.find((m) => m.id === id) : undefined;
}

export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

export type MonthSummary = {
  month: string;
  income: number;
  expense: number;
  net: number;
  transfer: number;
};

export function monthSummary(
  month = currentMonth(),
  viewer?: Viewer,
): MonthSummary {
  const tx = activeTx(viewer?.workspaceId)
    .filter((t) => monthOf(t.occurredAt) === month)
    .filter((t) => (viewer ? canView(t.visibility, viewer, t.recordedByProfileId) : true));
  const income = tx
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expense = tx
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const transfer = tx
    .filter((t) => t.type === "transfer")
    .reduce((s, t) => s + t.amount, 0);
  return { month, income, expense, net: income - expense, transfer };
}

export function cashflowSeries(count = 6, viewer?: Viewer) {
  return lastMonths(count).map((m) => {
    const s = monthSummary(m, viewer);
    return { month: m, income: s.income, expense: s.expense, net: s.net };
  });
}

export type BudgetRow = {
  id: string;
  category: Category;
  amount: number;
  used: number;
  remaining: number;
  ratio: number;
  status: "safe" | "warning" | "over";
};

export function budgetRows(month = currentMonth(), viewer?: Viewer): BudgetRow[] {
  const store = getStore();
  const tx = activeTx(viewer?.workspaceId).filter(
    (t) =>
      t.type === "expense" &&
      monthOf(t.occurredAt) === month &&
      (viewer ? canView(t.visibility, viewer, t.recordedByProfileId) : true),
  );

  return store.budgets
    .filter((b) => (viewer ? b.workspaceId === viewer.workspaceId : true))
    .filter((b) => b.month === month)
    .map((b) => {
      const category = store.categories.find((c) => c.id === b.categoryId);
      if (!category) return null;
      const used = tx
        .filter((t) => t.categoryId === b.categoryId)
        .reduce((s, t) => s + t.amount, 0);
      const ratio = percent(used, b.amount);
      return {
        id: b.id,
        category,
        amount: b.amount,
        used,
        remaining: b.amount - used,
        ratio,
        status: ratio > 100 ? "over" : ratio >= 80 ? "warning" : "safe",
      } satisfies BudgetRow;
    })
    .filter((row): row is BudgetRow => row !== null)
    .sort((a, b) => b.ratio - a.ratio);
}

export function budgetTotals(month = currentMonth(), viewer?: Viewer) {
  const rows = budgetRows(month, viewer);
  const planned = rows.reduce((s, r) => s + r.amount, 0);
  const used = rows.reduce((s, r) => s + r.used, 0);
  return { planned, used, remaining: planned - used, ratio: percent(used, planned) };
}

export function expenseByCategory(month = currentMonth(), viewer?: Viewer) {
  const store = getStore();
  const tx = activeTx(viewer?.workspaceId).filter(
    (t) =>
      t.type === "expense" &&
      monthOf(t.occurredAt) === month &&
      (viewer ? canView(t.visibility, viewer, t.recordedByProfileId) : true),
  );
  const map = new Map<string, number>();
  for (const t of tx) {
    const key = t.categoryId ?? "uncategorized";
    map.set(key, (map.get(key) ?? 0) + t.amount);
  }
  const total = [...map.values()].reduce((s, v) => s + v, 0);
  return [...map.entries()]
    .map(([categoryId, amount]) => ({
      category: store.categories.find((c) => c.id === categoryId),
      categoryId,
      amount,
      ratio: percent(amount, total),
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Tren pengeluaran per kategori selama beberapa bulan terakhir.
 *
 * Dipakai untuk sparkline di samping nominal: angka "Rp640.000" tidak
 * memberi tahu apakah pengeluaran naik atau turun, garis kecil 6 bulan
 * memberi tahu dalam sekejap.
 *
 * Mengembalikan `Map<categoryId, number[]>` dengan urutan bulan terlama →
 * terbaru, sehingga indeks terakhir selalu bulan berjalan.
 */
export function categoryTrend(
  months = 6,
  month = currentMonth(),
  viewer?: Viewer,
): Map<string, number[]> {
  const result = new Map<string, number[]>();

  // Daftar bulan, terlama dulu — `lastMonths` sudah menyusunnya begitu.
  const labels = lastMonths(months, month);

  const transactions = activeTx(viewer?.workspaceId).filter(
    (t) =>
      t.type === "expense" &&
      (viewer ? canView(t.visibility, viewer, t.recordedByProfileId) : true),
  );

  for (const transaction of transactions) {
    const key = transaction.categoryId ?? "uncategorized";
    const label = monthOf(transaction.occurredAt);
    const index = labels.indexOf(label);
    if (index === -1) continue;

    if (!result.has(key)) result.set(key, new Array(months).fill(0));
    const series = result.get(key) as number[];
    series[index] += transaction.amount;
  }

  return result;
}

export type BillRow = Omit<Bill, "status"> & {
  billStatus: Bill["status"];
  state: "upcoming" | "due" | "overdue" | "paid";
  daysLeft: number;
  category?: Category;
};

export function billRows(workspaceId?: string): BillRow[] {
  const store = getStore();
  return store.bills
    .filter((b) => b.status === "active")
    .filter((b) => (workspaceId ? b.workspaceId === workspaceId : true))
    .map((b) => {
      const daysLeft = daysFromToday(b.nextDueDate);
      const paidThisPeriod = store.billPayments.some(
        (p) => p.billId === b.id && p.dueDate === b.nextDueDate,
      );
      const state: BillRow["state"] = paidThisPeriod
        ? "paid"
        : daysLeft < 0
          ? "overdue"
          : daysLeft === 0
            ? "due"
            : "upcoming";
      return {
        ...b,
        billStatus: b.status,
        state,
        daysLeft,
        category: store.categories.find((c) => c.id === b.categoryId),
      } satisfies BillRow;
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

export function upcomingBills(limit = 3, workspaceId?: string): BillRow[] {
  return billRows(workspaceId)
    .filter((b) => b.state !== "paid")
    .slice(0, limit);
}

export function billPaymentsFor(billId: string) {
  return getStore()
    .billPayments.filter((p) => p.billId === billId)
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate));
}

export type GoalRow = Goal & {
  progress: number;
  remaining: number;
  monthsLeft: number | null;
  monthlyTarget: number | null;
  onTrack: boolean | null;
  memberName?: string;
};

export function goalRows(workspaceId?: string): GoalRow[] {
  const store = getStore();
  const now = new Date(`${currentMonth()}-01T00:00:00`);

  return store.goals
    .filter((g) => g.status !== "achieved")
    .filter((g) => (workspaceId ? g.workspaceId === workspaceId : true))
    .map((g) => {
      const progress = percent(g.savedAmount, g.targetAmount);
      const remaining = Math.max(g.targetAmount - g.savedAmount, 0);
      let monthsLeft: number | null = null;
      let monthlyTarget: number | null = null;
      let onTrack: boolean | null = null;

      if (g.targetDate) {
        const target = new Date(`${g.targetDate}T00:00:00`);
        monthsLeft = Math.max(
          (target.getFullYear() - now.getFullYear()) * 12 +
            (target.getMonth() - now.getMonth()),
          0,
        );
        monthlyTarget = monthsLeft > 0 ? Math.ceil(remaining / monthsLeft) : remaining;
        const elapsedTotal =
          (target.getFullYear() - now.getFullYear()) * 12 +
          (target.getMonth() - now.getMonth());
        onTrack = elapsedTotal > 0 ? progress >= 0 : null;
      }

      return {
        ...g,
        progress,
        remaining,
        monthsLeft,
        monthlyTarget,
        onTrack,
        memberName: store.members.find((m) => m.id === g.memberId)?.name,
      } satisfies GoalRow;
    })
    .sort((a, b) => b.progress - a.progress);
}

/**
 * Mencari tujuan berdasarkan id.
 *
 * `workspaceId` **wajib** diberikan saat id berasal dari URL. Id di URL bisa
 * ditebak atau dibagikan; tanpa penyaringan ruang, pengguna yang login di satu
 * ruang bisa membuka tujuan milik ruang lain hanya dengan mengetik id-nya.
 */
export function goalById(id: string, workspaceId?: string): GoalRow | undefined {
  const goal = goalRows(workspaceId).find((g) => g.id === id);
  if (!goal) return undefined;

  // Sabuk pengaman kedua: pastikan ruangnya memang cocok.
  if (workspaceId && goal.workspaceId !== workspaceId) return undefined;

  return goal;
}

/**
 * Kontribusi sebuah tujuan.
 *
 * Disaring per ruang karena `goalId` berasal dari URL. Tanpa ini, riwayat
 * setoran tujuan ruang lain ikut terbaca.
 */
export function contributionsFor(goalId: string, workspaceId?: string) {
  return getStore()
    .contributions.filter(
      (c) => c.goalId === goalId && (!workspaceId || c.workspaceId === workspaceId),
    )
    .sort((a, b) => b.contributedAt.localeCompare(a.contributedAt));
}

/** Rata-rata pengeluaran 3 bulan terakhir (dasar dana darurat). */
export function averageMonthlyExpense(months = 3, workspaceId?: string): number {
  const series = cashflowSeries(
    months,
    workspaceId
      ? { userId: "", profileId: "", workspaceId, role: "owner" as const }
      : undefined,
  );
  const total = series.reduce((s, m) => s + m.expense, 0);
  return Math.round(total / Math.max(series.length, 1));
}

export function emergencyFundTarget(workspaceId?: string): number {
  return averageMonthlyExpense(3, workspaceId) * 6;
}

export type EventRow = FamilyEvent & {
  displayDate: string;
  daysLeft: number;
  isBirthday: boolean;
  memberName?: string;
};

/** Ulang tahun anggota diubah menjadi event virtual. */
function birthdayEvents(): FamilyEvent[] {
  const store = getStore();
  const year = new Date().getFullYear();
  return store.members
    .filter((m) => m.birthDate)
    .map((m) => ({
      id: `bd-${m.id}`,
      title: `Ulang tahun ${m.name}`,
      type: "birthday" as const,
      date: `${year}-${m.birthDate!.slice(5)}`,
      allDay: true,
      memberId: m.id,
      recurrence: "yearly" as const,
    }));
}

export function upcomingEvents(limit = 5, workspaceId?: string): EventRow[] {
  const store = getStore();
  const today = todayISO();
  const all = [...store.events, ...birthdayEvents()];
  const scoped = workspaceId
    ? all.filter((e) => !e.workspaceId || e.workspaceId === workspaceId)
    : all;

  return scoped
    .map((e) => {
      // Ulang tahun tahunan: geser ke tahun berjalan jika sudah lewat.
      let displayDate = e.date;
      if (e.recurrence === "yearly") {
        const mmdd = e.date.slice(5);
        displayDate = `${today.slice(0, 4)}-${mmdd}`;
        if (displayDate < today) {
          displayDate = `${Number(today.slice(0, 4)) + 1}-${mmdd}`;
        }
      }
      return {
        ...e,
        displayDate,
        daysLeft: daysFromToday(displayDate),
        isBirthday: e.type === "birthday",
        memberName: store.members.find((m) => m.id === e.memberId)?.name,
      } satisfies EventRow;
    })
    .sort((a, b) => a.displayDate.localeCompare(b.displayDate))
    .slice(0, limit);
}

/**
 * Intensitas pengeluaran per hari dalam satu bulan.
 *
 * Dipakai untuk lapisan heatmap di kalender: warna sel menunjukkan seberapa
 * besar pengeluaran hari itu. Angka saja tidak memberi tahu hari mana yang
 * mahal — pola warna memberi tahu dalam sekejap.
 *
 * Mengembalikan `Map<tanggal ISO, jumlah>`. Hari tanpa pengeluaran tidak
 * dimasukkan, sehingga pemanggil bisa membedakan "nol" dari "tidak ada data".
 */
export function dailyExpense(
  month: string,
  workspaceId?: string,
): Map<string, number> {
  const result = new Map<string, number>();

  for (const transaction of activeTx(workspaceId)) {
    if (transaction.type !== "expense") continue;
    if (monthOf(transaction.occurredAt) !== month) continue;

    result.set(
      transaction.occurredAt,
      (result.get(transaction.occurredAt) ?? 0) + transaction.amount,
    );
  }

  return result;
}

export function eventsInMonth(month: string, workspaceId?: string): EventRow[] {
  const store = getStore();
  const all = [...store.events, ...birthdayEvents()].filter((e) =>
    workspaceId ? !e.workspaceId || e.workspaceId === workspaceId : true,
  );
  return all
    .map((e) => {
      let displayDate = e.date;
      if (e.recurrence === "yearly") {
        displayDate = `${month.slice(0, 4)}-${e.date.slice(5)}`;
      }
      return {
        ...e,
        displayDate,
        daysLeft: daysFromToday(displayDate),
        isBirthday: e.type === "birthday",
        memberName: store.members.find((m) => m.id === e.memberId)?.name,
      } satisfies EventRow;
    })
    .filter((e) => displayDateMonth(e.displayDate) === month)
    .sort((a, b) => a.displayDate.localeCompare(b.displayDate));

  function displayDateMonth(iso: string) {
    return iso.slice(0, 7);
  }
}

export function listChores(workspaceId?: string) {
  const store = getStore();
  return store.chores
    .filter((c) => (workspaceId ? c.workspaceId === workspaceId : true))
    .map((c) => ({
      ...c,
      assigneeName: store.members.find((m) => m.id === c.assigneeMemberId)?.name,
    }))
    .sort((a, b) => {
      const order = { todo: 0, doing: 1, done: 2 } as const;
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
    });
}

export function shoppingTotals(workspaceId?: string) {
  const items = getStore().shopping.filter((i) =>
    workspaceId ? i.workspaceId === workspaceId : true,
  );
  const estimated = items.reduce(
    (s, i) => s + i.estimatedPrice * i.qty,
    0,
  );
  const actual = items.reduce(
    (s, i) => s + (i.actualPrice ?? i.estimatedPrice) * i.qty,
    0,
  );
  const checked = items.filter((i) => i.checked).length;
  return { estimated, actual, checked, total: items.length };
}

export function recentTransactions(limit = 6, viewer?: Viewer): Transaction[] {
  return [...getStore().transactions]
    .filter((t) => (viewer ? t.workspaceId === viewer.workspaceId : true))
    .filter((t) => (viewer ? canView(t.visibility, viewer, t.recordedByProfileId) : true))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, limit);
}

export function listTransactions(
  filters?: {
    month?: string;
    type?: string;
    accountId?: string;
    categoryId?: string;
    q?: string;
  },
  viewer?: Viewer,
) {
  const store = getStore();
  const rows = [...store.transactions]
    .filter((t) => !t.voidedAt)
    .filter((t) => (viewer ? t.workspaceId === viewer.workspaceId : true))
    .filter((t) => (viewer ? canView(t.visibility, viewer, t.recordedByProfileId) : true))
    .filter((t) => (filters?.month ? monthOf(t.occurredAt) === filters.month : true))
    .filter((t) => (filters?.type ? t.type === filters.type : true))
    .filter((t) =>
      filters?.accountId
        ? t.accountId === filters.accountId || t.toAccountId === filters.accountId
        : true,
    )
    .filter((t) => (filters?.categoryId ? t.categoryId === filters.categoryId : true))
    .filter((t) =>
      filters?.q
        ? t.description.toLowerCase().includes(filters.q.toLowerCase())
        : true,
    )
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  return rows.map((t) => ({
    ...t,
    categoryName: store.categories.find((c) => c.id === t.categoryId)?.name,
    categoryColor: store.categories.find((c) => c.id === t.categoryId)?.color,
    accountName: store.accounts.find((a) => a.id === t.accountId)?.name,
    toAccountName: store.accounts.find((a) => a.id === t.toAccountId)?.name,
    memberName: store.members.find((m) => m.id === t.memberId)?.name,
    recordedByName: t.recordedByProfileId
      ? store.profiles.find((p) => p.id === t.recordedByProfileId)?.name
      : undefined,
  }));
}

export function transactionTotals(month = currentMonth(), workspaceId?: string) {
  const tx = activeTx(workspaceId).filter((t) => monthOf(t.occurredAt) === month);
  return {
    count: tx.length,
    income: tx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
    expense: tx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    transfer: tx.filter((t) => t.type === "transfer").reduce((s, t) => s + t.amount, 0),
  };
}

/**
 * Kekayaan bersih = saldo akun + nilai aset + piutang − utang.
 * Dana tujuan tidak ditambahkan lagi karena sudah berada di dalam saldo akun.
 */
export function netWorth(workspaceId?: string) {
  const cash = totalBalance(workspaceId);
  const store = getStore();
  const inWs = <T extends { workspaceId?: string }>(rows: T[]) =>
    workspaceId ? rows.filter((r) => r.workspaceId === workspaceId) : rows;
  const assetsTotal = inWs(store.assets).reduce((s, a) => s + a.currentValue, 0);
  const receivable = inWs(store.debts)
    .filter((d) => d.type === "receivable" && d.status === "active")
    .reduce((s, d) => s + d.remaining, 0);
  const payable = inWs(store.debts)
    .filter((d) => d.type === "payable" && d.status === "active")
    .reduce((s, d) => s + d.remaining, 0);

  return {
    cash,
    assetsTotal,
    receivable,
    payable,
    goalsSaved: inWs(store.goals).reduce((s, g) => s + g.savedAmount, 0),
    total: cash + assetsTotal + receivable - payable,
  };
}

/* ------------------------------ fase C ---------------------------------- */

export type DebtRow = Debt & {
  paid: number;
  progress: number;
  daysLeft: number | null;
  overdue: boolean;
};

export function debtRows(type?: DebtType, workspaceId?: string): DebtRow[] {
  return getStore()
    .debts.filter((d) => (workspaceId ? d.workspaceId === workspaceId : true))
    .filter((d) => (type ? d.type === type : true))
    .map((d) => {
      const paid = Math.max(d.principal - d.remaining, 0);
      return {
        ...d,
        paid,
        progress: percent(paid, d.principal),
        daysLeft: d.dueDate ? daysFromToday(d.dueDate) : null,
        overdue: d.dueDate ? daysFromToday(d.dueDate) < 0 && d.status === "active" : false,
      } satisfies DebtRow;
    })
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "active" ? -1 : 1;
      return b.remaining - a.remaining;
    });
}

export function debtTotals(workspaceId?: string) {
  const rows = debtRows(undefined, workspaceId).filter((d) => d.status === "active");
  const payable = rows
    .filter((d) => d.type === "payable")
    .reduce((s, d) => s + d.remaining, 0);
  const receivable = rows
    .filter((d) => d.type === "receivable")
    .reduce((s, d) => s + d.remaining, 0);
  const monthly = rows
    .filter((d) => d.type === "payable")
    .reduce((s, d) => s + (d.installmentAmount ?? 0), 0);
  return { payable, receivable, net: receivable - payable, monthly };
}

export type AssetRow = Asset & {
  gain: number;
  gainRatio: number;
  typeLabel: string;
};

const assetTypeLabel: Record<AssetType, string> = {
  cash: "Kas",
  property: "Properti",
  vehicle: "Kendaraan",
  gold: "Emas",
  investment: "Investasi",
  other: "Lainnya",
};

export function assetRows(workspaceId?: string): AssetRow[] {
  return getStore()
    .assets
    .filter((a) => (workspaceId ? a.workspaceId === workspaceId : true)).map((a) => {
      const base = a.acquisitionValue ?? a.currentValue;
      const gain = a.currentValue - base;
      return {
        ...a,
        gain,
        gainRatio: percent(gain, base),
        typeLabel: assetTypeLabel[a.type],
      } satisfies AssetRow;
    })
    .sort((a, b) => b.currentValue - a.currentValue);
}

export function assetTotals(workspaceId?: string) {
  const rows = assetRows(workspaceId);
  const total = rows.reduce((s, a) => s + a.currentValue, 0);
  const cost = rows.reduce((s, a) => s + (a.acquisitionValue ?? a.currentValue), 0);
  return { total, cost, gain: total - cost, count: rows.length };
}

export type InsuranceRow = Insurance & {
  memberName?: string;
  daysLeft: number | null;
};

export function insuranceRows(workspaceId?: string): InsuranceRow[] {
  const store = getStore();
  return store.insurances
    .filter((i) => (workspaceId ? i.workspaceId === workspaceId : true))
    .map((i) => ({
      ...i,
      memberName: store.members.find((m) => m.id === i.memberId)?.name,
      daysLeft: i.nextDueDate ? daysFromToday(i.nextDueDate) : null,
    }))
    .sort((a, b) => (a.nextDueDate ?? "9999").localeCompare(b.nextDueDate ?? "9999"));
}

export type DocumentRow = FamilyDocument & {
  memberName?: string;
  expired: boolean;
  expiresSoon: boolean;
  daysToExpiry: number | null;
};

export function documentRows(viewer?: Viewer): DocumentRow[] {
  const store = getStore();
  return store.documents
    .filter((d) => (viewer ? d.workspaceId === viewer.workspaceId : true))
    .filter((d) => (viewer ? canView(d.visibility, viewer, d.recordedByProfileId) : true))
    .map((d) => {
      const daysToExpiry = d.expiresAt ? daysFromToday(d.expiresAt) : null;
      return {
        ...d,
        memberName: store.members.find((m) => m.id === d.memberId)?.name,
        expired: daysToExpiry !== null && daysToExpiry < 0,
        expiresSoon: daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= 60,
        daysToExpiry,
      } satisfies DocumentRow;
    })
    .sort((a, b) => {
      if (a.expired !== b.expired) return a.expired ? -1 : 1;
      return (a.expiresAt ?? "9999").localeCompare(b.expiresAt ?? "9999");
    });
}

export type HealthRow = HealthRecord & {
  memberName?: string;
  nextIn: number | null;
  visible: boolean;
};

export function healthRows(viewer?: Viewer): HealthRow[] {
  const store = getStore();
  return store.healthRecords
    .filter((h) => (viewer ? h.workspaceId === viewer.workspaceId : true))
    .map((h) => {
      const visible = viewer
        ? canView(h.visibility === "household" ? "household" : "private", viewer, h.recordedByProfileId)
        : true;
      return {
        ...h,
        memberName: store.members.find((m) => m.id === h.memberId)?.name,
        nextIn: h.nextAt ? daysFromToday(h.nextAt) : null,
        visible,
      } satisfies HealthRow;
    })
    .filter((h) => h.visible)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

export type EducationRow = EducationRecord & {
  memberName?: string;
  goalName?: string;
  monthlySaving: number | null;
};

export function educationRows(workspaceId?: string): EducationRow[] {
  const store = getStore();
  return store.educationRecords
    .filter((e) => (workspaceId ? e.workspaceId === workspaceId : true))
    .map((e) => {
      const goal = e.goalId ? store.goals.find((g) => g.id === e.goalId) : undefined;
      return {
        ...e,
        memberName: store.members.find((m) => m.id === e.memberId)?.name,
        goalName: goal?.name,
        monthlySaving: e.annualCost ? Math.ceil(e.annualCost / 12) : null,
      } satisfies EducationRow;
    })
    .sort((a, b) => (a.memberName ?? "").localeCompare(b.memberName ?? ""));
}

export function educationTotals(workspaceId?: string) {
  const rows = educationRows(workspaceId);
  const annual = rows.reduce((s, e) => s + (e.annualCost ?? 0), 0);
  return { annual, monthly: Math.ceil(annual / 12), count: rows.length };
}

/**
 * Aturan berulang yang sudah jatuh tempo untuk sebuah ruang.
 *
 * Dipakai dashboard untuk menampilkan tawaran "buat sekarang" — bukan membuat
 * transaksi diam-diam. Transaksi keuangan sebaiknya dikonfirmasi pengguna:
 * nominal yang tiba-tiba muncul di saldo lebih membingungkan daripada satu
 * klik tambahan.
 */
export function dueRecurringRules(workspaceId?: string) {
  const rules = getStore().recurringRules.filter(
    (rule) => (workspaceId ? rule.workspaceId === workspaceId : true) && rule.active,
  );
  const due = dueOccurrences(rules, todayISO());
  return { count: due.length, rules: [...new Set(due.map((item) => item.rule))] };
}

export function dashboardData(viewer?: Viewer) {
  const month = currentMonth();
  const ws = viewer?.workspaceId;
  const summary = monthSummary(month, viewer);
  const previous = monthSummary(lastMonths(2)[0], viewer);
  const worth = netWorth(ws);
  return {
    month,
    summary,
    previous,
    balances: listAccounts(ws),
    totalBalance: totalBalance(ws),
    budgets: budgetRows(month, viewer).slice(0, 4),
    budgetTotals: budgetTotals(month, viewer),
    bills: upcomingBills(3, ws),
    goals: goalRows(ws).slice(0, 3),
    events: upcomingEvents(3, ws),
    chores: listChores(ws).filter((c) => c.status !== "done").slice(0, 4),
    recent: recentTransactions(5, viewer),
    cashflow: cashflowSeries(6, viewer),
    worth,
    debts: debtTotals(ws),
    expiringDocs: documentRows(viewer).filter((d) => d.expired || d.expiresSoon).slice(0, 3),
    nextCheckup: healthRows(viewer)
      .filter((h) => h.nextIn !== null)
      .sort((a, b) => (a.nextIn ?? 9999) - (b.nextIn ?? 9999))[0],
  };
}

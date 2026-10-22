import "server-only";

import { todayISO } from "@/lib/format";
import {
  billRows,
  budgetRows,
  budgetTotals,
  cashFlowProjection,
  cashflowSeries,
  categoryTrend,
  dailyExpense,
  dashboardData,
  dueRecurringRules,
  expenseByCategory,
  goalRows,
  listAccounts,
  listCategories,
  listTransactions,
  monthSummary,
  netWorth,
  transactionTotals,
  upcomingBills,
} from "@/lib/data/queries";
import type { Viewer } from "@/lib/session";
import type { Transaction } from "@/lib/data/types";

/**
 * Bentuk data untuk aplikasi Android.
 *
 * ## Kenapa ada lapisan terjemahan, bukan mengirim hasil query apa adanya
 *
 * Query internal mengembalikan bentuk yang nyaman untuk server component:
 * objek bertingkat, nama field campur Indonesia-Inggris. Aplikasi mobile
 * butuh kontrak yang **stabil** — begitu sebuah field berganti nama, aplikasi
 * versi lama yang sudah terpasang di HP pengguna tidak bisa ikut diperbarui
 * seketika.
 *
 * Lapisan ini memutus ketergantungan itu: query internal boleh berubah, selama
 * bentuk di sini dijaga.
 *
 * ## Aturan yang dipegang
 *
 * - **Semua nominal rupiah berupa integer.** Tidak ada pembulatan di klien.
 * - **Semua tanggal ISO `YYYY-MM-DD`.** Tidak ada `Date` yang perlu diurai.
 * - **Tidak ada field yang boleh `undefined`.** Nilai kosong dikirim sebagai
 *   `null` eksplisit, supaya model Dart tidak perlu menebak.
 */

/** Angka yang selalu ada, tidak pernah NaN atau undefined. */
function money(value: number | undefined | null): number {
  return Number.isFinite(value) ? Math.round(value as number) : 0;
}

function text(value: string | undefined | null): string {
  return typeof value === "string" ? value : "";
}

/* --------------------------------- ringkasan ------------------------------- */

export function mobileSummary(viewer: Viewer) {
  const data = dashboardData(viewer);
  const projection = cashFlowProjection(viewer.workspaceId, 6);
  const due = dueRecurringRules(viewer.workspaceId);

  return {
    month: data.month,
    balance: money(data.totalBalance),
    income: money(data.summary.income),
    expense: money(data.summary.expense),
    net: money(data.summary.net),
    previousIncome: money(data.previous.income),
    previousExpense: money(data.previous.expense),
    budgetPlanned: money(data.budgetTotals.planned),
    budgetUsed: money(data.budgetTotals.used),
    budgetRatio: Math.round(data.budgetTotals.ratio),
    netWorth: money(data.worth.total),
    cash: money(data.worth.cash),
    assets: money(data.worth.assetsTotal),
    payable: money(data.worth.payable),
    receivable: money(data.worth.receivable),
    dueRecurringCount: due.count,
    projection: projection.months.map((month) => ({
      month: month.month,
      income: money(month.income),
      expense: money(month.totalExpense),
      net: money(month.net),
      balance: money(month.runningBalance),
    })),
  };
}

/* -------------------------------- transaksi -------------------------------- */

export type MobileTransaction = {
  id: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  occurredAt: string;
  description: string;
  accountName: string;
  categoryName: string | null;
  visibility: string;
  voided: boolean;
  hasAttachment: boolean;
};

/** Baris transaksi yang dikirim ke klien. */
function toMobileTransaction(
  tx: Transaction,
  accounts: Array<{ id: string; name: string }>,
  categories: Array<{ id: string; name: string }>,
): MobileTransaction {
  return {
    id: tx.id,
    type: tx.type,
    amount: money(tx.amount),
    occurredAt: tx.occurredAt,
    description: text(tx.description),
    accountName: text(accounts.find((item) => item.id === tx.accountId)?.name),
    categoryName:
      categories.find((item) => item.id === tx.categoryId)?.name ?? null,
    visibility: tx.visibility,
    voided: Boolean(tx.voidedAt),
    hasAttachment: Boolean(tx.attachmentKey),
  };
}

export function mobileTransactions(
  viewer: Viewer,
  options: { limit?: number; offset?: number; month?: string } = {},
) {
  const limit = Math.min(Math.max(options.limit ?? 30, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);

  const all = listTransactions({ month: options.month }, viewer);
  const page = all.slice(offset, offset + limit);

  const accounts = listAccounts(viewer.workspaceId);
  const categories = listCategories(viewer.workspaceId);

  return {
    total: all.length,
    limit,
    offset,
    hasMore: offset + page.length < all.length,
    items: page.map((tx) => toMobileTransaction(tx, accounts, categories)),
  };
}

/* --------------------------------- tagihan --------------------------------- */

export function mobileBills(viewer: Viewer) {
  const bills = billRows(viewer.workspaceId);
  const upcoming = upcomingBills(30, viewer.workspaceId);

  return {
    total: bills.reduce((sum, bill) => sum + money(bill.amount), 0),
    upcomingCount: upcoming.length,
    items: bills.map((bill) => ({
      id: bill.id,
      name: text(bill.name),
      amount: money(bill.amount),
      frequency: bill.frequency,
      nextDueDate: bill.nextDueDate,
      state: bill.state,
      categoryName: bill.category?.name ?? null,
      splitCount: bill.split?.shares.length ?? 0,
    })),
  };
}

/* -------------------------------- anggaran --------------------------------- */

export function mobileBudgets(viewer: Viewer) {
  const month = todayISO().slice(0, 7);
  const rows = budgetRows(month, viewer);
  const totals = budgetTotals(month, viewer);

  return {
    month,
    planned: money(totals.planned),
    used: money(totals.used),
    remaining: money(totals.remaining),
    ratio: Math.round(totals.ratio),
    items: rows.map((row) => ({
      id: row.id,
      categoryName: text(row.category.name),
      budgeted: money(row.amount),
      used: money(row.used),
      remaining: money(row.remaining),
      ratio: Math.round(row.ratio),
      status: row.status,
    })),
  };
}

/* --------------------------------- tujuan ---------------------------------- */

export function mobileGoals(viewer: Viewer) {
  const goals = goalRows(viewer.workspaceId);

  return {
    items: goals.map((goal) => ({
      id: goal.id,
      name: text(goal.name),
      target: money(goal.targetAmount),
      saved: money(goal.savedAmount),
      remaining: money(goal.remaining),
      progress: Math.round(goal.progress),
      targetDate: goal.targetDate ?? null,
      monthsLeft: goal.monthsLeft,
      monthlyTarget: goal.monthlyTarget === null ? null : money(goal.monthlyTarget),
      onTrack: goal.onTrack,
    })),
  };
}

/* --------------------------------- laporan --------------------------------- */

export function mobileReports(viewer: Viewer) {
  const month = todayISO().slice(0, 7);
  const categories = expenseByCategory(month, viewer);
  const series = cashflowSeries(12, viewer);
  const trend = categoryTrend(3, month, viewer);

  return {
    month,
    summary: {
      income: money(monthSummary(month, viewer).income),
      expense: money(monthSummary(month, viewer).expense),
      net: money(monthSummary(month, viewer).net),
    },
    worth: (() => {
      const worth = netWorth(viewer.workspaceId);
      return {
        cash: money(worth.cash),
        assets: money(worth.assetsTotal),
        receivable: money(worth.receivable),
        payable: money(worth.payable),
        total: money(worth.total),
      };
    })(),
    categories: categories.map((row) => ({
      name: text(row.category?.name),
      amount: money(row.amount),
      percent: Math.round(row.ratio),
    })),
    series: series.map((point) => ({
      month: point.month,
      income: money(point.income),
      expense: money(point.expense),
      net: money(point.net),
    })),
    trend: [...trend.entries()].map(([name, values]) => ({
      name,
      values: values.map((value) => money(value)),
    })),
  };
}

/* -------------------------------- kalender --------------------------------- */

export function mobileCalendar(viewer: Viewer, month: string) {
  const daily = dailyExpense(month, viewer.workspaceId);
  const totals = transactionTotals(month, viewer.workspaceId);

  return {
    month,
    count: totals.count,
    income: money(totals.income),
    expense: money(totals.expense),
    days: [...daily.entries()]
      .map(([date, amount]) => ({ date, amount: money(amount) }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/* -------------------------------- referensi -------------------------------- */

/** Akun dan kategori, untuk mengisi formulir di aplikasi. */
export function mobileReference(viewer: Viewer) {
  return {
    accounts: listAccounts(viewer.workspaceId).map((account) => ({
      id: account.id,
      name: text(account.name),
      type: account.type,
      balance: money(account.balance),
    })),
    categories: listCategories(viewer.workspaceId).map((category) => ({
      id: category.id,
      name: text(category.name),
      kind: category.kind,
    })),
  };
}

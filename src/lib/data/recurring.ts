import { addDays, todayISO } from "@/lib/format";
import type { RecurrenceFrequency, RecurringRule } from "@/lib/data/types";

/**
 * Pembuatan transaksi berulang.
 *
 * ## Kenapa transaksi dibuat saat jatuh tempo, bukan di muka
 *
 * Aturan berulang menyimpan **cetakan**, bukan 12 transaksi sekaligus. Bila
 * semua transaksi masa depan dibuat di muka, saldo hari ini akan terlihat
 * minus padahal uangnya belum keluar — laporan jadi menyesatkan.
 *
 * ## Kenapa idempoten
 *
 * Satu-satunya penanda kemajuan adalah `nextAt`. Setiap kali transaksi dibuat,
 * `nextAt` dimajukan satu periode. Memanggil `dueOccurrences()` dua kali pada
 * hari yang sama tidak menghasilkan dua transaksi, karena panggilan pertama
 * sudah memajukan `nextAt` melewati hari ini.
 *
 * ## Batas pengejaran
 *
 * Bila server mati sebulan, aturan bulanan punya satu jadwal tertinggal —
 * bukan tiga puluh. Tetap ada batas `MAX_CATCH_UP` agar aturan yang lama tidak
 * aktif tidak tiba-tiba membuat ratusan transaksi sekaligus.
 */

/** Jumlah periode tertinggal maksimum yang dikejar dalam satu kali proses. */
export const MAX_CATCH_UP = 24;

/** Memajukan tanggal satu periode sesuai frekuensi. */
export function advance(date: string, frequency: RecurrenceFrequency): string {
  switch (frequency) {
    case "weekly":
      return addDays(date, 7);
    case "monthly":
      /*
       * `addMonths` memakai tanggal 1 agar tidak melompati bulan pendek.
       * Untuk transaksi berulang, tanggal asli harus dipertahankan sedapat
       * mungkin — gaji tanggal 25 tetap tanggal 25.
       */
      return addMonthsKeepingDay(date, 1);
    case "yearly":
      return addMonthsKeepingDay(date, 12);
  }
}

/**
 * Menambah bulan sambil mempertahankan tanggal, dijepit ke akhir bulan.
 *
 * Contoh: 31 Januari + 1 bulan → 28/29 Februari (bukan 3 Maret).
 */
function addMonthsKeepingDay(iso: string, delta: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + delta, 1));

  // Hari terakhir bulan tujuan.
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();

  const clamped = Math.min(day, lastDay);
  const result = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), clamped),
  );

  return result.toISOString().slice(0, 10);
}

/** Satu kejadian yang harus dibuat. */
export type Occurrence = {
  rule: RecurringRule;
  /** Tanggal transaksi yang akan dibuat. */
  occurredAt: string;
};

/**
 * Menghitung kejadian yang sudah jatuh tempo.
 *
 * **Tidak mengubah apa pun.** Pemanggil yang memutuskan kapan menulis, supaya
 * fungsi ini bisa diuji tanpa menyentuh penyimpanan.
 *
 * @param rules aturan milik satu ruang.
 * @param today tanggal acuan (ISO).
 * @param maxCatchUp batas periode tertinggal per aturan.
 */
export function dueOccurrences(
  rules: RecurringRule[],
  today: string = todayISO(),
  maxCatchUp: number = MAX_CATCH_UP,
): Occurrence[] {
  const result: Occurrence[] = [];

  for (const rule of rules) {
    if (!rule.active) continue;
    if (rule.endAt && rule.nextAt > rule.endAt) continue;

    let next = rule.nextAt;
    let count = 0;

    while (next <= today && count < maxCatchUp) {
      // Aturan yang punya `endAt` berhenti di tanggal itu.
      if (rule.endAt && next > rule.endAt) break;

      result.push({ rule, occurredAt: next });
      next = advance(next, rule.frequency);
      count += 1;
    }
  }

  return result;
}

/**
 * Menghitung `nextAt` baru setelah sejumlah kejadian dibuat.
 *
 * Dipisah dari `dueOccurrences` agar pemanggil bisa memakai hasil yang sama
 * untuk membuat transaksi **dan** memajukan jadwal, tanpa menghitung dua kali.
 */
export function nextAfter(
  rule: RecurringRule,
  createdCount: number,
): string {
  let next = rule.nextAt;
  for (let index = 0; index < createdCount; index += 1) {
    next = advance(next, rule.frequency);
  }
  return next;
}

/**
 * Meringkas aturan untuk ditampilkan.
 *
 * Menjelaskan kapan transaksi berikutnya dan berapa lama lagi — dua hal yang
 * paling ingin diketahui pengguna.
 */
export function describeRule(rule: RecurringRule, today: string = todayISO()): {
  frequencyLabel: string;
  nextLabel: string;
  overdue: boolean;
} {
  const frequencyLabel =
    rule.frequency === "weekly"
      ? "mingguan"
      : rule.frequency === "monthly"
        ? "bulanan"
        : "tahunan";

  const overdue = rule.active && rule.nextAt <= today;

  return {
    frequencyLabel,
    nextLabel: rule.nextAt,
    overdue,
  };
}

/**
 * Membuat transaksi untuk aturan yang jatuh tempo, langsung pada store.
 *
 * Dipisah dari server action supaya dashboard bisa memanggilnya saat render
 * tanpa melewati lapisan action. **Idempoten**: `nextAt` dimajukan setiap kali
 * transaksi dibuat, jadi memanggil berulang tidak menghasilkan duplikat.
 *
 * Mengembalikan jumlah transaksi yang dibuat.
 */
export function applyDueRules(
  store: {
    recurringRules: RecurringRule[];
    transactions: Array<Record<string, unknown>>;
    /** Rujukan yang masih ada, untuk menyaring aturan yang sudah tidak sah. */
    accounts?: Array<{ id: string; archived?: boolean }>;
    categories?: Array<{ id: string; archived?: boolean }>;
  },
  workspaceId: string,
  today: string,
  createId: (prefix: string) => string,
  maxPerRun = 20,
): number {
  /*
   * Hanya akun dan kategori yang **belum diarsipkan**.
   *
   * Akun bisa diarsipkan setelah aturannya dimatikan, lalu aturannya
   * diaktifkan kembali. Tanpa penyaringan ini, aturan itu membuat transaksi
   * yang merujuk akun terarsip — transaksi tersebut tidak masuk hitungan saldo
   * mana pun dan muncul tanpa nama akun.
   */
  const accountIds = store.accounts
    ? new Set(
        store.accounts.filter((item) => !item.archived).map((item) => item.id),
      )
    : null;
  const categoryIds = store.categories
    ? new Set(
        store.categories.filter((item) => !item.archived).map((item) => item.id),
      )
    : null;

  /*
   * Sabuk pengaman terakhir.
   *
   * Meskipun aksi hapus/arsip sudah mencegah rujukan hilang, data dari versi
   * lama bisa saja tidak konsisten. Aturan yang akun atau kategorinya sudah
   * tidak ada dilewati — lebih baik transaksi tidak dibuat daripada membuat
   * transaksi yang tidak masuk hitungan saldo mana pun.
   */
  const rules = store.recurringRules.filter((rule) => {
    if (rule.workspaceId !== workspaceId) return false;
    if (accountIds && !accountIds.has(rule.accountId)) return false;
    if (rule.toAccountId && accountIds && !accountIds.has(rule.toAccountId)) return false;
    if (rule.categoryId && categoryIds && !categoryIds.has(rule.categoryId)) return false;
    return true;
  });

  const due = dueOccurrences(rules, today);

  if (due.length === 0) return 0;

  const selected = due.slice(0, maxPerRun);
  const countByRule = new Map<string, number>();

  for (const occurrence of selected) {
    const rule = occurrence.rule;

    store.transactions.push({
      id: createId("t"),
      workspaceId,
      recordedByProfileId: rule.recordedByProfileId,
      type: rule.type,
      amount: rule.amount,
      occurredAt: occurrence.occurredAt,
      description: rule.description,
      accountId: rule.accountId,
      toAccountId: rule.toAccountId,
      categoryId: rule.categoryId,
      memberId: rule.memberId,
      visibility: rule.visibility,
      recurringRuleId: rule.id,
    });

    countByRule.set(rule.id, (countByRule.get(rule.id) ?? 0) + 1);
  }

  for (const [ruleId, count] of countByRule) {
    const rule = store.recurringRules.find((item) => item.id === ruleId);
    if (rule) rule.nextAt = nextAfter(rule, count);
  }

  return selected.length;
}
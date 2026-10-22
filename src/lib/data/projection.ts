import { addMonths, todayISO } from "@/lib/format";
import type { Bill, RecurringRule } from "@/lib/data/types";

/**
 * Proyeksi arus kas beberapa bulan ke depan.
 *
 * ## Kenapa perlu
 *
 * Laporan yang ada menjawab "berapa yang sudah terjadi". Yang tidak terjawab:
 * "apakah bulan depan saya cukup?" — pertanyaan yang sebenarnya paling
 * menentukan keputusan.
 *
 * ## Sumber angka
 *
 * Proyeksi dibangun dari tiga hal yang **sudah diketahui**, bukan tebakan:
 *
 * 1. **Transaksi berulang** — gaji, langganan, cicilan.
 * 2. **Tagihan aktif** — listrik, air, internet, dengan jadwalnya.
 * 3. **Rata-rata pengeluaran harian** — dari riwayat, untuk hal yang tidak
 *    terjadwal seperti belanja dan transportasi.
 *
 * ## Yang sengaja TIDAK dilakukan
 *
 * - Tidak memakai model statistik atau pembelajaran mesin. Dengan data
 *   sebulan-dua, model seperti itu hanya menambah keyakinan palsu.
 * - Tidak memprediksi pemasukan tak tetap (bonus, penjualan). Proyeksi hanya
 *   memakai pemasukan yang benar-benar berulang.
 * - Tidak menampilkan satu angka tunggal. Selalu disertai asal-usulnya, supaya
 *   pengguna bisa menilai sendiri.
 */

export type ProjectionMonth = {
  /** `YYYY-MM`. */
  month: string;
  /** Pemasukan yang dijadwalkan. */
  income: number;
  /** Pengeluaran terjadwal (berulang + tagihan). */
  scheduledExpense: number;
  /** Perkiraan pengeluaran tak terjadwal. */
  estimatedExpense: number;
  /** Total pengeluaran. */
  totalExpense: number;
  /** Arus kas bersih bulan itu. */
  net: number;
  /** Saldo kumulatif bila proyeksi berjalan sesuai perkiraan. */
  runningBalance: number;
  /** Rincian yang membentuk angka di atas. */
  items: ProjectionItem[];
};

export type ProjectionItem = {
  label: string;
  amount: number;
  kind: "income" | "expense";
  source: "recurring" | "bill" | "estimate";
};

export type ProjectionInput = {
  /** Saldo awal (semua akun aktif). */
  openingBalance: number;
  /** Bulan mulai, `YYYY-MM`. */
  startMonth: string;
  /** Jumlah bulan yang diproyeksikan. */
  months: number;
  rules: RecurringRule[];
  bills: Bill[];
  /**
   * Rata-rata pengeluaran tak terjadwal per bulan, dihitung pemanggil dari
   * riwayat. Nol berarti tidak ada perkiraan.
   */
  averageUnplannedExpense: number;
  /**
   * Rata-rata pemasukan historis per bulan.
   *
   * Dipakai **hanya bila** tidak ada satu pun aturan pemasukan berulang.
   * Tanpa ini, pengguna yang mencatat gaji sebagai transaksi biasa akan melihat
   * proyeksi dengan pemasukan Rp0 — angka yang jelas salah dan membuat seluruh
   * proyeksi tidak berguna.
   */
  averageHistoricalIncome?: number;
};

/**
 * Menghitung proyeksi.
 *
 * Fungsi murni: tidak membaca penyimpanan dan tidak mengubah apa pun, supaya
 * bisa diuji dengan data buatan.
 */
export function projectCashFlow(input: ProjectionInput): ProjectionMonth[] {
  const { openingBalance, startMonth, months } = input;

  if (months <= 0) return [];

  const result: ProjectionMonth[] = [];
  let running = openingBalance;

  for (let offset = 0; offset < months; offset += 1) {
    const month = addMonths(`${startMonth}-01`, offset).slice(0, 7);
    const items: ProjectionItem[] = [];

    let income = 0;
    let scheduledExpense = 0;

    /* --------------------------- transaksi berulang -------------------------- */

    for (const rule of input.rules) {
      if (!rule.active) continue;

      const occurrences = occurrencesInMonth(rule, month);
      if (occurrences === 0) continue;

      const amount = rule.amount * occurrences;

      if (rule.type === "income") {
        income += amount;
        items.push({
          label: rule.description,
          amount,
          kind: "income",
          source: "recurring",
        });
      } else if (rule.type === "expense") {
        scheduledExpense += amount;
        items.push({
          label: rule.description,
          amount,
          kind: "expense",
          source: "recurring",
        });
      }
      // Transfer tidak mengubah total kekayaan, jadi tidak dihitung.
    }

    /* -------------------------------- tagihan -------------------------------- */

    for (const bill of input.bills) {
      if (bill.status !== "active") continue;

      const occurrences = billOccurrencesInMonth(bill, month);
      if (occurrences === 0) continue;

      const amount = bill.amount * occurrences;
      scheduledExpense += amount;
      items.push({
        label: bill.name,
        amount,
        kind: "expense",
        source: "bill",
      });
    }

    /* ----------------------- pemasukan tanpa aturan ------------------------- */

    /*
     * Bila tidak ada aturan pemasukan berulang, pakai rata-rata historis.
     *
     * Ini pilihan yang disengaja: menampilkan Rp0 akan membuat proyeksi
     * terlihat seolah uang akan habis, padahal pengguna memang mencatat gaji
     * sebagai transaksi biasa. Angka perkiraan yang jujur lebih berguna
     * daripada nol yang menyesatkan.
     */
    let estimatedIncome = 0;
    if (income === 0 && (input.averageHistoricalIncome ?? 0) > 0) {
      estimatedIncome = Math.max(Math.round(input.averageHistoricalIncome!), 0);
      income = estimatedIncome;
      items.push({
        label: "Perkiraan pemasukan (rata-rata 3 bulan)",
        amount: estimatedIncome,
        kind: "income",
        source: "estimate",
      });
    }

    /* --------------------------- perkiraan tak tetap -------------------------- */

    /*
     * Bulan berjalan biasanya belum penuh, jadi perkiraan penuh akan
     * melebih-lebihkan. Pemanggil yang menyesuaikan; di sini dipakai apa
     * adanya agar fungsi tetap murni.
     */
    const estimatedExpense = Math.max(Math.round(input.averageUnplannedExpense), 0);

    if (estimatedExpense > 0) {
      items.push({
        label: "Perkiraan pengeluaran harian",
        amount: estimatedExpense,
        kind: "expense",
        source: "estimate",
      });
    }

    const totalExpense = scheduledExpense + estimatedExpense;
    const net = income - totalExpense;
    running += net;

    result.push({
      month,
      income,
      scheduledExpense,
      estimatedExpense,
      totalExpense,
      net,
      runningBalance: running,
      items,
    });
  }

  return result;
}

/**
 * Berapa kali aturan berulang jatuh di sebuah bulan.
 *
 * Mingguan bisa 4–5 kali; bulanan dan tahunan paling banyak satu kali.
 */
export function occurrencesInMonth(rule: RecurringRule, month: string): number {
  if (rule.frequency === "monthly" || rule.frequency === "yearly") {
    // Bulan sebelum `nextAt` tidak mungkin punya kejadian.
    if (rule.nextAt.slice(0, 7) > month) return 0;
    if (rule.endAt && rule.endAt.slice(0, 7) < month) return 0;

    if (rule.frequency === "yearly") {
      /*
       * Tahunan berulang setiap 12 bulan dari `nextAt`, bukan hanya di bulan
       * yang sama dengan `nextAt`. Tanpa perhitungan selisih bulan, proyeksi
       * tahun depan akan kehilangan kejadiannya — padahal justru itu yang
       * ingin diketahui pengguna.
       */
      const diff = monthsBetween(rule.nextAt.slice(0, 7), month);
      return diff >= 0 && diff % 12 === 0 ? 1 : 0;
    }
    return 1;
  }

  /* -------------------------------- mingguan ------------------------------- */

  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const nextDay = Number(rule.nextAt.slice(8, 10));

  if (!Number.isFinite(nextDay)) return 0;

  let count = 0;
  for (let day = nextDay; day <= daysInMonth; day += 7) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    if (date < rule.nextAt) continue;
    if (rule.endAt && date > rule.endAt) break;
    count += 1;
  }

  return count;
}

/**
 * Berapa kali tagihan jatuh di sebuah bulan.
 *
 * Memakai `nextDueDate` sebagai acuan, sama seperti aturan berulang.
 */
export function billOccurrencesInMonth(bill: Bill, month: string): number {
  if (bill.nextDueDate.slice(0, 7) > month) return 0;

  switch (bill.frequency) {
    case "weekly":
      return 4; // perkiraan; tagihan mingguan jarang, dan 4 cukup akurat
    case "monthly":
      return 1;
    case "quarterly": {
      // Setiap tiga bulan sejak jatuh tempo berikutnya.
      const start = bill.nextDueDate.slice(0, 7);
      return monthsBetween(start, month) % 3 === 0 ? 1 : 0;
    }
    case "semiannual": {
      const start = bill.nextDueDate.slice(0, 7);
      return monthsBetween(start, month) % 6 === 0 ? 1 : 0;
    }
    case "yearly": {
      const start = bill.nextDueDate.slice(0, 7);
      return monthsBetween(start, month) % 12 === 0 ? 1 : 0;
    }
    default:
      /*
       * Frekuensi baru di masa depan tidak boleh membuat fungsi ini melempar.
       * Mengembalikan 0 lebih aman daripada menggagalkan seluruh proyeksi.
       */
      return 0;
  }
}

/** Selisih bulan antara dua `YYYY-MM`. */
function monthsBetween(from: string, to: string): number {
  const [fromYear, fromMonth] = from.split("-").map(Number);
  const [toYear, toMonth] = to.split("-").map(Number);
  return (toYear - fromYear) * 12 + (toMonth - fromMonth);
}

/**
 * Ringkasan proyeksi: bulan terendah dan apakah ada bulan yang minus.
 *
 * Dipakai untuk memberi peringatan di UI. Menampilkan grafik saja tidak cukup
 * — pengguna perlu tahu **kapan** dan **apakah** uangnya akan habis.
 */
export function projectionSummary(months: ProjectionMonth[]): {
  lowestMonth: string | null;
  lowestBalance: number;
  hasShortfall: boolean;
  firstShortfallMonth: string | null;
  averageNet: number;
} {
  if (months.length === 0) {
    return {
      lowestMonth: null,
      lowestBalance: 0,
      hasShortfall: false,
      firstShortfallMonth: null,
      averageNet: 0,
    };
  }

  let lowest = months[0];
  let firstShortfall: string | null = null;

  for (const month of months) {
    if (month.runningBalance < lowest.runningBalance) lowest = month;
    if (!firstShortfall && month.runningBalance < 0) firstShortfall = month.month;
  }

  const averageNet = Math.round(
    months.reduce((sum, month) => sum + month.net, 0) / months.length,
  );

  return {
    lowestMonth: lowest.month,
    lowestBalance: lowest.runningBalance,
    hasShortfall: firstShortfall !== null,
    firstShortfallMonth: firstShortfall,
    averageNet,
  };
}

/** Bulan berjalan dalam bentuk `YYYY-MM`. */
export function currentMonthKey(): string {
  return todayISO().slice(0, 7);
}

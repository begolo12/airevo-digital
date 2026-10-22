/**
 * Simulasi pelunasan utang.
 *
 * ## Kenapa ini ada
 *
 * Daftar utang memberi tahu *berapa* sisa utang, tetapi tidak menjawab
 * pertanyaan yang sebenarnya ingin diketahui orang: **"kalau saya bayar
 * sekian per bulan, lunas kapan?"** dan **"berapa yang saya hemat kalau
 * menambah bayaran?"**
 *
 * ## Model bunga
 *
 * Bunga dihitung **per bulan** dari sisa pokok (`remaining`), bukan dari
 * pokok awal. Ini cara bank menghitung untuk kredit konsumtif di Indonesia.
 *
 * `interestRate` disimpan dalam persen per tahun (mis. `12` berarti 12%/tahun).
 * Angka ini opsional — utang tanpa bunga (pinjam keluarga) tetap bisa
 * disimulasikan.
 *
 * ## Batasan yang disengaja
 *
 * - Tidak ada denda keterlambatan
 * - Tidak ada biaya admin atau provisi
 * - Bunga tetap sepanjang masa (tidak mengikuti suku bunga mengambang)
 *
 * Untuk perencanaan keluarga, tiga hal itu tidak mengubah kesimpulan; yang
 * penting adalah arah dan besaran, bukan angka sampai rupiah terakhir.
 */

export type PayoffInput = {
  /** Sisa pokok saat ini. */
  remaining: number;
  /** Bunga per tahun dalam persen. Kosongkan untuk tanpa bunga. */
  annualRatePercent?: number;
  /** Kemampuan membayar per bulan. */
  monthlyPayment: number;
};

export type PayoffMonth = {
  /** Urutan bulan, dimulai dari 1. */
  month: number;
  /** Sisa pokok di awal bulan. */
  openingBalance: number;
  /** Bagian yang masuk ke bunga. */
  interest: number;
  /** Bagian yang mengurangi pokok. */
  principal: number;
  /** Sisa pokok di akhir bulan. */
  closingBalance: number;
};

export type PayoffResult =
  | {
      ok: true;
      /** Berapa bulan sampai lunas. */
      months: number;
      /** Total bunga yang dibayar. */
      totalInterest: number;
      /** Total uang yang keluar (pokok + bunga). */
      totalPaid: number;
      /** Rincian per bulan, dibatasi `maxMonths` untuk ukuran respons. */
      schedule: PayoffMonth[];
      /** Apakah jadwalnya dipotong karena melebihi batas. */
      truncated: boolean;
    }
  | {
      ok: false;
      /** Alasan simulasi tidak bisa dijalankan. */
      reason: "paid" | "no-payment" | "never-paid-off" | "invalid";
      message: string;
    };

/** Batas aman agar simulasi tidak berjalan tanpa akhir. */
const MAX_MONTHS = 600; // 50 tahun

/**
 * Menjalankan simulasi.
 *
 * @param input sisa pokok, bunga, dan kemampuan bayar per bulan.
 * @param maxMonths jumlah bulan maksimum yang dikembalikan di `schedule`.
 */
export function simulatePayoff(input: PayoffInput, maxMonths = 360): PayoffResult {
  const { remaining, monthlyPayment } = input;
  const annualRate = input.annualRatePercent ?? 0;

  if (!Number.isFinite(remaining) || remaining < 0) {
    return { ok: false, reason: "invalid", message: "Sisa utang tidak valid." };
  }
  if (!Number.isFinite(annualRate) || annualRate < 0) {
    return { ok: false, reason: "invalid", message: "Bunga tidak valid." };
  }
  if (remaining === 0) {
    return { ok: false, reason: "paid", message: "Utang ini sudah lunas." };
  }
  if (!Number.isFinite(monthlyPayment) || monthlyPayment <= 0) {
    return {
      ok: false,
      reason: "no-payment",
      message: "Isi kemampuan membayar per bulan.",
    };
  }

  const monthlyRate = annualRate / 100 / 12;

  /*
   * Bunga bulan pertama sudah melebihi bayaran.
   *
   * Tanpa pemeriksaan ini, sisa pokok tidak pernah turun dan perulangan
   * berjalan sampai batas — pengguna hanya melihat "tidak pernah lunas" tanpa
   * tahu sebabnya. Menjelaskan sebabnya jauh lebih berguna.
   */
  const firstInterest = remaining * monthlyRate;
  if (monthlyPayment <= firstInterest) {
    return {
      ok: false,
      reason: "never-paid-off",
      message: `Bayaran ${Math.round(monthlyPayment)} tidak menutup bunga bulan pertama (${Math.round(
        firstInterest,
      )}). Tambah bayaran minimal ${Math.round(firstInterest) + 1} per bulan.`,
    };
  }

  const schedule: PayoffMonth[] = [];
  let balance = remaining;
  let totalInterest = 0;
  let month = 0;

  while (balance > 0 && month < MAX_MONTHS) {
    month += 1;

    const interest = balance * monthlyRate;
    // Bayaran terakhir tidak perlu melebihi sisa pokok + bunga.
    const payment = Math.min(monthlyPayment, balance + interest);
    const principal = payment - interest;

    totalInterest += interest;
    const closingBalance = Math.max(0, balance - principal);

    if (schedule.length < maxMonths) {
      schedule.push({
        month,
        openingBalance: Math.round(balance),
        interest: Math.round(interest),
        principal: Math.round(principal),
        closingBalance: Math.round(closingBalance),
      });
    }

    balance = closingBalance;
  }

  return {
    ok: true,
    months: month,
    totalInterest: Math.round(totalInterest),
    totalPaid: Math.round(remaining + totalInterest),
    schedule,
    truncated: month > maxMonths,
  };
}

/** Membandingkan dua skenario bayaran — dasar tombol "kalau saya tambah". */
export function comparePayoff(
  base: PayoffInput,
  extraMonthly: number,
): {
  base: PayoffResult;
  faster: PayoffResult;
  monthsSaved: number;
  interestSaved: number;
} {
  const fasterInput: PayoffInput = {
    ...base,
    monthlyPayment: base.monthlyPayment + extraMonthly,
  };

  const baseResult = simulatePayoff(base, 0);
  const fasterResult = simulatePayoff(fasterInput, 0);

  if (!baseResult.ok || !fasterResult.ok) {
    return {
      base: baseResult,
      faster: fasterResult,
      monthsSaved: 0,
      interestSaved: 0,
    };
  }

  return {
    base: baseResult,
    faster: fasterResult,
    monthsSaved: baseResult.months - fasterResult.months,
    interestSaved: baseResult.totalInterest - fasterResult.totalInterest,
  };
}

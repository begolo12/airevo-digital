import type { Member } from "@/lib/data/types";

/**
 * Membagi tagihan antar anggota keluarga.
 *
 * ## Masalah yang diselesaikan
 *
 * Tagihan rumah (listrik, air, internet) dibayar satu orang, tetapi dinikmati
 * semua. Tanpa pembagian, catatan keuangan keluarga hanya menunjukkan siapa
 * yang **membayar**, bukan siapa yang **menanggung** — dan itu membuat
 * pembagian beban terasa tidak adil tanpa ada yang bisa membuktikannya.
 *
 * ## Tiga cara membagi
 *
 * | Cara | Cocok untuk |
 * | --- | --- |
 * | `equal` | Tagihan rumah yang dinikmati bersama |
 * | `weighted` | Pembagian yang disepakati, mis. 60/40 |
 * | `custom` | Nominal tetap per orang, mis. SPP anak tertentu |
 *
 * ## Pembulatan
 *
 * Rupiah tidak punya sen, jadi pembagian rata jarang habis dibagi. Sisa
 * pembulatan diberikan ke anggota pertama, bukan dibuang — total bagian harus
 * **selalu** sama dengan jumlah tagihan. Tanpa aturan ini, laporan akan
 * selisih beberapa rupiah dan orang akan mempertanyakannya.
 */

export type SplitMode = "equal" | "weighted" | "custom";

export type SplitShare = {
  memberId: string;
  memberName: string;
  /** Bagian dalam rupiah. */
  amount: number;
  /** Persentase dari total, dibulatkan. */
  percent: number;
};

export type SplitInput = {
  total: number;
  mode: SplitMode;
  /** Anggota yang ikut menanggung, berurutan. */
  members: Member[];
  /**
   * Bobot untuk mode `weighted`, sejajar dengan `members`.
   * Diabaikan pada mode lain.
   */
  weights?: number[];
  /**
   * Nominal tetap untuk mode `custom`, sejajar dengan `members`.
   * Diabaikan pada mode lain.
   */
  amounts?: number[];
};

export type SplitResult =
  | { ok: true; shares: SplitShare[]; total: number }
  | { ok: false; message: string };

/**
 * Menghitung pembagian tagihan.
 *
 * Mengembalikan `ok: false` beserta alasannya bila masukan tidak masuk akal —
 * lebih baik menjelaskan daripada menghasilkan angka yang salah.
 */
export function splitBill(input: SplitInput): SplitResult {
  const { total, mode, members } = input;

  if (!Number.isFinite(total) || total <= 0) {
    return { ok: false, message: "Jumlah tagihan harus lebih dari nol." };
  }

  if (members.length === 0) {
    return { ok: false, message: "Pilih minimal satu anggota." };
  }

  const percentOf = (amount: number) =>
    total > 0 ? Math.round((amount / total) * 100) : 0;

  /* ------------------------------ rata ------------------------------ */

  if (mode === "equal") {
    const base = Math.floor(total / members.length);
    let remainder = total - base * members.length;

    const shares = members.map((member) => {
      /*
       * Sisa pembulatan diberikan satu rupiah per anggota dari awal, sampai
       * habis. Cara ini memastikan total bagian selalu sama dengan tagihan.
       */
      const extra = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder -= 1;

      return {
        memberId: member.id,
        memberName: member.name,
        amount: base + extra,
        percent: percentOf(base + extra),
      };
    });

    return { ok: true, shares, total };
  }

  /* ------------------------------ bobot ----------------------------- */

  if (mode === "weighted") {
    const weights = input.weights ?? [];

    if (weights.length !== members.length) {
      return { ok: false, message: "Jumlah bobot harus sama dengan jumlah anggota." };
    }
    if (weights.some((weight) => !Number.isFinite(weight) || weight < 0)) {
      return { ok: false, message: "Bobot tidak boleh negatif." };
    }

    const sum = weights.reduce((acc, weight) => acc + weight, 0);
    if (sum <= 0) {
      return { ok: false, message: "Total bobot harus lebih dari nol." };
    }

    // Hitung bagian mentah, lalu bagikan sisa pembulatan.
    const raw = weights.map((weight) => (total * weight) / sum);
    const floored = raw.map((value) => Math.floor(value));
    let remainder = total - floored.reduce((acc, value) => acc + value, 0);

    /*
     * Sisa diberikan ke yang bagian pecahannya paling besar (metode sisa
     * terbesar), supaya hasilnya sedekat mungkin dengan proporsi sebenarnya.
     */
    const order = raw
      .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
      .sort((a, b) => b.fraction - a.fraction);

    for (const entry of order) {
      if (remainder <= 0) break;
      floored[entry.index] += 1;
      remainder -= 1;
    }

    return {
      ok: true,
      shares: members.map((member, index) => ({
        memberId: member.id,
        memberName: member.name,
        amount: floored[index],
        percent: percentOf(floored[index]),
      })),
      total,
    };
  }

  /* ----------------------------- nominal ---------------------------- */

  const amounts = input.amounts ?? [];

  if (amounts.length !== members.length) {
    return { ok: false, message: "Jumlah nominal harus sama dengan jumlah anggota." };
  }
  if (amounts.some((amount) => !Number.isFinite(amount) || amount < 0)) {
    return { ok: false, message: "Nominal tidak boleh negatif." };
  }

  const sum = amounts.reduce((acc, amount) => acc + amount, 0);
  if (sum !== total) {
    return {
      ok: false,
      message: `Total bagian (${sum.toLocaleString("id-ID")}) harus sama dengan tagihan (${total.toLocaleString("id-ID")}).`,
    };
  }

  return {
    ok: true,
    shares: members.map((member, index) => ({
      memberId: member.id,
      memberName: member.name,
      amount: amounts[index],
      percent: percentOf(amounts[index]),
    })),
    total,
  };
}

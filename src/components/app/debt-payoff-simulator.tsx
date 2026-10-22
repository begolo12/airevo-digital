"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { cx } from "@/components/ui";
import { formatIDR } from "@/lib/format";
import { comparePayoff, simulatePayoff } from "@/lib/debt-payoff";

/**
 * Simulator pelunasan utang.
 *
 * Menjawab pertanyaan yang tidak dijawab daftar utang: **"kalau saya bayar
 * sekian per bulan, lunas kapan?"** dan **"berapa yang saya hemat kalau
 * menambah bayaran?"**
 *
 * Perhitungan berjalan di browser, bukan server action — hasilnya harus
 * berubah saat pengguna menggeser angka, tanpa menunggu jaringan. Fungsinya
 * murni (`src/lib/debt-payoff.ts`), jadi aman dijalankan di kedua sisi.
 */
export function DebtPayoffSimulator({
  debtId,
  name,
  remaining,
  interestRate,
  installmentAmount,
}: {
  debtId: string;
  name: string;
  remaining: number;
  interestRate?: number;
  installmentAmount?: number;
}) {
  const [open, setOpen] = useState(false);
  const [payment, setPayment] = useState(
    String(installmentAmount ?? Math.ceil(remaining / 12)),
  );
  const [extra, setExtra] = useState("0");

  const monthlyPayment = Number(payment);
  const extraPayment = Number(extra);

  const result = useMemo(
    () =>
      simulatePayoff({
        remaining,
        annualRatePercent: interestRate,
        monthlyPayment,
      }),
    [remaining, interestRate, monthlyPayment],
  );

  const comparison = useMemo(() => {
    if (extraPayment <= 0) return null;
    return comparePayoff(
      { remaining, annualRatePercent: interestRate, monthlyPayment },
      extraPayment,
    );
  }, [remaining, interestRate, monthlyPayment, extraPayment]);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-2.5 py-1 text-xs font-semibold text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink"
      >
        <Icon name="clock" size={12} />
        Simulasi pelunasan
        <Icon
          name="chevron-down"
          size={11}
          className={cx("transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div className="animate-rise mt-2 rounded-[10px] border border-line bg-paper-deep/40 p-3">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink-soft">
                Bayar per bulan
              </span>
              <input
                type="number"
                min={0}
                step={50000}
                value={payment}
                onChange={(event) => setPayment(event.target.value)}
                className="h-9 w-full rounded-[8px] border border-line-strong bg-card px-2.5 text-base tnum focus:border-ink focus:outline-none"
                aria-label={`Kemampuan membayar ${name} per bulan`}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink-soft">
                Tambahan (opsional)
              </span>
              <input
                type="number"
                min={0}
                step={50000}
                value={extra}
                onChange={(event) => setExtra(event.target.value)}
                className="h-9 w-full rounded-[8px] border border-line-strong bg-card px-2.5 text-base tnum focus:border-ink focus:outline-none"
                aria-label={`Tambahan bayaran ${name} per bulan`}
              />
            </label>
          </div>

          <div aria-live="polite" className="mt-3">
            {!result.ok ? (
              <p className="rounded-[8px] bg-butter/40 px-2.5 py-2 text-xs font-semibold text-ink">
                {result.message}
              </p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <Stat
                    label="Lunas dalam"
                    value={`${result.months} bln`}
                    hint={monthsToText(result.months)}
                  />
                  <Stat
                    label="Total bunga"
                    value={formatIDR(result.totalInterest)}
                    hint={
                      interestRate
                        ? `${interestRate}% / tahun`
                        : "tanpa bunga"
                    }
                  />
                  <Stat
                    label="Total bayar"
                    value={formatIDR(result.totalPaid)}
                    hint={`pokok ${formatIDR(remaining)}`}
                  />
                </div>

                {comparison && comparison.monthsSaved > 0 ? (
                  <div className="rounded-[8px] border border-mint-deep bg-mint/30 px-2.5 py-2">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-ink">
                      <Icon name="trend-down" size={13} />
                      Dengan tambahan {formatIDR(extraPayment)}/bulan
                    </p>
                    <p className="mt-1 text-xs text-ink-soft">
                      Lunas <strong>{comparison.monthsSaved} bulan lebih cepat</strong>{" "}
                      dan hemat bunga{" "}
                      <strong>{formatIDR(comparison.interestSaved)}</strong>.
                    </p>
                  </div>
                ) : null}

                {/* Rincian 6 bulan pertama: cukup untuk melihat arah. */}
                <details className="group">
                  <summary className="cursor-pointer text-xs font-semibold text-muted hover:text-ink">
                    Lihat rincian {Math.min(result.schedule.length, 6)} bulan pertama
                  </summary>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-line text-left text-muted">
                          <th scope="col" className="py-1 pr-2 font-semibold">Bln</th>
                          <th scope="col" className="py-1 pr-2 text-right font-semibold">Bunga</th>
                          <th scope="col" className="py-1 pr-2 text-right font-semibold">Pokok</th>
                          <th scope="col" className="py-1 text-right font-semibold">Sisa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.schedule.slice(0, 6).map((row) => (
                          <tr key={row.month} className="border-b border-line/50">
                            <td className="py-1 pr-2 tnum">{row.month}</td>
                            <td className="py-1 pr-2 text-right tnum text-muted">
                              {formatIDR(row.interest)}
                            </td>
                            <td className="py-1 pr-2 text-right tnum">
                              {formatIDR(row.principal)}
                            </td>
                            <td className="py-1 text-right tnum text-muted">
                              {formatIDR(row.closingBalance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </div>
            )}
          </div>

          <p className="mt-2 text-2xs text-muted">
            Bunga dihitung per bulan dari sisa pokok. Tanpa denda atau biaya admin.
          </p>
        </div>
      ) : null}

      {/* `debtId` dipakai sebagai kunci animasi saat daftar berubah urutan. */}
      <span className="hidden" data-debt={debtId} />
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[8px] bg-card px-2 py-1.5">
      <p className="text-2xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="text-sm font-black tnum">{value}</p>
      <p className="text-2xs text-muted">{hint}</p>
    </div>
  );
}

/** Mengubah jumlah bulan menjadi teks yang mudah dibaca. */
function monthsToText(months: number): string {
  if (months < 12) return `${months} bulan lagi`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (rest === 0) return `${years} tahun lagi`;
  return `${years} tahun ${rest} bulan`;
}

import { formatIDR, formatMonth } from "@/lib/format";

/**
 * Grafik arus kas 6 bulan.
 *
 * Memakai batang DOM, bukan SVG atau pustaka grafik: jumlah datanya kecil,
 * hasilnya tajam di semua kerapatan layar, dan teksnya tetap bisa dibaca
 * pembaca layar. `cashflowSeries()` sudah lama menghitung data ini tetapi
 * tidak pernah dirender — dashboard jadi punya lubang kosong di tengah.
 */
export function CashflowChart({
  series,
}: {
  series: Array<{ month: string; income: number; expense: number; net: number }>;
}) {
  if (series.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-muted">
        Belum ada data arus kas.
      </p>
    );
  }

  // Skala mengikuti nilai terbesar agar perbandingan antar-bulan terbaca jujur.
  const peak = Math.max(
    ...series.map((point) => Math.max(point.income, point.expense)),
    1,
  );

  const totalIncome = series.reduce((sum, point) => sum + point.income, 0);
  const totalExpense = series.reduce((sum, point) => sum + point.expense, 0);
  const totalNet = totalIncome - totalExpense;

  return (
    <div className="flex flex-col px-5 pb-4 pt-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs text-muted">
          Pemasukan vs pengeluaran, {series.length} bulan terakhir
        </p>
        <p
          className={`shrink-0 text-xs font-bold tnum ${
            totalNet >= 0 ? "text-positive" : "text-danger"
          }`}
        >
          {totalNet >= 0 ? "+" : "−"}
          {formatIDR(Math.abs(totalNet))} bersih
        </p>
      </div>

      {/*
        Tinggi area grafik dipatok, bukan `flex-1`. Dengan `flex-1`, kartu yang
        bertetangga dengan daftar panjang ikut memanjang dan grafiknya meluber
        keluar kartu. Tinggi tetap membuat grafik selalu utuh di kartu mana pun.

        Batang dibuat lebar secukupnya: sebelumnya dibatasi 10px di kolom ~90px
        sehingga tampak seperti serpihan. Bulan tanpa data tetap diberi garis
        dasar samar supaya kolomnya tidak terlihat hilang.
      */}
      <div className="mt-3 flex h-28 items-end justify-between gap-2 border-b border-line sm:gap-4">
        {series.map((point) => {
          const hasData = point.income > 0 || point.expense > 0;
          const incomeHeight = (point.income / peak) * 100;
          const expenseHeight = (point.expense / peak) * 100;

          return (
            <div
              key={point.month}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
              title={
                hasData
                  ? `${formatMonth(point.month)} · masuk ${formatIDR(point.income)} · keluar ${formatIDR(point.expense)}`
                  : `${formatMonth(point.month)} · belum ada catatan`
              }
            >
              <div className="flex h-full w-full items-end justify-center gap-1">
                {hasData ? (
                  <>
                    <div
                      className="w-full max-w-[18px] rounded-t-[4px] bg-mint-deep transition-[height]"
                      style={{ height: `${Math.max(incomeHeight, 2)}%` }}
                    />
                    <div
                      className="w-full max-w-[18px] rounded-t-[4px] bg-butter-deep transition-[height]"
                      style={{ height: `${Math.max(expenseHeight, 2)}%` }}
                    />
                  </>
                ) : (
                  <div className="h-[3px] w-full max-w-[18px] rounded-full bg-line-strong/70" />
                )}
              </div>
              <span className="mt-2 shrink-0 text-2xs font-semibold uppercase tracking-wide text-muted">
                {point.month.slice(5, 7) === "01"
                  ? point.month.slice(0, 4)
                  : formatMonth(point.month).slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <li className="flex items-center gap-1.5 text-xs text-muted">
            <span aria-hidden="true" className="h-2 w-2 rounded-sm bg-mint-deep" />
            Pemasukan{" "}
            <strong className="font-bold text-ink tnum">{formatIDR(totalIncome)}</strong>
          </li>
          <li className="flex items-center gap-1.5 text-xs text-muted">
            <span aria-hidden="true" className="h-2 w-2 rounded-sm bg-butter-deep" />
            Pengeluaran{" "}
            <strong className="font-bold text-ink tnum">{formatIDR(totalExpense)}</strong>
          </li>
        </ul>
        <p className="text-xs text-muted">
          Rata-rata{" "}
          <strong className="font-bold text-ink tnum">
            {formatIDR(Math.round(totalExpense / series.length))}
          </strong>
          /bulan
        </p>
      </div>
    </div>
  );
}

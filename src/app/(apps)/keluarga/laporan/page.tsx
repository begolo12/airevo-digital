import { PageHeader, Card, CardHeader, StatCard, ProgressBar } from "@/components/app/ui";
import {
  assetTotals,
  budgetRows,
  budgetTotals,
  debtTotals,
  expenseByCategory,
  goalRows,
  monthSummary,
  netWorth,
} from "@/lib/data/queries";
import { requireViewer } from "@/lib/session";
import {
  addMonths,
  currentMonth,
  formatIDR,
  formatMonth,
  lastMonths,
} from "@/lib/format";

export const metadata = { title: "Laporan" };

export default async function LaporanPage() {
  const viewer = await requireViewer();
  const month = currentMonth();
  const summary = monthSummary(month, viewer);
  const previous = monthSummary(addMonths(month, -1), viewer);
  const categories = expenseByCategory(month, viewer);
  const series = lastMonths(12).map((m) => monthSummary(m, viewer));
  const budgets = budgetRows(month, viewer);
  const totals = budgetTotals(month, viewer);
  const goals = goalRows(viewer.workspaceId);
  const worth = netWorth(viewer.workspaceId);
  const assets = assetTotals(viewer.workspaceId);
  const debts = debtTotals(viewer.workspaceId);

  const maxExpense = Math.max(...series.map((s) => s.expense), 1);
  const savingsRate = summary.income > 0 ? Math.round((summary.net / summary.income) * 100) : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Laporan"
        title={`Laporan ${formatMonth(month)}`}
        description="Ringkasan arus kas, kepatuhan anggaran, progres tujuan, dan kekayaan bersih."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pemasukan" value={formatIDR(summary.income)} tone="mint" />
        <StatCard label="Pengeluaran" value={formatIDR(summary.expense)} tone="butter" />
        <StatCard
          label="Arus kas bersih"
          value={formatIDR(summary.net)}
          tone={summary.net >= 0 ? "ink" : "tomato"}
          hint={`rasio tabungan ${savingsRate}%`}
        />
        <StatCard label="Kekayaan bersih" value={formatIDR(worth.total)} tone="paper" hint="saldo + tujuan" />
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader title="Tren 12 bulan" hint="Pengeluaran per bulan" />
          <div className="px-5 py-5">
            <div className="flex h-40 items-end gap-1.5">
              {series.map((point) => (
                <div
                  key={point.month}
                  /*
                   * Kolom harus `h-full` agar batang di dalamnya bisa memakai
                   * tinggi persen.
                   *
                   * Tanpa ini, induk kolom tingginya mengikuti isinya — dan
                   * isinya adalah batang yang tingginya persen dari induk.
                   * Persentase dari tinggi yang belum ditentukan menghasilkan
                   * nol, sehingga semua batang hilang meski label bulannya
                   * tampil.
                   */
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                >
                  <div
                    className="w-full rounded-t-[3px] bg-tomato/70 transition-[height]"
                    style={{
                      height: `${Math.max((point.expense / maxExpense) * 100, 2)}%`,
                    }}
                    title={`${formatMonth(point.month)}: ${formatIDR(point.expense)}`}
                    aria-label={`${formatMonth(point.month)}: ${formatIDR(point.expense)}`}
                    role="img"
                  />
                  <span className="text-2xs text-muted">{point.month.slice(5)}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted">
              Bulan tertinggi:{" "}
              {formatMonth(series.reduce((a, b) => (b.expense > a.expense ? b : a)).month)} dengan{" "}
              {formatIDR(Math.max(...series.map((s) => s.expense)))}.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Perbandingan bulan" hint={`${formatMonth(addMonths(month, -1))} → ${formatMonth(month)}`} />
          <ul className="divide-y divide-line">
            {[
              { label: "Pemasukan", now: summary.income, before: previous.income },
              { label: "Pengeluaran", now: summary.expense, before: previous.expense },
              { label: "Arus kas bersih", now: summary.net, before: previous.net },
            ].map((row) => {
              const delta = row.before !== 0 ? Math.round(((row.now - row.before) / Math.abs(row.before)) * 100) : 0;
              return (
                <li key={row.label} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <span className="text-sm font-semibold">{row.label}</span>
                  <div className="text-right">
                    <p className="text-sm tnum font-semibold">{formatIDR(row.now)}</p>
                    <p className={`text-xs tnum ${delta >= 0 ? "text-positive" : "text-danger"}`}>
                      {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% vs bulan lalu
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Pengeluaran per kategori" hint={formatMonth(month)} />
          <ul className="divide-y divide-line">
            {categories.length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-muted">Belum ada data.</li>
            ) : (
              categories.map((row) => (
                <li key={row.categoryId} className="px-5 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-semibold">{row.category?.name ?? "Tanpa kategori"}</span>
                    <span className="text-xs tnum text-muted">
                      {formatIDR(row.amount)} · {row.ratio}%
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <ProgressBar ratio={row.ratio} tone="butter" label={row.category?.name} />
                  </div>
                </li>
              ))
            )}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Kepatuhan anggaran"
            hint={`${totals.ratio}% dari total rencana terpakai`}
          />
          <ul className="divide-y divide-line">
            {budgets.length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-muted">Belum ada anggaran.</li>
            ) : (
              budgets.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{row.category.name}</p>
                    <p className="text-xs text-muted">
                      {formatIDR(row.used)} / {formatIDR(row.amount)}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold tnum ${
                      row.status === "over"
                        ? "text-tomato-ink"
                        : row.status === "warning"
                          ? "text-warning"
                          : "text-positive"
                    }`}
                  >
                    {row.ratio}%
                  </span>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader title="Progres tujuan" hint="Semua tujuan aktif" />
        <ul className="divide-y divide-line">
          {goals.map((goal) => (
            <li key={goal.id} className="px-5 py-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold">{goal.name}</span>
                <span className="text-xs tnum text-muted">
                  {formatIDR(goal.savedAmount)} / {formatIDR(goal.targetAmount)}
                </span>
              </div>
              <div className="mt-2">
                <ProgressBar ratio={goal.progress} tone="sky" label={goal.name} />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Kekayaan bersih" hint="Aset + kas + piutang − utang" />
        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <p className="label-eyebrow">Saldo akun</p>
            <p className="mt-1 text-lg font-black tnum">{formatIDR(worth.cash)}</p>
          </div>
          <div>
            <p className="label-eyebrow">Nilai aset</p>
            <p className="mt-1 text-lg font-black tnum">{formatIDR(assets.total)}</p>
          </div>
          <div>
            <p className="label-eyebrow">Piutang</p>
            <p className="mt-1 text-lg font-black tnum text-positive">{formatIDR(debts.receivable)}</p>
          </div>
          <div>
            <p className="label-eyebrow">Utang</p>
            <p className="mt-1 text-lg font-black tnum text-danger">−{formatIDR(debts.payable)}</p>
          </div>
          <div>
            <p className="label-eyebrow">Total</p>
            <p className="mt-1 text-lg font-black tnum">{formatIDR(worth.total)}</p>
          </div>
        </div>
        <div className="border-t border-line px-5 py-3">
          <p className="text-xs text-muted">
            Dana tujuan ({formatIDR(worth.goalsSaved)}) tidak ditambahkan terpisah karena
            sudah berada di dalam saldo akun.
          </p>
        </div>
      </Card>

      <p className="text-xs text-muted">
        Ekspor CSV dan cetak PDF masuk tahap berikutnya. Untuk sekarang, angka di halaman
        ini adalah sumber kebenaran.
      </p>
    </div>
  );
}

import Link from "next/link";
import { PageHeader, StatCard, Card, CardHeader, ProgressBar } from "@/components/app/ui";
import { CashflowChart } from "@/components/app/cashflow-chart";
import {
  cashflowSeries,
  expenseByCategory,
  listAccounts,
  monthSummary,
  totalBalance,
} from "@/lib/data/queries";
import { currentMonth, formatIDR, formatMonth } from "@/lib/format";
import { swatch } from "@/lib/colors";
import { requireViewer } from "@/lib/session";

export const metadata = { title: "Keuangan" };

export default async function KeuanganPage() {
  const viewer = await requireViewer();
  const month = currentMonth();
  const summary = monthSummary(month, viewer);
  const accounts = listAccounts(viewer.workspaceId);
  const categories = expenseByCategory(month, viewer).slice(0, 6);
  const series = cashflowSeries(6, viewer);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Uang"
        title="Keuangan keluarga"
        description={`Ringkasan ${formatMonth(month)} dari transaksi yang belum dibatalkan.`}
        actions={
          <Link
            href="/keluarga/keuangan/transaksi"
            className="inline-flex h-10 items-center rounded-full border border-emphasis bg-emphasis px-4 text-sm font-semibold text-on-emphasis hover:bg-ink-soft"
          >
            Catat transaksi
          </Link>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total saldo"
          value={formatIDR(totalBalance(viewer.workspaceId))}
          tone="ink"
          hint={`${accounts.length} akun`}
        />
        <StatCard label="Pemasukan" value={formatIDR(summary.income)} tone="mint" hint={formatMonth(month)} />
        <StatCard label="Pengeluaran" value={formatIDR(summary.expense)} tone="butter" hint={formatMonth(month)} />
        <StatCard
          label="Arus kas bersih"
          value={formatIDR(summary.net)}
          tone={summary.net >= 0 ? "paper" : "tomato"}
          hint={summary.net >= 0 ? "surplus" : "defisit"}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader
            title="Arus kas"
            hint="Enam bulan terakhir"
            action={
              <Link
                href="/keluarga/laporan"
                className="text-xs font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-tomato"
              >
                Laporan
              </Link>
            }
          />
          <CashflowChart series={series} />
        </Card>

        <Card>
          <CardHeader
            title="Pengeluaran per kategori"
            hint={formatMonth(month)}
            action={
              <Link
                href="/keluarga/keuangan/kategori"
                className="text-xs font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-tomato"
              >
                Kategori
              </Link>
            }
          />
          <ul className="divide-y divide-line">
            {categories.length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-muted">
                Belum ada pengeluaran bulan ini.
              </li>
            ) : (
              categories.map((row) => (
                <li key={row.categoryId} className="px-5 py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-semibold">
                      {row.category?.name ?? "Tanpa kategori"}
                    </span>
                    <span className="shrink-0 text-xs tnum text-muted">
                      {formatIDR(row.amount)}
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
      </div>

      <Card>
        <CardHeader
          title="Saldo akun"
          hint={`${accounts.length} akun aktif`}
          action={
            <Link
              href="/keluarga/keuangan/akun"
              className="text-xs font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-tomato"
            >
              Kelola akun
            </Link>
          }
        />
        <ul className="divide-y divide-line">
          {accounts.map((account) => (
            <li key={account.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden="true"
                  className={`h-8 w-8 shrink-0 rounded-[9px] border border-line ${swatch(account.color)}`}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{account.name}</p>
                  <p className="text-xs capitalize text-muted">{account.type}</p>
                </div>
              </div>
              <span className="shrink-0 text-sm tnum font-semibold">
                {formatIDR(account.balance)}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

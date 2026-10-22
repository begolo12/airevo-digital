import Link from "next/link";
import { PageHeader, Card, CardHeader, ProgressBar, StatCard } from "@/components/app/ui";
import { Badge, Field, inputClass, selectClass } from "@/components/ui";
import { ActionForm, ActionButton } from "@/components/ui/action-form";
import { removeBudget, setBudget } from "@/lib/data/actions";
import { budgetRows, budgetTotals, categoryTrend, listCategories } from "@/lib/data/queries";
import { Sparkline } from "@/components/app/viz";
import { requireViewer } from "@/lib/session";
import { addMonths, currentMonth, formatIDR, formatMonth } from "@/lib/format";

export const metadata = { title: "Anggaran" };

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function AnggaranPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  /*
   * Viewer wajib: halaman ini menampilkan anggaran sebuah ruang data.
   *
   * Tanpa viewer, `budgetRows` mengembalikan anggaran dari SEMUA ruang dan
   * `categoryTrend` menjumlahkan pengeluaran seluruh ruang. Hasilnya tetap
   * terlihat masuk akal di layar — hanya angkanya salah dan bercampur — jadi
   * kebocoran seperti ini tidak akan terlihat tanpa membandingkan antar-ruang.
   */
  const viewer = await requireViewer();
  const params = await searchParams;
  const month = typeof params.bulan === "string" ? params.bulan : currentMonth();
  const rows = budgetRows(month, viewer);
  const totals = budgetTotals(month, viewer);

  /*
   * Tren 6 bulan per kategori. Angka "Rp640.000" tidak memberi tahu apakah
   * pengeluaran naik atau turun; garis kecil di sampingnya memberi tahu dalam
   * sekejap.
   */
  const trend = categoryTrend(6, month, viewer);

  /*
   * `listCategories(workspaceId, kind)` — argumen pertama adalah ruang, bukan
   * jenis. Memanggil `listCategories("expense")` menyaring berdasarkan id
   * ruang bernama "expense" yang tidak ada, sehingga daftar kosong dan
   * formulir tidak bisa disimpan sama sekali.
   */
  const expenseCategories = listCategories(viewer.workspaceId, "expense");

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Uang"
        title="Anggaran"
        description={`Rencana pengeluaran ${formatMonth(month)}. Anggaran tidak memblokir transaksi — ia memberi sinyal sebelum terlambat.`}
        actions={
          <>
            <Link
              href={`/keluarga/keuangan/anggaran?bulan=${addMonths(month, -1)}`}
              className="inline-flex h-9 items-center rounded-full border border-line-strong bg-card px-3 text-xs font-semibold hover:bg-paper-deep"
            >
              ← Sebelumnya
            </Link>
            <Link
              href={`/keluarga/keuangan/anggaran?bulan=${addMonths(month, 1)}`}
              className="inline-flex h-9 items-center rounded-full border border-line-strong bg-card px-3 text-xs font-semibold hover:bg-paper-deep"
            >
              Berikutnya →
            </Link>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total anggaran" value={formatIDR(totals.planned)} tone="ink" />
        <StatCard label="Terpakai" value={formatIDR(totals.used)} tone="butter" hint={`${totals.ratio}% dari rencana`} />
        <StatCard
          label="Sisa"
          value={formatIDR(Math.max(totals.remaining, 0))}
          tone={totals.remaining < 0 ? "tomato" : "mint"}
          hint={totals.remaining < 0 ? "melewati rencana" : "masih aman"}
        />
        <StatCard label="Kategori" value={String(rows.length)} hint="dengan anggaran" tone="paper" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <Card>
          <CardHeader title="Atur anggaran" hint="Menyimpan akan menimpa nilai bulan ini" />
          <div className="px-5 py-5">
            <ActionForm action={setBudget} submitLabel="Simpan anggaran" className="grid gap-4">
              <input type="hidden" name="month" value={month} />
              <Field label="Kategori pengeluaran">
                <select name="categoryId" className={selectClass} required>
                  {expenseCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Jumlah (Rp)">
                <input name="amount" type="number" min={0} step={1000} required className={inputClass} placeholder="2500000" />
              </Field>
              <p className="text-xs text-muted">
                Bulan aktif: <span className="font-semibold text-ink">{formatMonth(month)}</span>
              </p>
            </ActionForm>
          </div>
        </Card>

        <Card>
          <CardHeader title={`Anggaran ${formatMonth(month)}`} hint="Diurutkan dari yang paling kritis" />
          <ul className="divide-y divide-line">
            {rows.length === 0 ? (
              <li className="px-5 py-10 text-center text-sm text-muted">
                Belum ada anggaran untuk bulan ini.
              </li>
            ) : (
              rows.map((row) => (
                <li key={row.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      {row.category.name}
                      {trend.has(row.category.id) ? (
                        <Sparkline
                          values={trend.get(row.category.id) as number[]}
                          tone="negative"
                          width={52}
                          height={16}
                        />
                      ) : null}
                    </span>
                    <span className="text-xs tnum text-muted">
                      {formatIDR(row.used)} / {formatIDR(row.amount)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar
                      ratio={row.ratio}
                      tone={row.status === "over" ? "tomato" : row.status === "warning" ? "butter" : "mint"}
                      label={`Anggaran ${row.category.name}`}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <Badge
                      tone={row.status === "over" ? "tomato" : row.status === "warning" ? "butter" : "mint"}
                    >
                      {row.status === "over"
                        ? `lewat ${formatIDR(Math.abs(row.remaining))}`
                        : row.status === "warning"
                          ? `hampir habis · sisa ${formatIDR(row.remaining)}`
                          : `sisa ${formatIDR(row.remaining)}`}
                    </Badge>
                    <ActionButton
                      action={removeBudget}
                        fields={{ id: row.id }}
                      label="Hapus"
                      variant="danger"
                      confirmText={`Hapus anggaran ${row.category.name}?`}
                    />
                  </div>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}


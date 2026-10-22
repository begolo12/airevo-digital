import Link from "next/link";
import {
  PageHeader,
  StatCard,
  MetricStrip,
  ProgressBar,
  Card,
  CardHeader,
} from "@/components/app/ui";
import { CashflowChart } from "@/components/app/cashflow-chart";
import { Badge } from "@/components/ui";
import { dashboardData, dueRecurringRules } from "@/lib/data/queries";
import { requireViewer } from "@/lib/session";
import {
  formatDate,
  formatDateShort,
  formatIDR,
  formatMonth,
  formatWeekday,
} from "@/lib/format";
import { ActionButton } from "@/components/ui/action-form";
import { Icon } from "@/components/ui/icon";
import { runDueRecurring } from "@/lib/data/actions";

export default async function KeluargaDashboard() {
  const viewer = await requireViewer();
  const data = dashboardData(viewer);
  const dueRecurring = dueRecurringRules(viewer.workspaceId);

  const expenseDelta =
    data.previous.expense > 0
      ? Math.round(
          ((data.summary.expense - data.previous.expense) / data.previous.expense) * 100,
        )
      : 0;

  const attention: Array<{ label: string; href: string; tone: "tomato" | "butter" | "plum" }> = [];
  if (data.debts.payable > 0) {
    attention.push({
      label: `${formatIDR(data.debts.monthly)} cicilan bulan ini`,
      href: "/keluarga/keuangan/utang",
      tone: "tomato",
    });
  }
  if (data.expiringDocs.length > 0) {
    attention.push({
      label: `${data.expiringDocs.length} dokumen perlu perhatian`,
      href: "/keluarga/dokumen",
      tone: "butter",
    });
  }
  if (data.nextCheckup?.nextAt) {
    attention.push({
      label: `Kontrol ${data.nextCheckup.memberName ?? ""} ${formatDate(data.nextCheckup.nextAt)}`,
      href: "/keluarga/kesehatan",
      tone: "plum",
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={formatMonth(data.month)}
        title={`Selamat datang, ${viewer.role === "owner" ? "Irvan" : "Sari"}`}
        description={`${data.bills.length} tagihan menunggu perhatian. Sisa anggaran bulan ini ${formatIDR(
          Math.max(data.budgetTotals.remaining, 0),
        )}.`}
        actions={
          <>
            <Link
              href="/keluarga/keuangan/transaksi"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-emphasis bg-emphasis px-4 text-sm font-semibold text-on-emphasis hover:bg-ink-soft"
            >
              Catat transaksi
            </Link>
            <Link
              href="/keluarga/laporan"
              className="inline-flex h-10 items-center rounded-full border border-line-strong bg-card px-4 text-sm font-semibold hover:bg-paper-deep"
            >
              Laporan
            </Link>
          </>
        }
      />

      {/*
        Transaksi berulang yang jatuh tempo.

        Ditawarkan, bukan dibuat diam-diam: transaksi keuangan sebaiknya
        dikonfirmasi. Nominal yang tiba-tiba muncul di saldo lebih
        membingungkan daripada satu klik tambahan.
      */}
      {dueRecurring.count > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-butter-deep bg-butter/40 px-4 py-3">
          <div className="min-w-0">
            <p className="text-base font-bold text-ink">
              {dueRecurring.count} transaksi berulang menunggu dicatat
            </p>
            <p className="mt-0.5 truncate text-xs text-ink-soft">
              {dueRecurring.rules.map((rule) => rule.description).join(" · ")}
            </p>
          </div>
          <ActionButton
            action={runDueRecurring}
            label="Catat sekarang"
            variant="primary"
            icon={<Icon name="repeat" size={13} />}
          />
        </div>
      ) : null}

      {attention.length > 0 ? (
        <ul className="-mt-1 flex flex-wrap gap-2">
          {attention.map((item) => (
            <li key={item.label}>
              <Link href={item.href}>
                <Badge tone={item.tone}>{item.label}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Empat angka utama bulan ini */}
      <section aria-label="Ringkasan bulan ini" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total saldo"
          value={formatIDR(data.totalBalance)}
          hint={`${data.balances.length} akun aktif`}
          tone="ink"
        />
        <StatCard
          label="Pemasukan"
          value={formatIDR(data.summary.income)}
          hint={formatMonth(data.month)}
          tone="mint"
        />
        <StatCard
          label="Pengeluaran"
          value={formatIDR(data.summary.expense)}
          tone="butter"
          delta={{
            value: `${Math.abs(expenseDelta)}% ${expenseDelta <= 0 ? "lebih rendah" : "lebih tinggi"}`,
            direction: expenseDelta <= 0 ? "down" : "up",
            good: expenseDelta <= 0,
          }}
        />
        <StatCard
          label="Sisa anggaran"
          value={formatIDR(Math.max(data.budgetTotals.remaining, 0))}
          hint={`dari ${formatIDR(data.budgetTotals.planned)}`}
          tone={data.budgetTotals.ratio > 100 ? "tomato" : "paper"}
        />
      </section>

      {/*
        Neraca dalam satu baris, bukan empat kartu terpisah. Angka-angka ini
        saling menjelaskan (aset + kas + piutang − utang), jadi lebih terbaca
        sebagai satu kalimat. Satu kartu lebar juga memberi tiap angka ruang
        yang cukup sehingga tidak ada yang mepet ke tepi.
      */}
      <section aria-label="Neraca keluarga">
        <MetricStrip
          items={[
            {
              label: "Kekayaan bersih",
              value: formatIDR(data.worth.total),
              hint: "aset + kas + piutang − utang",
            },
            {
              label: "Nilai aset",
              value: formatIDR(data.worth.assetsTotal),
              hint: `${data.worth.goalsSaved > 0 ? "termasuk tujuan" : "properti, kendaraan, emas"}`,
            },
            {
              label: "Sisa utang",
              value: formatIDR(data.worth.payable),
              tone: data.worth.payable > 0 ? "negative" : "muted",
              hint: data.debts.monthly > 0 ? `${formatIDR(data.debts.monthly)}/bulan` : "tidak ada cicilan",
            },
            {
              label: "Piutang",
              value: formatIDR(data.worth.receivable),
              tone: data.worth.receivable > 0 ? "positive" : "muted",
              hint: data.worth.receivable > 0 ? "belum kembali" : "tidak ada",
            },
          ]}
        />
      </section>

      {/* Arus kas + tagihan */}
      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
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
          <CashflowChart series={data.cashflow} />
        </Card>

        <Card>
          <CardHeader
            title="Tagihan terdekat"
            action={
              <Link
                href="/keluarga/keuangan/tagihan"
                className="text-xs font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-tomato"
              >
                Semua
              </Link>
            }
          />
          <ul className="divide-y divide-line">
            {data.bills.length === 0 ? (
              <li className="px-5 py-6 text-center text-sm text-muted">
                Tidak ada tagihan aktif.
              </li>
            ) : (
              data.bills.map((bill) => (
                <li key={bill.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{bill.name}</p>
                    <p className="text-xs text-muted">
                      {formatDate(bill.nextDueDate)}
                      {bill.daysLeft >= 0
                        ? ` · ${bill.daysLeft === 0 ? "hari ini" : `${bill.daysLeft} hari lagi`}`
                        : " · lewat"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm tnum font-semibold">{formatIDR(bill.amount)}</p>
                    <Badge tone={bill.state === "overdue" ? "tomato" : bill.daysLeft <= 3 ? "butter" : "neutral"}>
                      {bill.state === "overdue" ? "lewat" : bill.state === "due" ? "hari ini" : "terjadwal"}
                    </Badge>
                  </div>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>

      {/* Anggaran + tujuan */}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Anggaran bulan ini"
            hint="Kategori yang paling perlu diperhatikan"
            action={
              <Link
                href="/keluarga/keuangan/anggaran"
                className="text-xs font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-tomato"
              >
                Kelola
              </Link>
            }
          />
          <div className="space-y-3 px-5 py-4">
            {data.budgets.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">
                Belum ada anggaran bulan ini.
              </p>
            ) : (
              data.budgets.map((row) => (
                <div key={row.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-semibold">
                      {row.category.name}
                    </span>
                    <span className="shrink-0 text-xs tnum text-muted">
                      {formatIDR(row.used)} / {formatIDR(row.amount)}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <ProgressBar
                      ratio={row.ratio}
                      tone={row.status === "over" ? "tomato" : row.status === "warning" ? "butter" : "mint"}
                      label={`Anggaran ${row.category.name}`}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {row.status === "over"
                      ? `Lewat ${formatIDR(Math.abs(row.remaining))}`
                      : `Sisa ${formatIDR(row.remaining)}`}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Tujuan keluarga"
            action={
              <Link
                href="/keluarga/rencana"
                className="text-xs font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-tomato"
              >
                Semua
              </Link>
            }
          />
          <ul className="divide-y divide-line">
            {data.goals.map((goal) => (
              <li key={goal.id} className="px-5 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <Link
                    href={`/keluarga/rencana/${goal.id}`}
                    className="min-w-0 truncate text-sm font-semibold hover:underline"
                  >
                    {goal.name}
                  </Link>
                  <span className="shrink-0 text-xs tnum text-muted">{goal.progress}%</span>
                </div>
                <div className="mt-1.5">
                  <ProgressBar ratio={goal.progress} tone="sky" label={goal.name} />
                </div>
                <p className="mt-1 text-xs text-muted">
                  {formatIDR(goal.savedAmount)} dari {formatIDR(goal.targetAmount)}
                  {goal.monthlyTarget ? ` · ${formatIDR(goal.monthlyTarget)}/bulan` : ""}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Agenda + tugas + transaksi */}
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader
            title="Agenda terdekat"
            action={
              <Link
                href="/keluarga/kalender"
                className="text-xs font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-tomato"
              >
                Kalender
              </Link>
            }
          />
          <ul className="divide-y divide-line">
            {data.events.map((event) => (
              <li key={event.id} className="flex items-center gap-3 px-5 py-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] border border-line bg-paper-deep/60">
                  <span className="text-2xs font-bold uppercase text-muted">
                    {formatDateShort(event.displayDate).split(" ")[1]}
                  </span>
                  <span className="text-base font-black leading-none tnum">
                    {formatDateShort(event.displayDate).split(" ")[0]}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{event.title}</p>
                  <p className="truncate text-xs text-muted">
                    {formatWeekday(event.displayDate)}
                    {event.time ? ` · ${event.time}` : " · sepanjang hari"}
                  </p>
                </div>
                {event.isBirthday ? <Badge tone="butter">ultah</Badge> : null}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Tugas rumah"
            action={
              <Link
                href="/keluarga/tugas"
                className="text-xs font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-tomato"
              >
                Semua
              </Link>
            }
          />
          <ul className="divide-y divide-line">
            {data.chores.map((chore) => (
              <li key={chore.id} className="flex items-center justify-between gap-2 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{chore.title}</p>
                  <p className="truncate text-xs text-muted">
                    {chore.assigneeName ?? "belum ditugaskan"}
                    {chore.dueDate ? ` · ${formatDate(chore.dueDate)}` : ""}
                  </p>
                </div>
                <Badge tone={chore.status === "doing" ? "butter" : "neutral"}>
                  {chore.status === "doing" ? "dikerjakan" : "belum"}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Transaksi terbaru"
            action={
              <Link
                href="/keluarga/keuangan/transaksi"
                className="text-xs font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-tomato"
              >
                Semua
              </Link>
            }
          />
          <ul className="divide-y divide-line">
            {data.recent.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between gap-2 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{tx.description}</p>
                  <p className="truncate text-xs text-muted">
                    {formatDate(tx.occurredAt)}
                    {tx.recordedByProfileId ? " · dicatat" : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-sm tnum font-semibold ${
                    tx.type === "income"
                      ? "text-positive"
                      : tx.type === "expense"
                        ? "text-danger"
                        : "text-muted"
                  }`}
                >
                  {tx.type === "income" ? "+" : tx.type === "expense" ? "−" : "→"}
                  {formatIDR(tx.amount)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
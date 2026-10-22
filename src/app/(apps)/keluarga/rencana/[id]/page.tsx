import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Card, CardHeader, ProgressBar, StatCard } from "@/components/app/ui";
import { Badge, Field, inputClass } from "@/components/ui";
import { ActionForm, InlineForm } from "@/components/ui/action-form";
import { addContribution, updateGoalStatus } from "@/lib/data/actions";
import { contributionsFor, goalById } from "@/lib/data/queries";
import { formatDate, formatIDR, formatMonth, todayISO } from "@/lib/format";
import { requireViewer } from "@/lib/session";
import { Icon } from "@/components/ui/icon";

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await requireViewer();
  const { id } = await params;

  /*
   * Id berasal dari URL, jadi wajib disaring per ruang. Tanpa `workspaceId`,
   * pengguna yang login di satu ruang bisa membuka tujuan milik ruang lain
   * hanya dengan mengetik id-nya.
   */
  const goal = goalById(id, viewer.workspaceId);
  if (!goal) notFound();

  const contributions = contributionsFor(goal.id, viewer.workspaceId);

  return (
    <div className="space-y-5">
      <Link
        href="/keluarga/rencana"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
      >
        <Icon name="arrow-left" size={14} strokeWidth={2.2} />
        Semua tujuan
      </Link>

      <PageHeader
        eyebrow="Rencana"
        title={goal.name}
        description={
          goal.targetDate
            ? `Target ${formatMonth(goal.targetDate.slice(0, 7))}${goal.memberName ? ` · untuk ${goal.memberName}` : ""}`
            : "Tanpa tanggal target"
        }
        actions={
          <InlineForm action={updateGoalStatus} className="flex gap-2">
            <input type="hidden" name="goalId" value={goal.id} />
            <input type="hidden" name="status" value={goal.status === "paused" ? "active" : "paused"} />
            <button
              type="submit"
              className="inline-flex h-10 items-center rounded-full border border-line-strong bg-card px-4 text-sm font-semibold hover:bg-paper-deep"
            >
              {goal.status === "paused" ? "Lanjutkan" : "Jeda"}
            </button>
          </InlineForm>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Terkumpul" value={formatIDR(goal.savedAmount)} tone="mint" />
        <StatCard label="Target" value={formatIDR(goal.targetAmount)} tone="ink" />
        <StatCard label="Sisa" value={formatIDR(goal.remaining)} tone="paper" />
        <StatCard
          label="Saran per bulan"
          value={goal.monthlyTarget ? formatIDR(goal.monthlyTarget) : "—"}
          hint={goal.monthsLeft !== null ? `${goal.monthsLeft} bulan tersisa` : "tanpa tenggat"}
          tone="butter"
        />
      </section>

      <Card>
        <div className="px-5 py-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold">Progres</p>
            <p className="text-lg font-black tnum">{goal.progress}%</p>
          </div>
          <div className="mt-2">
            <ProgressBar ratio={goal.progress} tone={goal.progress >= 100 ? "mint" : "sky"} label="Progres tujuan" />
          </div>
          <p className="mt-2 text-xs text-muted">
            {goal.progress >= 100
              ? "Tujuan tercapai. Kontribusi berikutnya bisa dialihkan ke tujuan lain."
              : goal.monthsLeft === 0
                ? "Tanggal target sudah lewat. Sesuaikan tanggal atau tambah kontribusi."
                : `Dengan ${goal.monthlyTarget ? formatIDR(goal.monthlyTarget) : "kontribusi rutin"} per bulan, target ini bisa tercapai sesuai rencana.`}
          </p>
        </div>
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader title="Tambah kontribusi" hint="Tercatat sebagai riwayat, bukan transaksi" />
          <div className="px-5 py-5">
            <ActionForm action={addContribution} submitLabel="Simpan kontribusi" resetOnSuccess className="grid gap-4">
              <input type="hidden" name="goalId" value={goal.id} />
              <Field label="Jumlah (Rp)">
                <input name="amount" type="number" min={1} step={50000} required className={inputClass} placeholder="1500000" />
              </Field>
              <Field label="Tanggal">
                <input name="contributedAt" type="date" defaultValue={todayISO()} required className={inputClass} />
              </Field>
              <Field label="Catatan (opsional)">
                <input name="note" maxLength={200} className={inputClass} placeholder="Sisihan gaji" />
              </Field>
            </ActionForm>
          </div>
        </Card>

        <Card>
          <CardHeader title="Riwayat kontribusi" hint={`${contributions.length} catatan`} />
          <ul className="divide-y divide-line">
            {contributions.length === 0 ? (
              <li className="px-5 py-10 text-center text-sm text-muted">
                Belum ada kontribusi tercatat.
              </li>
            ) : (
              contributions.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div>
                    <p className="text-sm font-semibold">{formatIDR(item.amount)}</p>
                    <p className="text-xs text-muted">
                      {formatDate(item.contributedAt)}
                      {item.note ? ` · ${item.note}` : ""}
                    </p>
                  </div>
                  <Badge tone="mint">masuk</Badge>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}


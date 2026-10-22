import Link from "next/link";
import { PageHeader, Card, CardHeader, StatCard, ProgressBar } from "@/components/app/ui";
import { Badge, EmptyState, Field, inputClass, selectClass } from "@/components/ui";
import { ActionForm, ActionButton } from "@/components/ui/action-form";
import { createEducationRecord, deleteEducationRecord } from "@/lib/data/actions";
import { educationRows, educationTotals, goalRows } from "@/lib/data/queries";
import { getStore } from "@/lib/data/store";
import { requireViewer } from "@/lib/session";
import { formatIDR } from "@/lib/format";

export const metadata = { title: "Pendidikan" };

const levelLabel: Record<string, string> = {
  paud: "PAUD",
  sd: "SD",
  smp: "SMP",
  sma: "SMA",
  kuliah: "Kuliah",
  lainnya: "Lainnya",
};

export default async function PendidikanPage() {
  const viewer = await requireViewer();
  const ws = viewer.workspaceId;
  const rows = educationRows(ws);
  const totals = educationTotals(ws);
  const goals = goalRows(ws);
  const members = getStore().members;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Catatan"
        title="Pendidikan anak"
        description="Sekolah, jenjang, biaya tahunan, dan kaitannya dengan tujuan pendidikan."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Anak terdaftar" value={String(rows.length)} tone="ink" />
        <StatCard label="Biaya per tahun" value={formatIDR(totals.annual)} tone="butter" />
        <StatCard label="Perlu disisihkan" value={formatIDR(totals.monthly)} tone="mint" hint="per bulan" />
        <StatCard
          label="Tujuan terhubung"
          value={String(rows.filter((r) => r.goalId).length)}
          tone="paper"
          hint="dari data pendidikan"
        />
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader title="Data pendidikan" />
          {rows.length === 0 ? (
            <div className="px-5 py-8">
              <EmptyState
                title="Belum ada data"
                description="Tambahkan sekolah dan biaya tahunan agar bisa dihitung per bulan."
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((record) => {
                const goal = goals.find((g) => g.id === record.goalId);
                return (
                  <li key={record.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{record.school}</p>
                          <Badge tone="sky">{levelLabel[record.level]}</Badge>
                          <Badge tone="neutral">{record.academicYear}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          {record.memberName}
                          {record.annualCost
                            ? ` · ${formatIDR(record.annualCost)}/tahun`
                            : " · biaya belum diisi"}
                          {record.monthlySaving
                            ? ` · ${formatIDR(record.monthlySaving)}/bulan`
                            : ""}
                          {record.notes ? ` · ${record.notes}` : ""}
                        </p>
                        {goal ? (
                          <div className="mt-2 max-w-sm">
                            <div className="flex items-baseline justify-between gap-2">
                              <Link
                                href={`/keluarga/rencana/${goal.id}`}
                                className="text-xs font-semibold text-ink underline decoration-line-strong underline-offset-2"
                              >
                                {goal.name}
                              </Link>
                              <span className="text-xs tnum text-muted">{goal.progress}%</span>
                            </div>
                            <div className="mt-1">
                              <ProgressBar ratio={goal.progress} tone="sky" label={goal.name} />
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <ActionButton
                        action={deleteEducationRecord}
                        fields={{ id: record.id }}
                        label="Hapus"
                        variant="danger"
                        confirmText={`Hapus data ${record.school}?`}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Tambah data" />
          <div className="px-5 py-5">
            <ActionForm action={createEducationRecord} submitLabel="Simpan" resetOnSuccess className="grid gap-4">
              <Field label="Anak">
                <select name="memberId" className={selectClass} required>
                  {members
                    .filter((m) => m.relationship === "child")
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Sekolah">
                <input name="school" required maxLength={160} className={inputClass} placeholder="SD Harapan" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Jenjang">
                  <select name="level" className={selectClass} defaultValue="sd">
                    {Object.entries(levelLabel).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Tahun ajaran">
                  <input name="academicYear" required maxLength={20} className={inputClass} placeholder="2026/2027" />
                </Field>
              </div>
              <Field label="Biaya per tahun (Rp)">
                <input name="annualCost" type="number" min={0} step={100000} className={inputClass} placeholder="7200000" />
              </Field>
              <Field label="Terhubung ke tujuan">
                <select name="goalId" className={selectClass} defaultValue="">
                  <option value="">— tidak terkait —</option>
                  {goals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Catatan">
                <input name="notes" maxLength={500} className={inputClass} placeholder="Kelas 5" />
              </Field>
            </ActionForm>
          </div>
        </Card>
      </div>
    </div>
  );
}

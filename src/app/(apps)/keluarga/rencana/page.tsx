import Link from "next/link";
import { PageHeader, Card, CardHeader, ProgressBar, StatCard } from "@/components/app/ui";
import { Confetti, ProgressRing } from "@/components/app/viz";
import { Badge, Field, inputClass, selectClass } from "@/components/ui";
import { ActionForm } from "@/components/ui/action-form";
import { createGoal } from "@/lib/data/actions";
import {
  averageMonthlyExpense,
  emergencyFundTarget,
  goalRows,
  listAccounts,
} from "@/lib/data/queries";
import { getStore } from "@/lib/data/store";
import { requireViewer } from "@/lib/session";
import { formatIDR, formatMonth, todayISO } from "@/lib/format";

export const metadata = { title: "Rencana" };

const goalTypeLabel = {
  emergency_fund: "Dana darurat",
  education: "Pendidikan",
  home: "Rumah",
  vehicle: "Kendaraan",
  retirement: "Pensiun",
  hajj: "Haji / umrah",
  wedding: "Pernikahan",
  vacation: "Liburan",
  custom: "Lainnya",
} as const;

export default async function RencanaPage() {
  const viewer = await requireViewer();
  const ws = viewer.workspaceId;
  const goals = goalRows(ws);
  const accounts = listAccounts(ws);
  const members = getStore().members;
  const avgExpense = averageMonthlyExpense(3);
  const emergencyTarget = emergencyFundTarget();

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Rencana"
        title="Tujuan keuangan"
        description="Setiap tujuan punya target, tanggal, dan kontribusi bulanan yang disarankan. Angkanya berubah saat kondisi berubah."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tujuan aktif" value={String(goals.length)} tone="ink" />
        <StatCard
          label="Rata-rata pengeluaran"
          value={formatIDR(avgExpense)}
          hint="3 bulan terakhir"
          tone="butter"
        />
        <StatCard
          label="Dana darurat ideal"
          value={formatIDR(emergencyTarget)}
          hint="6 × pengeluaran bulanan"
          tone="mint"
        />
        <StatCard
          label="Total terkumpul"
          value={formatIDR(goals.reduce((sum, goal) => sum + goal.savedAmount, 0))}
          hint="di semua tujuan"
          tone="paper"
        />
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-3">
          {goals.length === 0 ? (
            <Card>
              <div className="px-5 py-12 text-center">
                <p className="hand text-xl text-muted">belum ada tujuan</p>
                <p className="mt-2 text-sm text-muted">
                  Mulai dari dana darurat — biasanya yang paling menenangkan.
                </p>
              </div>
            </Card>
          ) : (
            goals.map((goal) => (
              <Card key={goal.id}>
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/keluarga/rencana/${goal.id}`}
                          className="text-base font-bold hover:underline"
                        >
                          {goal.name}
                        </Link>
                        <Badge tone="neutral">{goalTypeLabel[goal.type]}</Badge>
                        {goal.visibility === "shared" ? <Badge tone="mint">dibagikan</Badge> : null}
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {formatIDR(goal.savedAmount)} dari {formatIDR(goal.targetAmount)}
                        {goal.targetDate ? ` · target ${formatMonth(goal.targetDate.slice(0, 7))}` : ""}
                        {goal.memberName ? ` · untuk ${goal.memberName}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-right">
                        <p className="text-xl leading-none font-black tnum">{goal.progress}%</p>
                        {goal.monthlyTarget ? (
                          <p className="mt-1 text-xs text-muted">
                            {formatIDR(goal.monthlyTarget)}/bulan
                          </p>
                        ) : null}
                      </div>
                      {/*
                        Cincin mengisi saat muncul — membuat "seberapa jauh"
                        terasa sebagai gerak, bukan angka statis. Konfeti hanya
                        dipicu sekali saat tujuan benar-benar tercapai.
                      */}
                      <span className="relative">
                        <ProgressRing
                          percent={goal.progress}
                          size={44}
                          tone={
                            goal.progress >= 100
                              ? "positive"
                              : goal.progress >= 50
                                ? "positive"
                                : "warning"
                          }
                        />
                        {goal.progress >= 100 ? <Confetti /> : null}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <ProgressBar
                      ratio={goal.progress}
                      tone={goal.progress >= 100 ? "mint" : goal.progress >= 50 ? "sky" : "butter"}
                      label={`Progres ${goal.name}`}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted">
                      {goal.monthsLeft === null
                        ? "Tanpa tanggal target"
                        : goal.monthsLeft === 0
                          ? "Target sudah lewat — perlu penyesuaian"
                          : `${goal.monthsLeft} bulan lagi · sisa ${formatIDR(goal.remaining)}`}
                    </p>
                    <Link
                      href={`/keluarga/rencana/${goal.id}`}
                      className="text-xs font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-tomato"
                    >
                      Tambah kontribusi
                    </Link>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        <Card>
          <CardHeader title="Tujuan baru" hint="Target dan tanggal menentukan saran bulanan" />
          <div className="px-5 py-5">
            <ActionForm action={createGoal} submitLabel="Buat tujuan" resetOnSuccess className="grid gap-4">
              <Field label="Nama tujuan">
                <input name="name" required maxLength={120} className={inputClass} placeholder="Dana darurat 6 bulan" />
              </Field>
              <Field label="Jenis">
                <select name="type" className={selectClass} defaultValue="emergency_fund">
                  {Object.entries(goalTypeLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Target (Rp)">
                <input name="targetAmount" type="number" min={1} step={100000} required className={inputClass} placeholder="60000000" />
              </Field>
              <Field label="Target tanggal">
                <input name="targetDate" type="date" className={inputClass} defaultValue={todayISO()} />
              </Field>
              <Field label="Akun sumber">
                <select name="accountId" className={selectClass} defaultValue="">
                  <option value="">— belum ditentukan —</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Untuk anggota">
                <select name="memberId" className={selectClass} defaultValue="">
                  <option value="">— keluarga —</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Visibilitas">
                <select name="visibility" className={selectClass} defaultValue="household">
                  <option value="household">Dewasa saja</option>
                  <option value="shared">Semua anggota</option>
                  <option value="private">Pribadi</option>
                </select>
              </Field>
            </ActionForm>
          </div>
        </Card>
      </div>
    </div>
  );
}

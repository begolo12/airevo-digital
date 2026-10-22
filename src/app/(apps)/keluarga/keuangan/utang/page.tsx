import { PageHeader, Card, CardHeader, StatCard, ProgressBar } from "@/components/app/ui";
import { Badge, Field, inputClass, selectClass } from "@/components/ui";
import { ActionForm, ActionButton, InlineForm } from "@/components/ui/action-form";
import { closeDebt, createDebt, deleteDebt, payDebt } from "@/lib/data/actions";
import { debtRows, debtTotals } from "@/lib/data/queries";
import { formatDate, formatIDR, todayISO } from "@/lib/format";
import { requireViewer } from "@/lib/session";
import { DebtPayoffSimulator } from "@/components/app/debt-payoff-simulator";

export const metadata = { title: "Utang & piutang" };

export default async function UtangPage() {
  const viewer = await requireViewer();
  const ws = viewer.workspaceId;
  const rows = debtRows(undefined, ws);
  const totals = debtTotals(ws);
  const payable = rows.filter((d) => d.type === "payable");
  const receivable = rows.filter((d) => d.type === "receivable");

  const groups = [
    {
      title: "Utang kita",
      hint: "Yang harus dibayar",
      items: payable,
      tone: "tomato" as const,
      empty: "Tidak ada utang tercatat. Bagus.",
    },
    {
      title: "Piutang kita",
      hint: "Yang harus ditagih",
      items: receivable,
      tone: "mint" as const,
      empty: "Tidak ada piutang.",
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Uang"
        title="Utang & piutang"
        description="Catat kewajiban dan hak finansial. Sisa utang mengurangi kekayaan bersih; piutang menambah."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total utang" value={formatIDR(totals.payable)} tone="tomato" hint={`${payable.length} catatan`} />
        <StatCard label="Total piutang" value={formatIDR(totals.receivable)} tone="mint" hint={`${receivable.length} catatan`} />
        <StatCard
          label="Posisi bersih"
          value={`${totals.net < 0 ? "−" : ""}${formatIDR(Math.abs(totals.net))}`}
          tone={totals.net >= 0 ? "ink" : "paper"}

        />
        <StatCard label="Cicilan per bulan" value={formatIDR(totals.monthly)} tone="butter" hint="komitmen rutin" />
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          {groups.map((group) => (
            <Card key={group.title}>
              <CardHeader
                title={group.title}
                hint={group.hint}
                action={<Badge tone={group.tone}>{group.items.length}</Badge>}
              />
              <ul className="divide-y divide-line">
                {group.items.length === 0 ? (
                  <li className="px-5 py-8 text-center text-sm text-muted">{group.empty}</li>
                ) : (
                  group.items.map((debt) => (
                    <li key={debt.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold">{debt.counterparty}</p>
                            {debt.status === "paid" ? (
                              <Badge tone="mint">lunas</Badge>
                            ) : debt.overdue ? (
                              <Badge tone="tomato">lewat jatuh tempo</Badge>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm leading-relaxed text-muted">
                            Pokok {formatIDR(debt.principal)} · sisa{" "}
                            {formatIDR(debt.remaining)}
                            {debt.installmentAmount
                              ? ` · cicilan ${formatIDR(debt.installmentAmount)}/bulan`
                              : ""}
                            {debt.interestRate ? ` · bunga ${debt.interestRate}%` : ""}
                            {debt.dueDate ? ` · jatuh tempo ${formatDate(debt.dueDate)}` : ""}
                          </p>
                          {debt.notes ? (
                            <p className="mt-1 text-sm text-muted">{debt.notes}</p>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm tnum font-semibold">
                            {formatIDR(debt.remaining)}
                          </p>
                          <p className="text-sm text-muted">{debt.progress}% terbayar</p>
                        </div>
                      </div>

                      <div className="mt-2">
                        <ProgressBar
                          ratio={debt.progress}
                          tone={debt.type === "payable" ? "butter" : "mint"}
                          label={`Progres ${debt.counterparty}`}
                        />
                      </div>

                      {/*
                        Simulator hanya untuk utang aktif: menjawab "lunas
                        kapan?" pada utang yang sudah lunas tidak berguna.
                      */}
                      {debt.status === "active" && debt.remaining > 0 ? (
                        <DebtPayoffSimulator
                          debtId={debt.id}
                          name={debt.counterparty}
                          remaining={debt.remaining}
                          interestRate={debt.interestRate}
                          installmentAmount={debt.installmentAmount}
                        />
                      ) : null}

                      {debt.status === "active" ? (
                        <div className="mt-3 flex flex-wrap items-end gap-2">
                          <InlineForm action={payDebt} className="flex items-end gap-2">
                            <input type="hidden" name="id" value={debt.id} />
                            <label className="flex flex-col gap-1">
                              <span className="text-2xs font-semibold uppercase tracking-wide text-muted">
                                Bayar
                              </span>
                              <input
                                name="amount"
                                type="number"
                                min={0}
                                step={1}
                                defaultValue={debt.installmentAmount ?? 0}
                                className="h-8 w-32 rounded-[8px] border border-line-strong bg-card px-2 text-xs"
                              />
                            </label>
                            <button
                              type="submit"
                              className="h-8 rounded-full border border-emphasis bg-emphasis px-3 text-xs font-semibold text-on-emphasis hover:bg-ink-soft"
                            >
                              Catat bayar
                            </button>
                          </InlineForm>
                          <ActionButton
                            action={closeDebt}
                            fields={{ id: debt.id }}
                            label="Lunas"
                            variant="soft"
                            confirmText={`Tandai ${debt.counterparty} lunas?`}
                          />
                          <ActionButton
                            action={deleteDebt}
                            fields={{ id: debt.id }}
                            label="Hapus"
                            variant="danger"
                            confirmText={`Hapus catatan ${debt.counterparty}?`}
                          />
                        </div>
                      ) : (
                        <div className="mt-3">
                          <ActionButton
                            action={deleteDebt}
                            fields={{ id: debt.id }}
                            label="Hapus"
                            variant="danger"
                            confirmText={`Hapus catatan ${debt.counterparty}?`}
                          />
                        </div>
                      )}
                    </li>
                  ))
                )}
              </ul>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader title="Catat baru" hint="Utang atau piutang" />
          <div className="px-5 py-5">
            <ActionForm action={createDebt} submitLabel="Simpan" resetOnSuccess className="grid gap-4">
              <Field label="Jenis">
                <select name="type" className={selectClass} defaultValue="payable">
                  <option value="payable">Utang (kita berutang)</option>
                  <option value="receivable">Piutang (orang berutang)</option>
                </select>
              </Field>
              <Field label="Pihak">
                <input name="counterparty" required maxLength={120} className={inputClass} placeholder="KPR BCA" />
              </Field>
              <Field label="Pokok (Rp)">
                <input name="principal" type="number" min={0} step={100000} required className={inputClass} placeholder="420000000" />
              </Field>
              <Field label="Sisa saat ini (Rp)" hint="Kosongkan bila sama dengan pokok">
                <input name="remaining" type="number" min={0} step={100000} className={inputClass} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Bunga (%/tahun)">
                  <input name="interestRate" type="number" min={0} max={100} step={0.1} className={inputClass} />
                </Field>
                <Field label="Cicilan (Rp/bulan)">
                  <input name="installmentAmount" type="number" min={0} step={50000} className={inputClass} />
                </Field>
              </div>
              <Field label="Jatuh tempo">
                <input name="dueDate" type="date" defaultValue={todayISO()} className={inputClass} />
              </Field>
              <Field label="Catatan">
                <input name="notes" maxLength={500} className={inputClass} placeholder="Cicilan ke-64 dari 180" />
              </Field>
            </ActionForm>
          </div>
        </Card>
      </div>
    </div>
  );
}
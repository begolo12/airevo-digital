import { PageHeader, Card, CardHeader, StatCard } from "@/components/app/ui";
import { ContextMenu } from "@/components/app/context-menu";
import { Icon } from "@/components/ui/icon";
import { Badge, Field, inputClass, selectClass } from "@/components/ui";
import { ActionForm, InlineForm } from "@/components/ui/action-form";
import { createBill, payBill, skipBill } from "@/lib/data/actions";
import { billPaymentsFor, billRows, listAccounts, listCategories } from "@/lib/data/queries";
import { formatDate, formatIDR, todayISO } from "@/lib/format";
import { getStore } from "@/lib/data/store";
import { requireViewer } from "@/lib/session";

export const metadata = { title: "Tagihan" };

const stateLabel = {
  overdue: "lewat jatuh tempo",
  due: "jatuh tempo hari ini",
  upcoming: "terjadwal",
  paid: "sudah dibayar",
} as const;

const stateTone = {
  overdue: "tomato",
  due: "butter",
  upcoming: "neutral",
  paid: "mint",
} as const;

const frequencyLabel = {
  weekly: "mingguan",
  monthly: "bulanan",
  quarterly: "3 bulanan",
  semiannual: "6 bulanan",
  yearly: "tahunan",
  once: "sekali",
} as const;

export default async function TagihanPage() {
  const viewer = await requireViewer();
  const ws = viewer.workspaceId;
  const bills = billRows(ws);
  const members = getStore().members.filter((item) => item.active);
  const accounts = listAccounts(ws);
  const categories = listCategories("expense");

  const totalMonthly = bills.reduce((sum, bill) => sum + bill.amount, 0);
  const overdue = bills.filter((b) => b.state === "overdue").length;
  const dueSoon = bills.filter((b) => b.state !== "paid" && b.daysLeft <= 7).length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Uang"
        title="Tagihan & langganan"
        description="Bayar sekali, transaksi tercatat otomatis, dan tanggal berikutnya dimajukan sesuai frekuensi."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total per periode" value={formatIDR(totalMonthly)} tone="ink" hint={`${bills.length} tagihan aktif`} />
        <StatCard label="Jatuh tempo ≤ 7 hari" value={String(dueSoon)} tone="butter" hint="perlu disiapkan" />
        <StatCard label="Lewat jatuh tempo" value={String(overdue)} tone={overdue > 0 ? "tomato" : "mint"} hint={overdue > 0 ? "segera bayar" : "tidak ada"} />
        <StatCard label="Otomatis" value="1 klik" hint="buat transaksi" tone="paper" />
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader title="Daftar tagihan" hint="Diurutkan dari yang paling dekat" />
          <ul className="divide-y divide-line">
            {bills.length === 0 ? (
              <li className="px-5 py-10 text-center text-sm text-muted">
                Belum ada tagihan. Tambahkan listrik, air, atau langganan.
              </li>
            ) : (
              bills.map((bill) => {
                const payments = billPaymentsFor(bill.id).slice(0, 2);
                return (
                  <ContextMenu
                    key={bill.id}
                    as="li"
                    className="row-interactive px-5 py-4"
                    items={[
                      { kind: "label", text: bill.name },
                      {
                        kind: "copy",
                        label: "Salin nominal",
                        value: formatIDR(bill.amount),
                        message: "Nominal disalin",
                      },
                      {
                        kind: "copy",
                        label: "Salin jatuh tempo",
                        value: formatDate(bill.nextDueDate),
                        message: "Tanggal disalin",
                      },
                      { kind: "separator" },
                      {
                        kind: "link",
                        label: "Catat transaksi manual",
                        href: "/keluarga/keuangan/transaksi",
                      },
                      {
                        kind: "action",
                        label: "Lewati periode ini",
                        action: skipBill,
                        fields: { billId: bill.id },
                        confirm: `Lewati tagihan ${bill.name} periode ini?`,
                        confirmDescription:
                          "Tagihan tidak dianggap menunggak untuk periode berjalan, dan tanggal jatuh tempo tetap maju.",
                      },
                    ]}
                  >
                    
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold">{bill.name}</p>
                            <Badge tone={stateTone[bill.state]}>{stateLabel[bill.state]}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted">
                            {formatIDR(bill.amount)} · {frequencyLabel[bill.frequency]} · jatuh tempo{" "}
                            {formatDate(bill.nextDueDate)}
                            {bill.category ? ` · ${bill.category.name}` : ""}
                          </p>
                          {/*
                            Pembagian beban antar anggota.

                            Tanpa ini, catatan hanya menunjukkan siapa yang
                            membayar, bukan siapa yang menanggung.
                          */}
                          {bill.split && bill.split.shares.length > 0 ? (
                            <p className="mt-1 flex flex-wrap items-center gap-1 text-2xs text-muted">
                              <Icon name="user" size={9} />
                              {bill.split.shares
                                .map((share) => {
                                  const member = members.find(
                                    (item) => item.id === share.memberId,
                                  );
                                  return `${member?.name ?? "?"} ${formatIDR(share.amount)}`;
                                })
                                .join(" · ")}
                            </p>
                          ) : null}
                          {payments.length > 0 ? (
                            <p className="mt-1 text-xs text-muted">
                              Terakhir: {formatDate(payments[0].dueDate)} ({payments[0].status === "paid" ? "dibayar" : "dilewati"})
                            </p>
                          ) : null}
                        </div>

                      {bill.state !== "paid" ? (
                        <div className="flex flex-col items-end gap-2">
                          <InlineForm action={payBill} className="flex items-center gap-2">
                            <input type="hidden" name="billId" value={bill.id} />
                            <input type="hidden" name="paidAt" value={todayISO()} />
                            <select
                              name="accountId"
                              defaultValue={bill.accountId ?? accounts[0]?.id}
                              className="h-8 rounded-full border border-line-strong bg-card px-2 text-xs"
                              aria-label={`Akun pembayaran ${bill.name}`}
                            >
                              {accounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                  {account.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              className="h-8 rounded-full border border-emphasis bg-emphasis px-3 text-xs font-semibold text-on-emphasis hover:bg-ink-soft"
                            >
                              Tandai dibayar
                            </button>
                          </InlineForm>
                          <InlineForm action={skipBill}>
                            <input type="hidden" name="billId" value={bill.id} />
                            <button
                              type="submit"
                              className="text-xs font-semibold text-muted underline underline-offset-2 hover:text-ink"
                            >
                              lewati periode ini
                            </button>
                          </InlineForm>
                        </div>
                      ) : (
                        <Badge tone="mint">beres</Badge>
                      )}
                      </div>
                  </ContextMenu>
                );
              })
            )}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Tambah tagihan" hint="Untuk listrik, air, internet, SPP" />
          <div className="px-5 py-5">
            <ActionForm action={createBill} submitLabel="Tambah tagihan" resetOnSuccess className="grid gap-4">
              <Field label="Nama tagihan">
                <input name="name" required maxLength={120} className={inputClass} placeholder="Internet Rumah" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Jumlah (Rp)">
                  <input name="amount" type="number" min={1} step={1000} required className={inputClass} placeholder="395000" />
                </Field>
                <Field label="Frekuensi">
                  <select name="frequency" className={selectClass} defaultValue="monthly">
                    <option value="monthly">Bulanan</option>
                    <option value="weekly">Mingguan</option>
                    <option value="quarterly">3 bulanan</option>
                    <option value="semiannual">6 bulanan</option>
                    <option value="yearly">Tahunan</option>
                    <option value="once">Sekali</option>
                  </select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tanggal jatuh tempo berikutnya">
                  <input name="nextDueDate" type="date" required defaultValue={todayISO()} className={inputClass} />
                </Field>
                <Field label="Tanggal dalam bulan (1–31)">
                  <input name="dueDay" type="number" min={1} max={31} defaultValue={5} className={inputClass} />
                </Field>
              </div>
              <Field label="Kategori">
                <select name="categoryId" className={selectClass} defaultValue="">
                  <option value="">— tanpa kategori —</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Akun default">
                <select name="accountId" className={selectClass} defaultValue="">
                  <option value="">— pilih saat bayar —</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Pengingat (hari sebelum)" hint="Dipakai untuk penanda di dashboard">
                <input name="reminderDaysBefore" type="number" min={0} max={30} defaultValue={3} className={inputClass} />
              </Field>

              {/*
                Pembagian beban.

                Tagihan rumah dibayar satu orang tetapi dinikmati semua. Tanpa
                pembagian, catatan hanya menunjukkan siapa yang membayar —
                bukan siapa yang menanggung.
              */}
              <Field
                label="Dibagi ke anggota"
                hint="Kosongkan bila seluruhnya ditanggung pembayar"
                className="sm:col-span-2"
              >
                <div className="flex flex-wrap gap-2">
                  {members.map((member) => (
                    <label
                      key={member.id}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs has-checked:border-ink has-checked:bg-ink has-checked:text-paper"
                    >
                      <input
                        type="checkbox"
                        name="splitMembers"
                        value={member.id}
                        className="size-3 accent-current"
                      />
                      {member.name}
                    </label>
                  ))}
                </div>
              </Field>
            </ActionForm>
          </div>
        </Card>
      </div>

      <div className="rounded-[14px] border border-line bg-card/70 p-5">
        <h2 className="text-sm font-bold">Bagaimana ini bekerja</h2>
        <ul className="mt-2 space-y-1.5 text-xs text-muted">
          <li>· Tandai dibayar → transaksi pengeluaran dibuat, status periode ini jadi lunas.</li>
          <li>· Tanggal berikutnya dimajukan otomatis sesuai frekuensi; tanggal 31 aman di bulan pendek.</li>
          <li>· Periode yang sama tidak bisa dibayar dua kali — sistem menolak duplikat.</li>
        </ul>
      </div>
    </div>
  );
}


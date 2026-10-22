import { PageHeader, Card, CardHeader, StatCard } from "@/components/app/ui";
import { Badge, Field, inputClass, selectClass } from "@/components/ui";
import { ActionForm, ActionButton } from "@/components/ui/action-form";
import { createAccount, archiveAccount } from "@/lib/data/actions";
import { listAccounts, totalBalance } from "@/lib/data/queries";
import { getStore } from "@/lib/data/store";
import { requireViewer } from "@/lib/session";
import { formatIDR } from "@/lib/format";
import { colorOptions, swatch } from "@/lib/colors";

export const metadata = { title: "Akun" };

const typeLabel = {
  cash: "Tunai",
  bank: "Bank",
  ewallet: "E-wallet",
  savings: "Tabungan",
} as const;

export default async function AkunPage() {
  const viewer = await requireViewer();
  const ws = viewer.workspaceId;
  const accounts = listAccounts(ws);
  const members = getStore().members;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Uang"
        title="Akun"
        description="Kas, bank, e-wallet, dan tabungan. Saldo dihitung dari saldo awal ditambah seluruh transaksi."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total saldo" value={formatIDR(totalBalance())} tone="ink" />
        {accounts.slice(0, 3).map((account) => (
          <StatCard
            key={account.id}
            label={account.name}
            value={formatIDR(account.balance)}
            hint={typeLabel[account.type]}
            tone="paper"
          />
        ))}
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_1.15fr]">
        <Card>
          <CardHeader title="Tambah akun" hint="Saldo awal boleh nol" />
          <div className="px-5 py-5">
            <ActionForm
              action={createAccount}
              submitLabel="Tambah akun"
              resetOnSuccess
              className="grid gap-4"
            >
              <Field label="Nama akun">
                <input name="name" required maxLength={100} className={inputClass} placeholder="BCA Utama" />
              </Field>
              <Field label="Jenis">
                <select name="type" className={selectClass} defaultValue="bank">
                  <option value="bank">Bank</option>
                  <option value="savings">Tabungan</option>
                  <option value="ewallet">E-wallet</option>
                  <option value="cash">Tunai</option>
                </select>
              </Field>
              <Field label="Saldo awal (Rp)">
                <input
                  name="openingBalance"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={0}
                  className={inputClass}
                />
              </Field>
              <Field label="Pemilik (opsional)">
                <select name="ownerMemberId" className={selectClass} defaultValue="">
                  <option value="">— bersama —</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Warna">
                <select name="color" className={selectClass} defaultValue="butter">
                  {colorOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </ActionForm>
          </div>
        </Card>

        <Card>
          <CardHeader title="Daftar akun" hint={`${accounts.length} akun aktif`} />
          <ul className="divide-y divide-line">
            {accounts.map((account) => (
              <li key={account.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={`h-9 w-9 rounded-[10px] border border-line ${swatch(account.color)}`}
                  />
                  <div>
                    <p className="text-sm font-semibold">{account.name}</p>
                    <p className="text-xs text-muted">
                      {typeLabel[account.type]}
                      {account.isShared ? " · bersama" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm tnum font-semibold">{formatIDR(account.balance)}</span>
                  <ActionButton
                    action={archiveAccount}
                        fields={{ id: account.id }}
                    label="Arsip"
                    variant="danger"
                    confirmText={`Arsipkan akun ${account.name}?`}
                  />
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-line px-5 py-3">
            <p className="text-xs text-muted">
              Akun dengan transaksi tidak bisa dihapus permanen — hanya diarsipkan, agar
              riwayat tetap utuh.
            </p>
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge tone="mint">Saldo otomatis</Badge>
        <Badge tone="butter">Transfer tidak dihitung pengeluaran</Badge>
        <Badge tone="neutral">Arsip, bukan hapus</Badge>
      </div>
    </div>
  );
}


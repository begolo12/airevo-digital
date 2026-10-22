import { PageHeader, Card, CardHeader } from "@/components/app/ui";
import { Badge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { ActionButton } from "@/components/ui/action-form";
import { TransactionDialog } from "@/components/app/transaction-dialog";
import { restoreTransaction, voidTransaction } from "@/lib/data/actions";
import { EditTransactionDialog } from "@/components/app/edit-transaction-dialog";
import { TransactionPhoto } from "@/components/app/transaction-photo";
import {
  listAccounts,
  listCategories,
  listTransactions,
  monthSummary,
} from "@/lib/data/queries";
import { getStore } from "@/lib/data/store";
import { requireViewer } from "@/lib/session";
import { ContextMenu } from "@/components/app/context-menu";
import {
  addMonths,
  currentMonth,
  formatDate,
  formatIDR,
  formatMonth,
  todayISO,
} from "@/lib/format";
import Link from "next/link";

export const metadata = { title: "Transaksi" };

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function TransaksiPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const viewer = await requireViewer();
  const month = typeof params.bulan === "string" ? params.bulan : currentMonth();
  const type = typeof params.tipe === "string" ? params.tipe : "";
  const q = typeof params.q === "string" ? params.q : "";

  const rows = listTransactions(
    { month, type: type || undefined, q: q || undefined },
    viewer,
  );
  // Wajib per-ruang: tanpa ini, akun dan kategori ruang lain ikut muncul di
  // pilihan dan transaksi bisa tersimpan ke akun milik ruang yang salah.
  const accounts = listAccounts(viewer.workspaceId);
  const categories = listCategories(viewer.workspaceId);
  const summary = monthSummary(month, viewer);
  const members = getStore().members;

  const filtered = Boolean(type || q);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Uang"
        title="Transaksi"
        description={`${rows.length} transaksi pada ${formatMonth(month)}.`}
        actions={
          <>
            <Link
              href={`/keluarga/keuangan/transaksi?bulan=${addMonths(month, -1)}`}
              className="inline-flex h-10 items-center rounded-full border border-line-strong bg-card px-3 text-xs font-semibold hover:bg-paper-deep"
            >
              ← Bulan lalu
            </Link>
            <Link
              href={`/keluarga/keuangan/transaksi?bulan=${addMonths(month, 1)}`}
              className="inline-flex h-10 items-center rounded-full border border-line-strong bg-card px-3 text-xs font-semibold hover:bg-paper-deep"
            >
              Bulan depan →
            </Link>
            {/*
              Ekspor memakai filter yang sedang aktif, sehingga yang diunduh
              sama persis dengan yang terlihat — bukan seluruh riwayat.
            */}
            <a
              href={`/api/ekspor/transaksi?bulan=${month}${type ? `&tipe=${type}` : ""}${
                q ? `&q=${encodeURIComponent(q)}` : ""
              }`}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line-strong bg-card px-3 text-xs font-semibold text-ink transition-colors hover:bg-paper-deep"
              download
            >
              <Icon name="download" size={13} />
              Ekspor CSV
            </a>
            <TransactionDialog
              accounts={accounts.map((account) => ({
                id: account.id,
                name: account.name,
                balance: account.balance,
              }))}
              categories={categories.map((category) => ({
                id: category.id,
                name: category.name,
                kind: category.kind,
              }))}
              members={members.map((member) => ({ id: member.id, name: member.name }))}
              today={todayISO()}
            />
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[14px] border border-mint-deep bg-mint/40 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-muted">
            Pemasukan
          </p>
          <p className="mt-1 text-[clamp(1rem,1.3vw,1.25rem)] font-black tnum">
            {formatIDR(summary.income)}
          </p>
        </div>
        <div className="rounded-[14px] border border-butter-deep bg-butter/40 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-muted">
            Pengeluaran
          </p>
          <p className="mt-1 text-[clamp(1rem,1.3vw,1.25rem)] font-black tnum">
            {formatIDR(summary.expense)}
          </p>
        </div>
        <div className="rounded-[14px] border border-line bg-card p-4">
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-muted">
            Transfer
          </p>
          <p className="mt-1 text-[clamp(1rem,1.3vw,1.25rem)] font-black tnum">
            {formatIDR(summary.transfer)}
          </p>
        </div>
      </section>

      <Card>
        <CardHeader
          title={`Daftar transaksi · ${formatMonth(month)}`}
          hint={filtered ? "Hasil filter" : undefined}
          action={
            <form
              className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap"
              action="/keluarga/keuangan/transaksi"
            >
              <input type="hidden" name="bulan" value={month} />
              <input
                name="q"
                defaultValue={q}
                placeholder="Cari deskripsi…"
                aria-label="Cari deskripsi transaksi"
                className="h-8 min-w-0 flex-1 rounded-full border border-line-strong bg-card px-3 text-xs sm:w-40 sm:flex-none"
              />
              <select
                name="tipe"
                defaultValue={type}
                aria-label="Saring menurut jenis transaksi"
                className="h-8 shrink-0 rounded-full border border-line-strong bg-card px-2 text-xs"
              >
                <option value="">Semua</option>
                <option value="income">Masuk</option>
                <option value="expense">Keluar</option>
                <option value="transfer">Transfer</option>
              </select>
              <button
                type="submit"
                className="h-8 shrink-0 rounded-full border border-line-strong bg-card px-3 text-xs font-semibold hover:bg-paper-deep"
              >
                Cari
              </button>
              {filtered ? (
                <Link
                  href={`/keluarga/keuangan/transaksi?bulan=${month}`}
                  className="shrink-0 text-xs font-semibold text-muted underline underline-offset-2 hover:text-ink"
                >
                  Reset
                </Link>
              ) : null}
            </form>
          }
        />

        {rows.length === 0 ? (
          <div className="px-5 py-8">
            {filtered ? (
              <EmptyState
                title="Tidak ada yang cocok"
                description="Coba kata kunci lain, atau tampilkan semua transaksi bulan ini."
                action={
                  <Link
                    href={`/keluarga/keuangan/transaksi?bulan=${month}`}
                    className="inline-flex h-9 items-center rounded-full border border-line-strong bg-card px-4 text-base font-semibold hover:bg-paper-deep"
                  >
                    Tampilkan semua
                  </Link>
                }
              />
            ) : (
              <EmptyState
                title="Belum ada transaksi"
                description="Mulai catat pengeluaran pertama. Data akan muncul di sini dan di dashboard."
                action={
                  <TransactionDialog
                    accounts={accounts.map((account) => ({
                      id: account.id,
                      name: account.name,
                      balance: account.balance,
                    }))}
                    categories={categories.map((category) => ({
                      id: category.id,
                      name: category.name,
                      kind: category.kind,
                    }))}
                    members={members.map((member) => ({
                      id: member.id,
                      name: member.name,
                    }))}
                    today={todayISO()}
                    label="Catat transaksi pertama"
                    triggerVariant="soft"
                  />
                }
              />
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Daftar transaksi {formatMonth(month)}</caption>
              <thead>
                <tr className="border-b border-line text-left text-2xs uppercase tracking-wide text-muted">
                  <th scope="col" className="px-5 py-2.5 font-semibold">Tanggal</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Deskripsi</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Kategori</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Akun</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Jumlah</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((tx) => (
                  <ContextMenu
                    key={tx.id}
                    as="tr"
                    className="row-interactive align-middle"
                    items={[
                      { kind: "label", text: tx.description },
                      {
                        kind: "copy",
                        label: "Salin nominal",
                        value: formatIDR(tx.amount),
                        message: "Nominal disalin",
                      },
                      {
                        kind: "copy",
                        label: "Salin ID transaksi",
                        value: tx.id,
                        message: "ID transaksi disalin",
                      },
                      { kind: "separator" },
                      {
                        kind: "link",
                        label: `Buka akun ${tx.accountName}`,
                        href: "/keluarga/keuangan/akun",
                      },
                      {
                        kind: "link",
                        label: "Kelola kategori",
                        href: "/keluarga/keuangan/kategori",
                      },
                      { kind: "separator" },
                      {
                        kind: "action",
                        label: "Batalkan transaksi",
                        action: voidTransaction,
                        fields: { id: tx.id },
                        danger: true,
                        confirm: "Batalkan transaksi ini?",
                        confirmDescription:
                          "Saldo akun akan dikembalikan. Transaksi tetap tersimpan sebagai jejak audit, tidak dihapus.",
                      },
                    ]}
                  >
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-muted">
                      {formatDate(tx.occurredAt)}
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-semibold">{tx.description}</p>
                      <p className="text-xs text-muted">
                        {tx.type === "transfer"
                          ? "transfer"
                          : tx.type === "income"
                            ? "masuk"
                            : "keluar"}
                        {tx.memberName ? ` · ${tx.memberName}` : ""}
                        {tx.recordedByName ? ` · dicatat ${tx.recordedByName}` : ""}
                        {tx.visibility === "private" ? " · pribadi" : ""}
                      </p>
                      {/* Foto struk: dilampirkan langsung dari baris ini. */}
                      {!tx.voidedAt ? (
                        <div className="mt-1">
                          <TransactionPhoto
                            transactionId={tx.id}
                            attachmentKey={tx.attachmentKey}
                            attachmentName={tx.attachmentName}
                          />
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-xs text-ink-soft">
                      {tx.categoryName ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-xs text-ink-soft">
                      {tx.accountName}
                      {tx.toAccountName ? ` → ${tx.toAccountName}` : ""}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right">
                      <span
                        className={`tnum font-semibold ${
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
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Sunting hanya untuk transaksi yang belum dibatalkan. */}
                        {!tx.voidedAt ? (
                          <EditTransactionDialog
                            transaction={{
                              id: tx.id,
                              type: tx.type,
                              amount: tx.amount,
                              occurredAt: tx.occurredAt,
                              description: tx.description,
                              accountId: tx.accountId,
                              toAccountId: tx.toAccountId,
                              categoryId: tx.categoryId,
                              memberId: tx.memberId,
                              visibility: tx.visibility,
                            }}
                            accounts={accounts}
                            categories={categories}
                            members={members}
                          />
                        ) : null}
                        <ActionButton
                          action={voidTransaction}
                          fields={{ id: tx.id }}
                          label="Batalkan"
                          variant="danger"
                          confirmText="Batalkan transaksi ini?"
                          confirmDescription="Saldo akun akan dikembalikan. Transaksi tetap tersimpan sebagai jejak audit, tidak dihapus."
                          undoAction={restoreTransaction}
                        />
                      </div>
                    </td>
                  </ContextMenu>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <Badge tone="neutral">Tips</Badge>
        Klik kanan pada baris untuk salin nominal atau membatalkan transaksi.
        Transaksi yang dibatalkan tidak dihapus, hanya tidak dihitung — jejak audit
        tetap utuh.
      </p>
    </div>
  );
}

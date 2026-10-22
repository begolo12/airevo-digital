"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { ActionForm } from "@/components/ui/action-form";
import { Field, inputClass, selectClass, cx } from "@/components/ui";
import { updateTransaction } from "@/lib/data/actions";
import { formatIDR } from "@/lib/format";
import { AnimatedNumber } from "@/components/app/animated-number";

type TxType = "expense" | "income" | "transfer";

const TYPES: Array<{ value: TxType; label: string; hint: string }> = [
  { value: "expense", label: "Pengeluaran", hint: "Uang keluar" },
  { value: "income", label: "Pemasukan", hint: "Uang masuk" },
  { value: "transfer", label: "Transfer", hint: "Antar akun" },
];

const VISIBILITY = [
  { value: "household", label: "Dewasa saja", hint: "Terlihat semua anggota dewasa" },
  { value: "shared", label: "Semua anggota", hint: "Termasuk anak" },
  { value: "private", label: "Pribadi", hint: "Hanya Anda yang melihat" },
];

export type EditableTransaction = {
  id: string;
  type: TxType;
  amount: number;
  occurredAt: string;
  description: string;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  memberId?: string;
  visibility: string;
};

/**
 * Menyunting transaksi yang sudah ada.
 *
 * Sebelumnya satu-satunya cara memperbaiki salah catat adalah membatalkan lalu
 * mencatat ulang — meninggalkan dua baris di riwayat untuk satu kejadian.
 *
 * Isian sudah terisi nilai lama, jadi pengguna hanya mengubah yang salah.
 * Penyaringan kategori mengikuti jenis transaksi, sama seperti dialog catat.
 */
export function EditTransactionDialog({
  transaction,
  accounts,
  categories,
  members,
  trigger,
}: {
  transaction: EditableTransaction;
  accounts: Array<{ id: string; name: string; balance: number }>;
  categories: Array<{ id: string; name: string; kind: "income" | "expense" }>;
  members: Array<{ id: string; name: string }>;
  /** Tombol pemicu; bila kosong memakai label teks biasa. */
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TxType>(transaction.type);
  const [amount, setAmount] = useState(String(transaction.amount));

  const categoryOptions = categories.filter((category) =>
    type === "income" ? category.kind === "income" : category.kind === "expense",
  );

  const numericAmount = Number(amount);
  const amountValid = Number.isFinite(numericAmount) && numericAmount > 0;

  return (
    <>
      {trigger ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-left"
        >
          {trigger}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full border border-line-strong px-2.5 py-1 text-xs font-semibold text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink"
        >
          Sunting
        </button>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Sunting transaksi"
        description="Perubahan langsung masuk ke saldo dan laporan."
        size="lg"
      >
        <ActionForm
          action={updateTransaction}
          submitLabel="Simpan perubahan"
          onSuccess={() => setOpen(false)}
          className="grid gap-3.5 sm:grid-cols-2"
          footer={
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 items-center justify-center rounded-full border border-line-strong bg-card px-4 text-base font-semibold text-ink transition-colors hover:bg-paper-deep"
            >
              Batal
            </button>
          }
        >
          <input type="hidden" name="id" value={transaction.id} />

          {/* Jenis transaksi */}
          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-xs font-bold text-ink-soft">Jenis</legend>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map((option) => (
                <label
                  key={option.value}
                  className={cx(
                    "cursor-pointer rounded-[10px] border px-3 py-2 text-center transition-colors",
                    type === option.value
                      ? "border-emphasis bg-emphasis text-on-emphasis"
                      : "border-line-strong bg-card hover:bg-paper-deep",
                  )}
                >
                  <input
                    type="radio"
                    name="type"
                    value={option.value}
                    checked={type === option.value}
                    onChange={() => setType(option.value)}
                    className="sr-only"
                  />
                  <span className="block text-base font-bold">{option.label}</span>
                  <span
                    className={cx(
                      "block text-2xs",
                      type === option.value ? "text-on-emphasis/70" : "text-muted",
                    )}
                  >
                    {option.hint}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <Field label="Jumlah (Rp)">
            <input
              name="amount"
              type="number"
              min="1"
              step="1"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className={inputClass}
            />
            {/* Angka bergulir: perubahan nominal terasa sebagai gerak. */}
            <p
              className={`mt-1.5 text-xs font-semibold tnum ${
                amountValid ? "text-ink" : "text-muted"
              }`}
              aria-live="polite"
            >
              {amountValid ? (
                <AnimatedNumber value={numericAmount} format={formatIDR} />
              ) : (
                "Masukkan jumlah lebih dari nol."
              )}
            </p>
          </Field>

          <Field label="Tanggal">
            <input
              name="occurredAt"
              type="date"
              required
              defaultValue={transaction.occurredAt}
              className={inputClass}
            />
          </Field>

          <Field label="Deskripsi">
            <input
              name="description"
              required
              maxLength={200}
              defaultValue={transaction.description}
              className={inputClass}
            />
          </Field>

          <Field label={type === "transfer" ? "Dari akun" : "Akun"}>
            <select name="accountId" defaultValue={transaction.accountId} className={selectClass}>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </Field>

          {type === "transfer" ? (
            <Field label="Ke akun">
              <select
                name="toAccountId"
                defaultValue={transaction.toAccountId ?? ""}
                className={selectClass}
              >
                <option value="">— pilih akun tujuan —</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Kategori">
              <select
                name="categoryId"
                defaultValue={transaction.categoryId ?? ""}
                className={selectClass}
              >
                <option value="">— pilih kategori —</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Untuk anggota">
            <select
              name="memberId"
              defaultValue={transaction.memberId ?? ""}
              className={selectClass}
            >
              <option value="">— seluruh keluarga —</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Siapa yang bisa melihat">
            <select
              name="visibility"
              defaultValue={transaction.visibility}
              className={selectClass}
            >
              {VISIBILITY.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </ActionForm>
      </Dialog>
    </>
  );
}

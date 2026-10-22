"use client";

import { useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { ActionForm } from "@/components/ui/action-form";
import { Field, inputClass, selectClass, cx } from "@/components/ui";
import { createTransaction } from "@/lib/data/actions";
import { formatIDR } from "@/lib/format";
import { AnimatedNumber } from "@/components/app/animated-number";
import { Icon } from "@/components/ui/icon";

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

export type TransactionDialogProps = {
  accounts: Array<{ id: string; name: string; balance: number }>;
  categories: Array<{ id: string; name: string; kind: "income" | "expense" }>;
  members: Array<{ id: string; name: string }>;
  today: string;
  /** Label tombol pemicu. */
  label?: string;
  /** Gaya tombol pemicu, mis. `primary` di header atau `soft` di empty state. */
  triggerVariant?: "primary" | "soft";
  className?: string;
};

/**
 * Dialog catat transaksi.
 *
 * Sebelumnya form ini selalu terbuka sebagai kartu besar di atas daftar
 * transaksi. Akibatnya daftar — yang justru paling sering dilihat — terdorong
 * jauh ke bawah. Sekarang form hanya muncul saat dibutuhkan.
 *
 * Isian menyesuaikan jenis transaksi: kategori disaring sesuai pemasukan atau
 * pengeluaran, dan akun tujuan hanya muncul untuk transfer. Validasi tetap
 * dijalankan ulang di server; penyaringan di sini hanya membantu, bukan
 * pengaman.
 */
export function TransactionDialog({
  accounts,
  categories,
  members,
  today,
  label = "Tambah transaksi",
  triggerVariant = "primary",
  className,
}: TransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  /*
   * Saat tersimpan, dialog ditahan sebentar supaya animasi struk terlihat.
   * Tanpa jeda ini, dialog hilang seketika dan animasinya tidak pernah tampil.
   */
  const [justSaved, setJustSaved] = useState(false);

  const categoryOptions = useMemo(() => {
    if (type === "transfer") return [];
    return categories.filter((category) =>
      type === "income" ? category.kind === "income" : category.kind === "expense",
    );
  }, [categories, type]);

  const numericAmount = Number(amount);
  const amountValid = Number.isFinite(numericAmount) && numericAmount > 0;

  function resetForm() {
    setType("expense");
    setAmount("");
  }

  const triggerStyles =
    triggerVariant === "primary"
      ? "border-emphasis bg-emphasis text-on-emphasis hover:bg-emphasis-hover"
      : "border-line-strong bg-card text-ink hover:bg-paper-deep";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cx(
          "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors",
          triggerStyles,
          className,
        )}
      >
        <Icon name="plus" size={14} strokeWidth={2.4} />
        {label}
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Catat transaksi"
        description="Isi sekali, langsung masuk ke saldo dan laporan."
        size="lg"
        /*
         * Saat berhasil, dialog tidak hilang begitu saja — ia menyusut dan
         * meluncur ke bawah seperti struk keluar printer. Menjelaskan bahwa
         * data sudah masuk ke daftar, bukan sekadar menutup.
         */
        exitAnimation={justSaved ? "receipt" : undefined}
      >
        <ActionForm
          action={createTransaction}
          submitLabel="Simpan transaksi"
          resetOnSuccess
          onSuccess={() => {
            setJustSaved(true);
            window.setTimeout(() => {
              setOpen(false);
              setJustSaved(false);
              resetForm();
            }, 340);
          }}
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
          {/* Jenis transaksi: pilihan utama, jadi dibuat paling menonjol. */}
          <fieldset className="sm:col-span-full">
            <legend className="mb-1.5 text-base font-semibold text-ink-soft">
              Jenis
            </legend>
            <div className="grid grid-cols-3 gap-1 rounded-[10px] border border-line-strong bg-paper-deep/50 p-1">
              {TYPES.map((option) => {
                const active = type === option.value;
                return (
                  <label
                    key={option.value}
                    className={cx(
                      "flex cursor-pointer flex-col items-center gap-0.5 rounded-[7px] px-2 py-2 text-center transition-colors",
                      active
                        ? "bg-card text-ink shadow-[0_1px_2px_rgba(35,32,29,0.08)]"
                        : "text-ink-soft hover:text-ink",
                    )}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={option.value}
                      checked={active}
                      onChange={() => setType(option.value)}
                      className="sr-only"
                    />
                    <span className="text-base font-bold">{option.label}</span>
                    {/*
                      `text-ink-soft` (#4a443d), bukan `text-muted` dengan
                      opacity: teks 10px ber-opacity hanya mencapai 3.58:1 dan
                      gagal WCAG AA. Warna solid memberi 8.5:1.
                    */}
                    <span className="text-2xs leading-none text-ink-soft">
                      {option.hint}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <Field label="Jumlah (Rp)">
            <input
              name="amount"
              type="number"
              min={1}
              step={1}
              required
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className={inputClass}
              placeholder="150000"
              autoComplete="off"
            />
            {/*
              Angka bergulir saat pengguna mengetik: "150000" berubah menjadi
              "Rp150.000" lewat gerak, sehingga terasa sebagai nominal yang
              hidup — bukan teks yang muncul tiba-tiba.
            */}
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
              defaultValue={today}
              required
              className={inputClass}
            />
          </Field>

          <Field label="Deskripsi" className="sm:col-span-full">
            <input
              name="description"
              required
              maxLength={200}
              className={inputClass}
              placeholder={
                type === "income"
                  ? "Gaji bulanan"
                  : type === "transfer"
                    ? "Pindah dana ke tabungan"
                    : "Belanja dapur"
              }
              autoComplete="off"
            />
          </Field>

          <Field label={type === "transfer" ? "Dari akun" : "Akun"}>
            <select name="accountId" className={selectClass} required>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </Field>

          {type === "transfer" ? (
            <Field label="Ke akun">
              <select name="toAccountId" className={selectClass} required>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Kategori">
              <select name="categoryId" className={selectClass} required defaultValue="">
                <option value="" disabled>
                  — pilih kategori —
                </option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Anggota (opsional)">
            <select name="memberId" className={selectClass} defaultValue="">
              <option value="">— tidak terkait —</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Siapa yang bisa melihat">
            <select name="visibility" className={selectClass} defaultValue="household">
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

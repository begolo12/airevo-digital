"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { ActionButton, ActionForm } from "@/components/ui/action-form";
import { Badge, Field, inputClass, selectClass } from "@/components/ui";
import {
  createRecurringRule,
  deleteRecurringRule,
  toggleRecurringRule,
} from "@/lib/data/actions";
import { formatDate, formatIDR } from "@/lib/format";

/**
 * Pengelola aturan transaksi berulang.
 *
 * Aturan menyimpan **cetakan** transaksi, bukan transaksi masa depan — supaya
 * saldo hari ini tidak terlihat minus karena uang yang belum keluar.
 *
 * Halaman ini menjelaskan bedanya kepada pengguna, karena itu hal yang paling
 * mudah disalahpahami: "kenapa transaksi saya belum muncul di saldo?"
 */

export type RecurringRuleView = {
  id: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  description: string;
  accountName: string;
  categoryName?: string;
  frequency: "weekly" | "monthly" | "yearly";
  nextAt: string;
  endAt?: string;
  active: boolean;
  overdue: boolean;
};

const FREQUENCY_LABEL: Record<RecurringRuleView["frequency"], string> = {
  weekly: "mingguan",
  monthly: "bulanan",
  yearly: "tahunan",
};

export function RecurringManager({
  rules,
  accounts,
  categories,
  today,
}: {
  rules: RecurringRuleView[];
  accounts: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string; kind: "income" | "expense" }>;
  today: string;
}) {
  const [type, setType] = useState<"expense" | "income" | "transfer">("expense");

  const categoryOptions = categories.filter((category) =>
    type === "income" ? category.kind === "income" : category.kind === "expense",
  );

  return (
    <div className="space-y-4">
      {rules.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-line-strong px-3 py-6 text-center text-xs text-muted">
          Belum ada aturan berulang. Buat satu untuk gaji, langganan, atau
          cicilan yang datang setiap bulan.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-[10px] border border-line">
          {rules.map((rule) => (
            <li key={rule.id} className="px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 text-base font-semibold">
                    {rule.description}
                    <Badge tone="neutral">{FREQUENCY_LABEL[rule.frequency]}</Badge>
                    {rule.overdue ? <Badge tone="butter">jatuh tempo</Badge> : null}
                    {!rule.active ? <Badge tone="neutral">nonaktif</Badge> : null}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatIDR(rule.amount)} · {rule.accountName}
                    {rule.categoryName ? ` · ${rule.categoryName}` : ""}
                    {` · berikutnya ${formatDate(rule.nextAt)}`}
                    {rule.endAt ? ` · berakhir ${formatDate(rule.endAt)}` : ""}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <ActionButton
                    action={toggleRecurringRule}
                    fields={{ id: rule.id }}
                    label={rule.active ? "Matikan" : "Aktifkan"}
                    variant="soft"
                  />
                  <ActionButton
                    action={deleteRecurringRule}
                    fields={{ id: rule.id }}
                    label="Hapus"
                    variant="danger"
                    confirmText={`Hapus aturan "${rule.description}"?`}
                    confirmDescription="Transaksi yang sudah dibuat tetap tersimpan. Yang dihapus hanya aturannya."
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <details className="group rounded-[10px] border border-line">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2.5 text-base font-semibold text-ink-soft transition-colors hover:text-ink">
          <Icon
            name="chevron-right"
            size={11}
            strokeWidth={2.2}
            className="text-muted transition-transform group-open:rotate-90"
          />
          Buat aturan baru
        </summary>

        <div className="border-t border-line px-3 py-3">
          <ActionForm
            action={createRecurringRule}
            submitLabel="Simpan aturan"
            resetOnSuccess
            className="grid gap-3 sm:grid-cols-2"
          >
            <Field label="Jenis">
              <select
                name="type"
                value={type}
                onChange={(event) =>
                  setType(event.target.value as "expense" | "income" | "transfer")
                }
                className={selectClass}
              >
                <option value="expense">Pengeluaran</option>
                <option value="income">Pemasukan</option>
                <option value="transfer">Transfer</option>
              </select>
            </Field>

            <Field label="Frekuensi">
              <select name="frequency" defaultValue="monthly" className={selectClass}>
                <option value="weekly">Mingguan</option>
                <option value="monthly">Bulanan</option>
                <option value="yearly">Tahunan</option>
              </select>
            </Field>

            <Field label="Jumlah (Rp)">
              <input
                name="amount"
                type="number"
                min="1"
                step="1"
                required
                className={inputClass}
                placeholder="150000"
              />
            </Field>

            <Field label="Deskripsi">
              <input
                name="description"
                required
                maxLength={200}
                className={inputClass}
                placeholder="Langganan internet"
              />
            </Field>

            <Field label={type === "transfer" ? "Dari akun" : "Akun"}>
              <select name="accountId" required className={selectClass}>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </Field>

            {type === "transfer" ? (
              <Field label="Ke akun">
                <select name="toAccountId" className={selectClass}>
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
                <select name="categoryId" className={selectClass}>
                  <option value="">— pilih kategori —</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Mulai tanggal">
              <input
                name="startAt"
                type="date"
                required
                defaultValue={today}
                className={inputClass}
              />
            </Field>

            <Field label="Berakhir (opsional)">
              <input name="endAt" type="date" className={inputClass} />
            </Field>

            <Field label="Siapa yang bisa melihat">
              <select name="visibility" defaultValue="household" className={selectClass}>
                <option value="household">Dewasa saja</option>
                <option value="shared">Semua anggota</option>
                <option value="private">Pribadi</option>
              </select>
            </Field>
          </ActionForm>

          <p className="mt-2 text-2xs text-muted">
            Aturan tidak langsung membuat transaksi. Transaksi dibuat saat
            tanggalnya tiba, dan Anda mengonfirmasinya di dashboard.
          </p>
        </div>
      </details>
    </div>
  );
}

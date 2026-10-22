"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createOrder } from "@/lib/data/order-actions";
import type { ActionResult } from "@/lib/data/types";
import { Field, inputClass } from "@/components/ui";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-emphasis bg-emphasis px-6 text-sm font-semibold text-on-emphasis transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Membuat pesanan…" : label}
    </button>
  );
}

export function CheckoutForm({
  productId,
  priceLabel,
}: {
  productId: string;
  priceLabel: string;
}) {
  const [state, formAction] = useActionState(createOrder, null as ActionResult | null);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="productId" value={productId} />

      {state && !state.ok ? (
        <div
          role="alert"
          className="rounded-[10px] border border-tomato/40 bg-tomato/10 px-3 py-2.5 text-sm text-tomato-text"
        >
          <p className="font-semibold">{state.message ?? "Gagal membuat pesanan."}</p>
          {Object.keys(errors).length > 0 ? (
            <ul className="mt-1 list-inside list-disc text-xs">
              {Object.entries(errors).map(([field, message]) => (
                <li key={field}>{message}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <Field label="Nama lengkap" hint={errors.buyerName}>
        <input
          name="buyerName"
          required
          maxLength={100}
          autoComplete="name"
          className={inputClass}
          placeholder="Nama Anda"
        />
      </Field>

      <Field label="Email" hint={errors.email ?? "Lisensi dan akses dikirim ke email ini."}>
        <input
          name="email"
          type="email"
          required
          maxLength={160}
          autoComplete="email"
          className={inputClass}
          placeholder="nama@email.com"
        />
      </Field>

      <Field label="WhatsApp (opsional)" hint="Mempercepat konfirmasi pembayaran.">
        <input
          name="whatsapp"
          maxLength={30}
          autoComplete="tel"
          className={inputClass}
          placeholder="08xx xxxx xxxx"
        />
      </Field>

      <label className="flex gap-2.5 rounded-[10px] border border-line bg-paper-deep/40 px-3 py-2.5 text-base leading-relaxed text-ink-soft">
        <input type="checkbox" name="agree" className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-tomato)]" />
        <span>
          Saya paham ini pembelian sekali bayar sebesar {priceLabel} untuk akses
          seumur hidup, bukan langganan bulanan.
        </span>
      </label>
      {errors.agree ? (
        <p className="text-xs font-semibold text-danger">{errors.agree}</p>
      ) : null}

      <SubmitButton label={`Buat pesanan — ${priceLabel}`} />

      <p className="text-center text-xs leading-relaxed text-muted">
        Tidak ada tagihan berulang. Data hanya dipakai untuk menerbitkan lisensi.
      </p>
    </form>
  );
}

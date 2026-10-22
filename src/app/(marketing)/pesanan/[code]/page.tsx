import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { orderByCode, orderRow, orderStatusLabel } from "@/lib/data/orders";
import { formatIDR } from "@/lib/format";
import { Badge } from "@/components/ui";
import { Icon } from "@/components/ui/icon";

export async function generateMetadata({
  params,
}: PageProps<"/pesanan/[code]">): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Pesanan ${code.toUpperCase()}`,
    robots: { index: false, follow: false },
  };
}

const statusTone = {
  pending: "butter",
  paid: "mint",
  cancelled: "neutral",
  expired: "neutral",
} as const;

export default async function OrderPage({ params }: PageProps<"/pesanan/[code]">) {
  const { code } = await params;
  const order = orderByCode(decodeURIComponent(code));
  if (!order) notFound();

  const row = orderRow(order);
  const product = row.product;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="label-eyebrow">Pesanan</p>
        <Badge tone={statusTone[row.status]}>{orderStatusLabel[row.status]}</Badge>
      </div>

      <h1 className="mt-3 font-mono text-[clamp(1.8rem,4vw,2.6rem)] leading-tight tracking-tight">
        {row.code}
      </h1>
      <p className="mt-2 text-md text-ink-soft">
        {product ? product.name : row.productName} · lisensi seumur hidup ·{" "}
        {formatIDR(row.amount)}
      </p>

      {row.status === "paid" ? (
        <section className="mt-8 rounded-[16px] border border-mint-deep bg-mint/35 p-6">
          <h2 className="text-lg">Pembayaran diterima</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Akses untuk <strong>{row.email}</strong> sudah aktif. Masuk memakai email
            ini untuk membuka aplikasi.
          </p>

          {row.licenseKey ? (
            <div className="mt-4 rounded-[10px] border border-line bg-card px-4 py-3">
              <p className="label-eyebrow">Kunci lisensi</p>
              <p className="mt-1 font-mono text-sm font-bold tracking-wide">
                {row.licenseKey}
              </p>
              <p className="mt-1 text-xs text-muted">
                Simpan kunci ini sebagai bukti pembelian.
              </p>
            </div>
          ) : null}

          {product ? (
            <Link
              href={product.href}
              {...(product.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-full border border-emphasis bg-emphasis px-5 text-sm font-semibold text-on-emphasis hover:bg-ink-soft"
            >
              Buka {product.name}
              <Icon name="arrow-right" size={14} strokeWidth={2.2} />
            </Link>
          ) : null}
        </section>
      ) : null}

      {row.status === "pending" ? (
        <section className="mt-8 rounded-[16px] border border-line-strong bg-card p-6">
          <h2 className="text-lg">Instruksi pembayaran</h2>
          <p className="mt-1 text-sm text-muted">
            Selesaikan sebelum {row.expiresLabel} agar pesanan tidak kedaluwarsa.
          </p>

          {row.bankAccount ? (
            <dl className="mt-4 grid gap-3 rounded-[12px] border border-line bg-paper-deep/50 p-4 sm:grid-cols-3">
              {[
                ["Bank", row.bankAccount.bank],
                ["Nomor", row.bankAccount.number],
                ["Atas nama", row.bankAccount.holder],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {label}
                  </dt>
                  <dd className="mt-0.5 text-sm font-bold">{value}</dd>
                </div>
              ))}
              <div className="sm:col-span-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Nominal
                </dt>
                <dd className="mt-0.5 text-lg font-black tnum">
                  {formatIDR(row.amount)}
                </dd>
              </div>
            </dl>
          ) : null}

          {row.instructions && row.instructions.length > 0 ? (
            <ol className="mt-4 space-y-2.5">
              {row.instructions.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm text-ink-soft">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink text-2xs font-black text-on-emphasis">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          ) : null}

          <p className="mt-5 border-t border-line pt-4 text-base text-muted">
            Sudah transfer? Kirim bukti ke{" "}
            <Link
              href="/contact"
              className="font-semibold text-ink underline underline-offset-2"
            >
              halaman kontak
            </Link>{" "}
            dengan menyertakan kode pesanan <strong>{row.code}</strong>.
          </p>
        </section>
      ) : null}

      {row.status === "cancelled" || row.status === "expired" ? (
        <section className="mt-8 rounded-[16px] border border-line bg-card p-6">
          <h2 className="text-lg">
            {row.status === "cancelled" ? "Pesanan dibatalkan" : "Pesanan kedaluwarsa"}
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            Pesanan ini tidak lagi aktif. Anda bisa membuat pesanan baru kapan saja.
          </p>
          {product ? (
            <Link
              href={`/beli/${product.id}`}
              className="mt-4 inline-flex h-11 items-center rounded-full border border-emphasis bg-emphasis px-5 text-sm font-semibold text-on-emphasis hover:bg-ink-soft"
            >
              Buat pesanan baru
            </Link>
          ) : null}
        </section>
      ) : null}

      <dl className="mt-8 divide-y divide-line rounded-[14px] border border-line bg-card text-sm">
        {[
          ["Nama", row.buyerName],
          ["Email", row.email],
          ["Dibuat", row.createdLabel],
          ["Metode", row.method === "bank_transfer" ? "Transfer bank" : row.method],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 px-4 py-2.5">
            <dt className="text-muted">{label}</dt>
            <dd className="text-right font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-6 text-center text-xs text-muted">
        Simpan alamat halaman ini untuk mengecek status pesanan.
      </p>
    </div>
  );
}

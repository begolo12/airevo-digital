import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSellableApp } from "@/config/apps";
import { CheckoutForm } from "@/components/marketing/checkout-form";
import { formatIDR } from "@/lib/format";
import { Badge } from "@/components/ui";
import { Icon } from "@/components/ui/icon";

export async function generateMetadata({
  params,
}: PageProps<"/beli/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const app = getSellableApp(slug);
  return {
    title: app ? `Beli ${app.name}` : "Beli aplikasi",
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutPage({ params }: PageProps<"/beli/[slug]">) {
  const { slug } = await params;
  const app = getSellableApp(slug);
  if (!app?.pricing) notFound();

  const priceLabel = formatIDR(app.pricing.price);

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-14 sm:px-8 sm:py-20">
      <Link
        href={app.marketingHref}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
      >
        <Icon name="arrow-left" size={14} strokeWidth={2.2} />
        Kembali ke {app.name}
      </Link>

      <header className="mt-6 max-w-xl">
        <p className="label-eyebrow">Pembelian</p>
        <h1 className="mt-2 text-[clamp(1.9rem,4.2vw,2.8rem)] leading-tight">
          Selesaikan pesanan Anda.
        </h1>
        <p className="mt-3 text-md leading-relaxed text-ink-soft">
          Isi data di bawah untuk membuat kode pesanan. Setelah itu Anda akan
          mendapat instruksi pembayaran.
        </p>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_0.85fr]">
        <div className="rounded-[16px] border border-line-strong bg-card p-6">
          <CheckoutForm productId={app.id} priceLabel={priceLabel} />
        </div>

        <aside className="space-y-4">
          <div className="note p-5">
            <p className="label-eyebrow">Ringkasan</p>
            <div className="mt-3 flex items-start justify-between gap-3 border-b border-line pb-3">
              <div>
                <p className="text-sm font-bold">{app.name}</p>
                <p className="mt-0.5 text-sm text-muted">
                  Lisensi seumur hidup
                </p>
              </div>
              <p className="text-sm tnum font-bold">{priceLabel}</p>
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-xl font-black tnum">{priceLabel}</span>
            </div>
            <div className="mt-3">
              <Badge tone="mint">Sekali bayar · tanpa langganan</Badge>
            </div>
          </div>

          <div className="rounded-[14px] border border-line bg-paper-deep/50 px-4 py-4">
            <p className="text-base font-bold">Yang Anda dapat</p>
            <ul className="mt-2 space-y-1.5 text-base text-ink-soft">
              {app.pricing.license.includes.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden="true" className="text-positive">✓</span>
                  {item}
                </li>
              ))}
              <li className="flex gap-2">
                <span aria-hidden="true" className="text-positive">✓</span>
                {app.pricing.license.seats}
              </li>
            </ul>
          </div>

          <p className="px-1 text-xs leading-relaxed text-muted">
            Pembayaran saat ini diverifikasi manual, biasanya dalam 1×24 jam pada
            hari kerja. Belum ada tagihan berulang di kemudian hari.
          </p>
        </aside>
      </div>
    </div>
  );
}

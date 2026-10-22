import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { accentClasses, getVisibleApp, visibleApps } from "@/config/apps";
import { formatIDR } from "@/lib/format";
import { Badge } from "@/components/ui";
import { Icon } from "@/components/ui/icon";

export function generateStaticParams() {
  return visibleApps.map((app) => ({ slug: app.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/aplikasi/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const app = getVisibleApp(slug);
  if (!app) return { title: "Aplikasi tidak ditemukan" };
  return {
    title: app.name,
    description: app.description,
    alternates: { canonical: `/aplikasi/${app.id}` },
    openGraph: { title: `${app.name} — Airevo Digital`, description: app.description },
  };
}

const statusLabel = {
  available: "Tersedia",
  soon: "Segera",
  retired: "Diarsipkan",
} as const;

export default async function AppDetailPage({
  params,
}: PageProps<"/aplikasi/[slug]">) {
  const { slug } = await params;
  const app = getVisibleApp(slug);
  if (!app) notFound();

  const accent = accentClasses[app.accent];
  const pricing = app.pricing;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
      <Link
        href="/aplikasi"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
      >
        <Icon name="arrow-left" size={14} strokeWidth={2.2} />
        Semua aplikasi
      </Link>

      <div className="mt-8 grid gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="flex items-center gap-3">
            <div
              className={`grid h-12 w-12 place-items-center rounded-[13px] border text-lg font-black ${accent.bg} ${accent.border}`}
              aria-hidden="true"
            >
              {app.name.slice(0, 1)}
            </div>
            <Badge tone={app.status === "available" ? "mint" : "neutral"}>
              {statusLabel[app.status]}
            </Badge>
            <span className="text-xs text-muted">v{app.version}</span>
          </div>

          <h1 className="mt-5 text-[clamp(2.2rem,5vw,3.4rem)] leading-[1.02]">
            {app.name}
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-soft">
            {app.description}
          </p>
          <p className="mt-3 max-w-xl text-sm text-muted">{app.audience}</p>

          <div className="mt-8">
            <p className="label-eyebrow">Yang bisa dilakukan</p>
            <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {app.features.map((feature) => (
                <li key={feature} className="flex gap-2.5 text-sm text-ink-soft">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-mint/70 text-2xs font-black text-ink"
                  >
                    ✓
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-8 text-xs text-muted">
            Terakhir diperbarui {app.lastUpdated}.
          </p>
        </div>

        {/* Kartu harga */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          {pricing ? (
            <div className="note p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="label-eyebrow">Harga</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl leading-none font-black tnum">
                      {formatIDR(pricing.price)}
                    </span>
                    {pricing.compareAt ? (
                      <span className="text-sm tnum text-muted line-through">
                        {formatIDR(pricing.compareAt)}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-ink-soft">
                    Sekali bayar, bukan per bulan
                  </p>
                </div>
                <Badge tone="mint">Tanpa langganan</Badge>
              </div>

              <ul className="mt-5 space-y-2 border-t border-line pt-4 text-sm text-ink-soft">
                {pricing.license.includes.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span aria-hidden="true" className="mt-0.5 text-positive">✓</span>
                    {item}
                  </li>
                ))}
              </ul>

              <dl className="mt-5 space-y-2.5 border-t border-line pt-4 text-base">
                {[
                  ["Untuk", pricing.license.seats],
                  ["Pembaruan", pricing.license.updates],
                  ["Dukungan", pricing.license.support],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-3">
                    <dt className="w-20 shrink-0 font-semibold text-muted">{label}</dt>
                    <dd className="text-ink-soft">{value}</dd>
                  </div>
                ))}
              </dl>

              <Link
                href={`/beli/${app.id}`}
                className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-emphasis bg-emphasis px-6 text-sm font-semibold text-on-emphasis hover:bg-ink-soft"
              >
                Beli sekarang
                <Icon name="arrow-right" size={14} strokeWidth={2.2} />
              </Link>

              <p className="mt-3 text-center text-xs text-muted">
                Sudah punya lisensi?{" "}
                <Link
                  href={app.href}
                  {...(app.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="font-semibold text-ink underline underline-offset-2"
                >
                  Masuk ke aplikasi
                </Link>
              </p>
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-line-strong bg-card/60 p-6">
              <p className="label-eyebrow">Harga</p>
              <p className="mt-2 text-lg font-bold">Belum dijual</p>
              <p className="mt-1 text-sm text-muted">
                Aplikasi ini belum dibuka untuk pembelian. Hubungi kami bila ingin
                tahu lebih dulu.
              </p>
              <Link
                href="/contact"
                className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full border border-line-strong bg-card px-6 text-sm font-semibold text-ink hover:bg-paper-deep"
              >
                Tanya ketersediaan
              </Link>
            </div>
          )}

          <div className="mt-4 rounded-[14px] border border-line bg-paper-deep/50 px-4 py-3">
            <p className="text-base font-semibold">Butuh sesuatu yang berbeda?</p>
            <p className="mt-1 text-base text-muted">
              Aplikasi ini bisa disesuaikan.{" "}
              <Link
                href="/contact"
                className="font-semibold text-ink underline underline-offset-2"
              >
                Ceritakan kebutuhan Anda
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

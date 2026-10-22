import Link from "next/link";
import { accentClasses, type AppEntry } from "@/config/apps";
import { formatIDR } from "@/lib/format";
import { Badge, cx } from "@/components/ui";
import { Icon } from "@/components/ui/icon";

const statusLabel: Record<AppEntry["status"], string> = {
  available: "Tersedia",
  soon: "Segera",
  retired: "Diarsipkan",
};

export function AppCard({ app, index = 0 }: { app: AppEntry; index?: number }) {
  const accent = accentClasses[app.accent];
  const tilt = index % 3 === 0 ? "note-tilt-left" : index % 3 === 1 ? "" : "note-tilt-right";
  const pricing = app.pricing;

  return (
    <article
      className={cx(
        "note group relative flex h-full flex-col gap-4 p-5 transition-transform duration-200 hover:-translate-y-1",
        tilt,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cx(
            "grid h-11 w-11 place-items-center rounded-[12px] border text-base font-black",
            accent.bg,
            accent.border,
            accent.text,
          )}
          aria-hidden="true"
        >
          {app.name.slice(0, 1)}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge tone={app.status === "available" ? "mint" : "neutral"}>
            {statusLabel[app.status]}
          </Badge>
          <span className="text-xs text-muted">v{app.version}</span>
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-lg leading-tight">{app.name}</h3>
        <p className="mt-1.5 text-sm text-muted">{app.tagline}</p>
      </div>

      <ul className="space-y-1.5 text-base text-ink-soft">
        {app.features.slice(0, 3).map((feature) => (
          <li key={feature} className="flex gap-2">
            <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-tomato" />
            {feature}
          </li>
        ))}
      </ul>

      {pricing ? (
        <div className="rounded-[10px] border border-line bg-paper-deep/50 px-3 py-2.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-black tnum">{formatIDR(pricing.price)}</span>
            <span className="text-xs font-semibold text-muted">sekali bayar</span>
          </div>
          <p className="mt-0.5 text-xs leading-snug text-muted">
            Akses seumur hidup, tanpa langganan.
          </p>
        </div>
      ) : (
        <div className="rounded-[10px] border border-dashed border-line-strong px-3 py-2.5">
          <p className="text-base font-semibold text-muted">Belum dijual</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <Link
          href={app.marketingHref}
          className="text-sm font-semibold text-ink underline decoration-line-strong decoration-2 underline-offset-4 hover:decoration-tomato"
        >
          Lihat detail
        </Link>
        {pricing ? (
          <Link
            href={`/beli/${app.id}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-emphasis bg-emphasis px-4 text-base font-bold text-on-emphasis hover:bg-ink-soft"
          >
            Beli
            <Icon name="arrow-right" size={13} strokeWidth={2.2} />
          </Link>
        ) : (
          <span className="text-base font-semibold text-muted">Segera</span>
        )}
      </div>
    </article>
  );
}

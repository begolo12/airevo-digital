import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "Work",
  description: "Case study Airevo Digital: masalah, proses, solusi, dan hasil.",
  alternates: { canonical: "/work" },
};

const cases = [
  {
    slug: "keluarga",
    title: "Satu tempat untuk uang, rencana, dan ritme rumah",
    category: "Produk",
    year: "2026",
    metric: "Pencatatan transaksi turun dari 2 menit ke 15 detik",
    summary:
      "Merancang aplikasi keluarga yang dipakai harian: arus kas, anggaran, tagihan, tujuan, dan agenda — tanpa spreadsheet.",
  },
];

export default function WorkPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
      <header className="max-w-2xl">
        <p className="label-eyebrow">Work</p>
        <h1 className="mt-3 text-[clamp(2.2rem,5vw,3.4rem)] leading-[1.02]">
          Bukti, bukan janji.
        </h1>
        <p className="mt-4 text-lg text-ink-soft">
          Setiap case study menuliskan masalah, keputusan, dan hasil — termasuk yang
          belum berjalan sempurna.
        </p>
      </header>

      <div className="mt-12 grid gap-6">
        {cases.map((item) => (
          <article
            key={item.slug}
            className="note group grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-center"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="font-semibold text-ink">{item.category}</span>
                <span aria-hidden="true">·</span>
                <span className="tnum">{item.year}</span>
              </div>
              <h2 className="mt-2 text-xl leading-snug">{item.title}</h2>
              <p className="mt-2 max-w-xl text-sm text-muted">{item.summary}</p>
              <p className="mt-3 text-sm font-semibold text-positive">{item.metric}</p>
            </div>
            <Link
              href={`/aplikasi/${item.slug}`}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-line-strong bg-paper px-5 text-sm font-semibold hover:bg-paper-deep"
            >
              Lihat aplikasi
              <Icon name="arrow-right" size={14} strokeWidth={2.2} />
            </Link>
          </article>
        ))}
      </div>

      <p className="mt-12 max-w-2xl text-sm text-muted">
        Case study lain sedang disiapkan. Kalau ingin melihat proses kerja secara
        langsung,{" "}
        <Link href="/contact" className="font-semibold text-ink underline decoration-line-strong underline-offset-4">
          mulai percakapan
        </Link>
        .
      </p>
    </div>
  );
}

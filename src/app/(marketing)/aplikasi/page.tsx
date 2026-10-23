import type { Metadata } from "next";
import Link from "next/link";
import { visibleApps } from "@/config/apps";
import { AppCard } from "@/components/marketing/app-card";
import { isCheckoutOpen } from "@/lib/payments";
import { Badge } from "@/components/ui";

export const metadata: Metadata = {
  title: "Aplikasi",
  description:
    "Aplikasi Airevo Digital. Sekali beli, akses seumur hidup, tanpa langganan.",
  alternates: { canonical: "/aplikasi" },
};

const promises = [
  {
    title: "Sekali bayar",
    body: "Tidak ada tagihan bulanan atau tahunan. Harga yang tertera adalah biaya total.",
  },
  {
    title: "Akses seumur hidup",
    body: "Selama aplikasinya berjalan, akun Anda tetap bisa dipakai tanpa biaya tambahan.",
  },
  {
    title: "Pembaruan termasuk",
    body: "Perbaikan dan versi baru masuk otomatis, tanpa biaya upgrade.",
  },
];

export default function AppsPage() {
  const checkoutOpen = isCheckoutOpen();

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
      <header className="max-w-2xl">
        <p className="label-eyebrow">Aplikasi</p>
        <h1 className="mt-3 text-[clamp(2.2rem,5vw,3.4rem)] leading-[1.02]">
          Beli sekali. Pakai terus.
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">
          Setiap aplikasi punya harga sendiri dan dibeli terpisah — Anda hanya
          membayar untuk yang benar-benar dipakai. Tidak ada langganan, tidak ada
          biaya tersembunyi.
        </p>
      </header>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {promises.map((item) => (
          <div
            key={item.title}
            className="rounded-[14px] border border-line bg-card px-4 py-4"
          >
            <p className="text-sm font-bold">{item.title}</p>
            <p className="mt-1 text-base leading-relaxed text-muted">
              {item.body}
            </p>
          </div>
        ))}
      </div>

      <section className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl">Katalog</h2>
            <p className="mt-1 text-sm text-muted">
              {visibleApps.length} aplikasi tersedia saat ini.
            </p>
          </div>
          <Badge tone="butter">Harga sekali bayar</Badge>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleApps.map((app, index) => (
            <AppCard key={app.id} app={app} index={index} checkoutOpen={checkoutOpen} />
          ))}
        </div>
      </section>

      <aside className="mt-16 rounded-[16px] border border-line-strong bg-card p-6">
        <h2 className="text-base">Cara membeli</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-4">
          {[
            { step: "01", title: "Pilih aplikasi", body: "Baca detail dan fiturnya." },
            { step: "02", title: "Isi data", body: "Nama dan email untuk lisensi." },
            { step: "03", title: "Bayar sekali", body: "Transfer atau kanal lain." },
            { step: "04", title: "Langsung pakai", body: "Akses aktif setelah terverifikasi." },
          ].map((item) => (
            <li key={item.step}>
              <span className="text-xs font-bold tracking-widest text-tomato-text">
                {item.step}
              </span>
              <p className="mt-1 text-sm font-semibold">{item.title}</p>
              <p className="mt-0.5 text-base text-muted">{item.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-5 border-t border-line pt-4 text-sm text-muted">
          Sudah punya lisensi?{" "}
          <Link
            href="/login"
            className="font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-tomato"
          >
            Masuk di sini
          </Link>
          .
        </p>
      </aside>
    </div>
  );
}

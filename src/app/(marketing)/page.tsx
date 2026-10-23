import Link from "next/link";
import { sellableApps, visibleApps } from "@/config/apps";
import { site } from "@/config/site";
import { AppCard } from "@/components/marketing/app-card";
import { formatIDR } from "@/lib/format";
import { Badge, Note } from "@/components/ui";
import { Icon } from "@/components/ui/icon";

const services = [
  {
    title: "Web App",
    body: "Aplikasi yang mengikuti alur kerja Anda, bukan template yang dipaksakan.",
    accent: "bg-butter/60 border-butter-deep",
  },
  {
    title: "Internal Tools",
    body: "Dashboard operasional, manajemen proyek, dan alat internal yang mengurangi kerja manual.",
    accent: "bg-sky/50 border-sky-deep",
  },
  {
    title: "Produk",
    body: "Dari ide sampai rilis: data, keamanan, desain, dan perawatan setelahnya.",
    accent: "bg-mint/50 border-mint-deep",
  },
];

const process = [
  { step: "01", title: "Discover", body: "Pahami pekerjaan, batasan, dan target." },
  { step: "02", title: "Design", body: "Petakan alur, pilih arah visual." },
  { step: "03", title: "Build", body: "Vertical slice, test, preview." },
  { step: "04", title: "Launch", body: "Migrasi data, latih pengguna, rilis." },
  { step: "05", title: "Improve", body: "Ukur, perbaiki, ulangi." },
];

const whyOnce = [
  {
    title: "Tanpa tagihan bulanan",
    body: "Sekali bayar di awal, lalu selesai. Tidak ada biaya yang muncul tiba-tiba.",
  },
  {
    title: "Tidak perlu langganan",
    body: "Aplikasi tetap bisa dipakai walau Anda berhenti memakainya sebulan.",
  },
  {
    title: "Pembaruan termasuk",
    body: "Perbaikan dan versi baru masuk otomatis, tanpa biaya upgrade.",
  },
];

export default function HomePage() {
  const cheapest = sellableApps.reduce<number | null>(
    (min, app) =>
      app.pricing && (min === null || app.pricing.price < min) ? app.pricing.price : min,
    null,
  );

  return (
    <>
      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-5 pt-14 pb-16 sm:px-8 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="label-eyebrow">Software studio · {site.location}</p>
            <h1 className="mt-4 text-[clamp(2.6rem,6.4vw,4.4rem)] leading-[0.98]">
              Software yang dipakai,
              <br />
              <span className="relative inline-block">
                <span className="relative z-10">bukan hanya dipamerkan.</span>
                <span
                  aria-hidden="true"
                  className="absolute bottom-1 left-0 z-0 h-3 w-[97%] -rotate-[0.6deg] bg-butter/80 sm:h-4"
                />
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
              Airevo Digital membuat dua hal: aplikasi siap pakai yang bisa Anda beli
              sekali dan langsung gunakan, serta aplikasi khusus yang dibangun sesuai
              cara kerja Anda.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/aplikasi"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-emphasis bg-emphasis px-6 text-md font-semibold text-on-emphasis transition-colors hover:bg-ink-soft"
              >
                Lihat aplikasi
                <Icon name="arrow-right" size={15} strokeWidth={2.2} />
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-12 items-center rounded-full border border-line-strong bg-card px-6 text-md font-semibold text-ink transition-colors hover:bg-paper-deep"
              >
                Mulai percakapan
              </Link>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-x-4 gap-y-3 border-t border-line pt-6">
              {[
                { k: String(visibleApps.length), v: "aplikasi siap pakai" },
                {
                  k: cheapest ? formatIDR(cheapest) : "—",
                  v: "mulai dari, sekali bayar",
                },
                { k: "0", v: "langganan bulanan" },
              ].map((item) => (
                <div key={item.v} className="min-w-0">
                  <dt className="text-[clamp(1.125rem,4.8vw,1.75rem)] leading-tight font-black tnum whitespace-nowrap">
                    {item.k}
                  </dt>
                  <dd className="mt-1 text-sm leading-snug text-muted">{item.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Papan meja dapur — menampilkan produk unggulan */}
          <div className="relative">
            <div className="grid-paper absolute -inset-4 -z-10 rounded-[26px] opacity-60" aria-hidden="true" />
            <div className="grid grid-cols-2 gap-4">
              <Note tape className="col-span-2 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="label-eyebrow">Aplikasi unggulan</p>
                    <p className="mt-2 text-2xl leading-none font-black">Keluarga</p>
                    <p className="mt-1.5 text-sm text-muted">
                      Uang, rencana, dan ritme rumah.
                    </p>
                  </div>
                  <Badge tone="mint">Tersedia</Badge>
                </div>
                <div className="mt-4 flex items-end justify-between gap-3 border-t border-line pt-3">
                  <div>
                    <p className="text-lg font-black tnum">
                      {sellableApps[0]?.pricing
                        ? formatIDR(sellableApps[0].pricing.price)
                        : "—"}
                    </p>
                    <p className="text-xs text-muted">sekali bayar</p>
                  </div>
                  <Link
                    href="/aplikasi"
                    className="inline-flex h-8 items-center rounded-full border border-emphasis bg-emphasis px-3.5 text-xs font-bold text-on-emphasis hover:bg-ink-soft"
                  >
                    Lihat
                  </Link>
                </div>
              </Note>

              <Note tilt="left" className="p-4">
                <p className="hand text-lg text-tomato-text">tanpa langganan</p>
                <p className="mt-1 text-base text-muted">
                  Bayar sekali, pakai terus
                </p>
                <ul className="mt-3 space-y-1.5">
                  {["Tanpa tagihan bulanan", "Pembaruan termasuk", "Akses seumur hidup"].map(
                    (item) => (
                      <li
                        key={item}
                        className="flex items-center gap-1.5 rounded-lg bg-paper-deep/70 px-2.5 py-1.5 text-xs font-semibold"
                      >
                        <span aria-hidden="true" className="text-positive">✓</span>
                        {item}
                      </li>
                    ),
                  )}
                </ul>
              </Note>

              <Note tilt="right" className="flex flex-col p-4">
                <p className="label-eyebrow">Isi lisensi</p>
                <ul className="mt-2 space-y-1 text-xs text-ink-soft">
                  {["Semua fitur", "Hingga 6 anggota", "Dukungan email"].map((item) => (
                    <li key={item} className="flex gap-1.5">
                      <span aria-hidden="true" className="text-positive">·</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="hand mt-auto pt-3 text-base text-ink-soft">
                  sekali beli, selesai
                </p>
              </Note>
            </div>
          </div>
        </div>
      </section>

      {/* Produk */}
      <section className="border-y border-line bg-paper-deep/40">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="label-eyebrow">Aplikasi</p>
              <h2 className="mt-2 text-[clamp(1.75rem,3.6vw,2.5rem)]">
                Siap dipakai hari ini.
              </h2>
              <p className="mt-3 text-md text-muted">
                Tiap aplikasi dijual terpisah dengan harga sendiri. Beli yang Anda
                butuhkan saja.
              </p>
            </div>
            <Link
              href="/aplikasi"
              className="text-sm font-semibold underline decoration-line-strong decoration-2 underline-offset-4 hover:decoration-tomato"
            >
              Semua aplikasi
            </Link>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleApps.map((app, index) => (
              <AppCard key={app.id} app={app} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Kenapa sekali beli */}
      <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
        <p className="label-eyebrow">Model harga</p>
        <h2 className="mt-2 max-w-2xl text-[clamp(1.75rem,3.6vw,2.5rem)]">
          Sekali bayar, bukan langganan.
        </h2>
        <p className="mt-3 max-w-2xl text-md leading-relaxed text-ink-soft">
          Saya tidak menagih Anda setiap bulan untuk sesuatu yang sudah Anda beli.
          Harga yang tertera adalah biaya totalnya.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {whyOnce.map((item) => (
            <div
              key={item.title}
              className="rounded-[16px] border border-line bg-card p-6"
            >
              <h3 className="text-lg">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Layanan */}
      <section className="border-y border-line bg-paper-deep/40">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
          <p className="label-eyebrow">Layanan</p>
          <h2 className="mt-2 max-w-2xl text-[clamp(1.75rem,3.6vw,2.5rem)]">
            Butuh sesuatu yang belum ada?
          </h2>
          <p className="mt-3 max-w-2xl text-md text-ink-soft">
            Selain aplikasi siap pakai, saya juga mengerjakan aplikasi khusus untuk
            bisnis dan tim.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {services.map((service, i) => (
              <div
                key={service.title}
                className={`rounded-[16px] border p-6 ${service.accent} ${i === 1 ? "md:translate-y-3" : ""}`}
              >
                <h3 className="text-lg">{service.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{service.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Proses */}
      <section className="bg-emphasis text-on-emphasis">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
          <p className="label-eyebrow !text-butter-on-emphasis">Proses</p>
          <h2 className="mt-2 max-w-2xl text-[clamp(1.75rem,3.6vw,2.5rem)]">
            Lima langkah, tanpa drama.
          </h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {process.map((item) => (
              <li key={item.step} className="border-t border-paper/25 pt-4">
                <span className="text-xs font-bold tracking-widest text-butter-on-emphasis">{item.step}</span>
                <h3 className="mt-2 text-base text-on-emphasis">{item.title}</h3>
                <p className="mt-1 text-sm text-on-emphasis/70">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
        <div className="relative overflow-hidden rounded-[24px] border border-line-strong bg-card p-8 sm:p-12">
          <div className="grid-paper absolute inset-0 opacity-40" aria-hidden="true" />
          <div className="relative max-w-2xl">
            <p className="hand text-2xl text-tomato-text">masih pakai spreadsheet?</p>
            <h2 className="mt-2 text-[clamp(1.75rem,4vw,2.75rem)]">
              Mulai dari satu aplikasi dulu.
            </h2>
            <p className="mt-3 text-md text-ink-soft">
              Pilih yang paling dekat dengan masalah Anda, atau ceritakan pekerjaan
              yang ingin dirapikan.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/aplikasi"
                className="inline-flex h-12 items-center rounded-full border border-emphasis bg-emphasis px-6 text-sm font-semibold text-on-emphasis hover:bg-ink-soft"
              >
                Lihat aplikasi
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-12 items-center rounded-full border border-line-strong bg-paper px-6 text-sm font-semibold text-ink hover:bg-paper-deep"
              >
                Mulai percakapan
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Tentang",
  description:
    "Siapa di balik Airevo Digital, cara kerja, dan prinsip yang dipakai.",
  alternates: { canonical: "/about" },
};

const principles = [
  {
    title: "Alur dulu, tampilan kemudian",
    body: "Desain yang cantik tidak menolong kalau alurnya membingungkan. Saya mulai dari pekerjaan yang ingin diselesaikan.",
  },
  {
    title: "Rapi secara teknis",
    body: "Type safety, test, aksesibilitas, dan keamanan bukan tambahan di akhir — itu bagian dari pekerjaan.",
  },
  {
    title: "Sederhana dulu",
    body: "Solusi paling kecil yang benar lebih baik daripada arsitektur besar yang belum dibutuhkan.",
  },
  {
    title: "Terlihat progresnya",
    body: "Preview, catatan keputusan, dan hasil yang bisa dicoba, bukan laporan panjang tanpa bukti.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
      <div className="grid gap-14 lg:grid-cols-[1fr_0.85fr]">
        <div>
          <p className="label-eyebrow">Tentang</p>
          <h1 className="mt-3 text-[clamp(2.2rem,5vw,3.4rem)] leading-[1.02]">
            Halo, saya Irvan.
          </h1>
          <div className="mt-6 space-y-4 text-lg leading-relaxed text-ink-soft">
            <p>
              Saya membangun Airevo Digital untuk membuat software yang biasanya hanya
              dimiliki perusahaan besar bisa dipakai bisnis kecil dan keluarga.
            </p>
            <p>
              Fokus saya adalah aplikasi yang benar-benar dipakai: alur yang jelas,
              data yang rapi, dan antarmuka yang tidak membuat orang berpikir dua kali.
            </p>
            <p>
              Saya bekerja langsung dengan pemilik pekerjaan — tanpa lapisan perantara,
              tanpa janji yang tidak bisa dibuktikan.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="inline-flex h-12 items-center rounded-full border border-emphasis bg-emphasis px-6 text-sm font-semibold text-on-emphasis hover:bg-ink-soft"
            >
              Mulai percakapan
            </Link>
            <a
              href={`mailto:${site.email}`}
              className="inline-flex h-12 items-center rounded-full border border-line-strong bg-card px-6 text-sm font-semibold text-ink hover:bg-paper-deep"
            >
              {site.email}
            </a>
          </div>
        </div>

        <div className="rounded-[18px] border border-line-strong bg-card p-6">
          <p className="label-eyebrow">Keahlian</p>
          <ul className="mt-4 space-y-2.5 text-sm text-ink-soft">
            {[
              "Next.js, React, TypeScript",
              "PostgreSQL, Drizzle, data modelling",
              "Desain antarmuka & design system",
              "Aksesibilitas dan performa",
              "Auth, keamanan, dan deployment",
            ].map((skill) => (
              <li key={skill} className="flex gap-2.5">
                <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-tomato" />
                {skill}
              </li>
            ))}
          </ul>

          <div className="mt-6 border-t border-line pt-5">
            <p className="label-eyebrow">Cara kerja</p>
            <p className="mt-2 text-sm text-ink-soft">
              Remote, komunikasi asinkron, preview setiap tahap, dan dokumentasi
              keputusan yang bisa dibaca ulang.
            </p>
          </div>
        </div>
      </div>

      <section className="mt-20">
        <h2 className="text-[clamp(1.6rem,3.4vw,2.25rem)]">Prinsip kerja</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {principles.map((item) => (
            <div key={item.title} className="rounded-[16px] border border-line bg-card p-6">
              <h3 className="text-base">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

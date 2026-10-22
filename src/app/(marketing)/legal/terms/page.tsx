import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Ketentuan Layanan",
  description: "Ketentuan penggunaan situs dan aplikasi Airevo Digital.",
  alternates: { canonical: "/legal/terms" },
};

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
      <p className="label-eyebrow">Legal</p>
      <h1 className="mt-3 text-[clamp(2rem,4.4vw,3rem)] leading-tight">Ketentuan Layanan</h1>
      <p className="mt-3 text-sm text-muted">Terakhir diperbarui: 21 Oktober 2026</p>

      <div className="mt-10 space-y-8 text-md leading-relaxed text-ink-soft">
        <section>
          <h2 className="text-xl text-ink">Penggunaan situs</h2>
          <p className="mt-2">
            Situs ini berisi informasi layanan, portofolio, dan akses ke aplikasi internal.
            Anda setuju untuk tidak menyalahgunakan akses, mencoba masuk tanpa izin, atau
            mengganggu layanan.
          </p>
        </section>

        <section>
          <h2 className="text-xl text-ink">Aplikasi Keluarga</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>Aplikasi ini privat dan tidak menyediakan pendaftaran publik.</li>
            <li>Akun dibuat oleh pemilik keluarga.</li>
            <li>
              Aplikasi membantu pencatatan dan perencanaan; ia bukan sistem akuntansi resmi
              dan bukan pengganti konsultan keuangan atau pajak.
            </li>
            <li>
              Anda bertanggung jawab atas kebenaran data yang dimasukkan dan menjaga
              kerahasiaan kata sandi.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl text-ink">Ketersediaan</h2>
          <p className="mt-2">
            Layanan disediakan apa adanya. Bisa ada gangguan, pemeliharaan, atau perubahan
            fitur. Tidak ada jaminan ketersediaan tanpa henti, terutama selama tahap
            pengembangan.
          </p>
        </section>

        <section>
          <h2 className="text-xl text-ink">Kekayaan intelektual</h2>
          <p className="mt-2">
            Kode, desain, dan tulisan di situs ini milik Airevo Digital. Data yang Anda
            masukkan ke aplikasi tetap milik Anda.
          </p>
        </section>

        <section>
          <h2 className="text-xl text-ink">Batasan tanggung jawab</h2>
          <p className="mt-2">
            Airevo Digital tidak bertanggung jawab atas keputusan keuangan yang diambil
            berdasarkan angka di aplikasi. Selalu cocokkan dengan catatan resmi bank atau
            akuntan Anda.
          </p>
        </section>

        <section>
          <h2 className="text-xl text-ink">Kontak</h2>
          <p className="mt-2">
            Pertanyaan tentang ketentuan ini:{" "}
            <a
              href={`mailto:${site.email}`}
              className="font-semibold text-ink underline decoration-line-strong underline-offset-4"
            >
              {site.email}
            </a>
            .
          </p>
        </section>
      </div>

      <p className="mt-12 border-t border-line pt-6 text-sm text-muted">
        Lihat juga{" "}
        <Link href="/legal/privacy" className="font-semibold text-ink underline underline-offset-4">
          Kebijakan Privasi
        </Link>
        .
      </p>
    </div>
  );
}

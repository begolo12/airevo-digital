import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description: "Data apa yang dikumpulkan Airevo Digital dan bagaimana data itu dipakai.",
  alternates: { canonical: "/legal/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
      <p className="label-eyebrow">Legal</p>
      <h1 className="mt-3 text-[clamp(2rem,4.4vw,3rem)] leading-tight">Kebijakan Privasi</h1>
      <p className="mt-3 text-sm text-muted">Terakhir diperbarui: 21 Oktober 2026</p>

      <div className="mt-10 space-y-8 text-md leading-relaxed text-ink-soft">
        <section>
          <h2 className="text-xl text-ink">Ringkasan</h2>
          <p className="mt-2">
            Situs ini mengumpulkan data seminimal mungkin. Tidak ada iklan pihak ketiga,
            tidak ada pelacakan lintas situs, dan data aplikasi keluarga tidak dijual atau
            dibagikan.
          </p>
        </section>

        <section>
          <h2 className="text-xl text-ink">Data yang dikumpulkan</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>
              <strong>Form kontak:</strong> nama, email, jenis kebutuhan, rentang anggaran
              (opsional), dan isi pesan.
            </li>
            <li>
              <strong>Aplikasi Keluarga:</strong> data yang Anda masukkan sendiri — anggota,
              transaksi, anggaran, tagihan, tujuan, aset, utang, dokumen, kesehatan, dan
              pendidikan.
            </li>
            <li>
              <strong>Analitik:</strong> halaman yang dibuka, jenis perangkat, dan metrik
              performa. Tanpa cookie iklan.
            </li>
            <li>
              <strong>Log server:</strong> waktu permintaan dan pesan error. Tidak berisi
              kata sandi atau isi data keuangan.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl text-ink">Cara data dipakai</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>Membalas pesan yang Anda kirim.</li>
            <li>Menampilkan kembali data yang Anda simpan di aplikasi.</li>
            <li>Memperbaiki bug dan memahami halaman mana yang perlu diperbaiki.</li>
          </ul>
          <p className="mt-2">
            Data tidak dipakai untuk iklan, profiling, atau dijual ke pihak lain.
          </p>
        </section>

        <section>
          <h2 className="text-xl text-ink">Penyimpanan dan keamanan</h2>
          <p className="mt-2">
            Kata sandi disimpan sebagai hash scrypt, bukan teks biasa. Sesi memakai cookie
            bertanda tangan yang tidak bisa dibaca JavaScript. Data keluarga dipisahkan
            berdasarkan tingkat visibilitas: pribadi, dewasa saja, atau seluruh anggota.
          </p>
          <p className="mt-2">
            Situs ini dapat memakai penyimpanan lokal selama tahap pengembangan. Untuk data
            keluarga yang sebenarnya, gunakan setelah basis data dan pencadangan aktif.
          </p>
        </section>

        <section>
          <h2 className="text-xl text-ink">Hak Anda</h2>
          <p className="mt-2">
            Anda bisa meminta salinan, koreksi, atau penghapusan data yang Anda kirimkan.
            Kirim permintaan ke{" "}
            <a
              href={`mailto:${site.email}`}
              className="font-semibold text-ink underline decoration-line-strong underline-offset-4"
            >
              {site.email}
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl text-ink">Perubahan</h2>
          <p className="mt-2">
            Jika kebijakan ini berubah secara material, tanggal di atas akan diperbarui dan
            perubahan penting akan diumumkan di halaman ini.
          </p>
        </section>
      </div>

      <p className="mt-12 border-t border-line pt-6 text-sm text-muted">
        Lihat juga{" "}
        <Link href="/legal/terms" className="font-semibold text-ink underline underline-offset-4">
          Ketentuan Layanan
        </Link>
        .
      </p>
    </div>
  );
}

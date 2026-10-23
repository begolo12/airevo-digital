import type { Metadata } from "next";
import Link from "next/link";
import { loginAction } from "@/lib/data/actions";
import { ActionForm } from "@/components/ui/action-form";
import { safeNextPath } from "@/lib/safe-path";
import { Field, inputClass } from "@/components/ui";

export const metadata: Metadata = {
  title: "Masuk",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  /*
   * Disanitasi di sini juga, bukan hanya di server action. Nilainya masuk ke
   * `<input hidden>`, jadi URL penyerang tidak boleh pernah muncul di halaman —
   * pengguna bisa melihatnya lewat "inspect element" dan mengira itu bagian
   * dari aplikasi.
   */
  const nextParam = safeNextPath(
    typeof params.next === "string" ? params.next : undefined,
  );

  /*
   * Kredensial contoh hanya untuk pengembangan. Di produksi, kata sandi akun
   * bawaan berasal dari `AIREVO_OWNER_PASSWORD` (atau acak), jadi menampilkannya
   * di halaman ini bukan hanya salah — ia memberi tahu penyerang akun mana yang
   * layak ditebak.
   */
  const showDemo = process.env.NODE_ENV !== "production";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-16 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-[9px] border border-ink bg-butter text-sm font-black shadow-[2px_2px_0_0_var(--color-ink)]">
              A
            </span>
            <span className="text-sm font-bold">airevo digital</span>
          </Link>

          <h1 className="mt-10 text-3xl">Masuk</h1>
          <p className="mt-2 text-sm text-muted">
            Aplikasi ini privat. Gunakan akun yang diberikan pemilik keluarga.
          </p>

          <div className="mt-8">
            <ActionForm action={loginAction} submitLabel="Masuk" resetOnSuccess={false}>
              <input type="hidden" name="next" value={nextParam} />
              <div className="grid gap-4">
                <Field label="Email">
                  <input
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                    className={inputClass}
                    placeholder="nama@keluarga.id"
                    defaultValue={showDemo ? "irvan@airevo-digital.my.id" : undefined}
                  />
                </Field>
                <Field label="Kata sandi">
                  <input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className={inputClass}
                    placeholder="••••••••"
                  />
                </Field>
              </div>
            </ActionForm>
          </div>

          {showDemo ? (
            <div className="mt-8 rounded-[12px] border border-butter-deep bg-butter/35 px-4 py-3">
              <p className="text-base font-bold text-ink">Akun demo</p>
              <ul className="mt-1.5 space-y-1 text-base text-ink-soft">
                <li>
                  <span className="font-semibold">Pemilik:</span>{" "}
                  irvan@airevo-digital.my.id
                </li>
                <li>
                  <span className="font-semibold">Pasangan:</span>{" "}
                  sari@airevo-digital.my.id
                </li>
                <li>
                  <span className="font-semibold">Kata sandi:</span> airevo123
                </li>
              </ul>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Akun pasangan dipakai untuk melihat bagaimana data privat pemilik
                disembunyikan.
              </p>
            </div>
          ) : null}

          <p className="mt-6 text-base text-muted">
            Tidak ada pendaftaran publik. Anggota baru ditambahkan oleh pemilik
            keluarga.
          </p>
        </div>
      </div>

      <div className="relative hidden overflow-hidden border-l border-line bg-ink lg:block">
        <div className="grid-paper absolute inset-0 opacity-10" aria-hidden="true" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <p className="label-eyebrow !text-butter-on-emphasis">Aplikasi Keluarga</p>
          <div>
            <p className="hand text-3xl text-butter-on-emphasis">semua catatan rumah, satu tempat.</p>
            <h2 className="mt-6 text-4xl leading-tight text-on-emphasis">
              Uang, rencana,
              <br />
              dan ritme rumah.
            </h2>
            <ul className="mt-8 space-y-2.5 text-sm text-on-emphasis/75">
              {[
                "Arus kas, anggaran, tagihan, utang",
                "Aset dan kekayaan bersih",
                "Tujuan dan proyeksi bulanan",
                "Dokumen, kesehatan, pendidikan",
              ].map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-butter" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {showDemo ? (
            <p className="text-xs text-on-emphasis/50">Data contoh untuk demonstrasi.</p>
          ) : (
            <p className="text-xs text-on-emphasis/50">
              Akses hanya untuk pemilik lisensi.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfilePicker } from "@/components/auth/profile-picker";
import { getAccountSession } from "@/lib/session";
import { safeNextPath } from "@/lib/safe-path";
import { profilesForAccount } from "@/lib/data/workspace";

export const metadata: Metadata = {
  title: "Pilih profil",
  robots: { index: false, follow: false },
};

const roleLabel: Record<string, string> = {
  owner: "Pemilik",
  adult: "Dewasa",
  teen: "Remaja",
  child: "Anak",
  viewer: "Pengamat",
};

/**
 * Layar pemilihan profil, seperti layanan streaming.
 *
 * Butuh sesi level akun (sudah lolos email + kata sandi). Kalau sesi sudah
 * aktif penuh, langsung diarahkan ke aplikasi.
 */
export default async function PilihProfilPage({
  searchParams,
}: PageProps<"/pilih-profil">) {
  const params = await searchParams;

  /*
   * `next` datang dari URL. Pemeriksaan `startsWith("/")` saja tidak cukup:
   * `//evil.example` lolos dan dibaca browser sebagai situs lain. Sanitasi
   * dipakai bersama dengan server action agar tidak ada jalur yang tertinggal.
   */
  const next = safeNextPath(
    typeof params.next === "string" ? params.next : undefined,
  );

  const session = await getAccountSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (session.stage === "active") redirect(next);

  const profiles = profilesForAccount(session.userId).map((profile) => ({
    id: profile.id,
    name: profile.name,
    initial: profile.initial,
    color: profile.color,
    roleLabel: roleLabel[profile.role] ?? profile.role,
    hasPin: Boolean(profile.pinHash),
  }));

  return (
    <div className="flex min-h-screen flex-col justify-center px-5 py-14">
      <div className="mx-auto w-full max-w-lg">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-[9px] border border-ink bg-butter text-sm font-black shadow-[2px_2px_0_0_var(--color-ink)]">
            A
          </span>
          <span className="text-sm font-bold">airevo digital</span>
        </Link>

        <h1 className="mt-8 text-[clamp(1.7rem,4vw,2.3rem)] leading-tight">
          Siapa yang memakai sekarang?
        </h1>
        <p className="mt-2 text-sm text-muted">
          Masuk sebagai <strong className="text-ink">{session.email}</strong>. Setiap
          profil punya PIN dan ruang data sendiri.
        </p>

        <div className="mt-8">
          <ProfilePicker profiles={profiles} next={next} />
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <p className="text-base text-muted">
            Bukan akun Anda?{" "}
            <Link
              href="/login"
              className="font-semibold text-ink underline decoration-line-strong underline-offset-4"
            >
              Masuk dengan akun lain
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

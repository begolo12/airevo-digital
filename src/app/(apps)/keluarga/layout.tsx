import type { Metadata } from "next";
import Link from "next/link";
import { AppSidebar } from "@/components/app/app-sidebar";
import { AppProviders } from "@/components/app/providers";
import { StorageWarning } from "@/components/app/storage-warning";
import { getApp } from "@/config/apps";
import { formatIDR } from "@/lib/format";
import { hasLicense } from "@/lib/data/orders";
import { requireSession, requireViewer } from "@/lib/session";
import {
  profileById,
  profilesForAccount,
  workspaceMembersOf,
  workspacesForProfile,
} from "@/lib/data/workspace";
import { getStore } from "@/lib/data/store";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: { default: "Keluarga", template: "%s | Keluarga" },
  robots: { index: false, follow: false },
};

/**
 * Gerbang lisensi.
 *
 * Aplikasi ini dijual sekali bayar, jadi akses ditentukan oleh ada/tidaknya
 * lisensi aktif untuk email yang sedang masuk. Tanpa lisensi, isi aplikasi
 * tidak dirender sama sekali — bukan hanya disembunyikan dengan CSS.
 */
function AccessGate({ email }: { email: string }) {
  const app = getApp("keluarga");
  const price = app?.pricing?.price;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-5 py-16">
      <div className="note p-7">
        <p className="label-eyebrow">Akses diperlukan</p>
        <h1 className="mt-2 text-[clamp(1.7rem,4vw,2.4rem)] leading-tight">
          Akun ini belum punya lisensi.
        </h1>
        <p className="mt-3 text-md leading-relaxed text-ink-soft">
          Anda masuk sebagai <strong>{email}</strong>, tetapi lisensi aplikasi
          Keluarga belum terdaftar untuk email ini. Aplikasi ini dijual sekali
          bayar, bukan langganan.
        </p>

        {price ? (
          <div className="mt-5 flex items-baseline gap-2 rounded-[10px] border border-line bg-paper-deep/60 px-4 py-3">
            <span className="text-xl font-black tnum">{formatIDR(price)}</span>
            <span className="text-xs font-semibold text-muted">
              sekali bayar, akses seumur hidup
            </span>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/aplikasi/keluarga"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-emphasis bg-emphasis px-5 text-sm font-semibold text-on-emphasis hover:bg-ink-soft"
          >
            Lihat aplikasi
            <Icon name="arrow-right" size={14} strokeWidth={2.2} />
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center rounded-full border border-line-strong bg-card px-5 text-sm font-semibold text-ink hover:bg-paper-deep"
          >
            Masuk akun lain
          </Link>
        </div>

        <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-muted">
          Sudah membeli tetapi melihat pesan ini? Pastikan Anda masuk dengan email
          yang dipakai saat membeli, atau hubungi kami lewat{" "}
          <Link href="/contact" className="font-semibold text-ink underline underline-offset-2">
            halaman kontak
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

export default async function AppLayout({ children }: LayoutProps<"/keluarga">) {
  const session = await requireSession();
  const viewer = await requireViewer();
  const { household } = getStore();

  if (!hasLicense(session.email, "keluarga")) {
    return <AccessGate email={session.email} />;
  }

  const profile = profileById(viewer.profileId);
  const workspaces = workspacesForProfile(viewer.profileId).map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    type: workspace.type,
    color: workspace.color,
    memberCount: workspaceMembersOf(workspace.id).length,
  }));
  const otherProfiles = profilesForAccount(session.userId)
    .filter((item) => item.id !== viewer.profileId)
    .map((item) => ({
      id: item.id,
      name: item.name,
      initial: item.initial,
      color: item.color,
    }));

  return (
    <AppProviders role={session.role}>
      <div className="flex min-h-screen flex-col lg:flex-row">
        <AppSidebar
          householdName={household.name}
          userName={profile?.name ?? session.name}
          role={session.role}
          profileInitial={profile?.initial ?? "?"}
          profileColor={profile?.color ?? "butter"}
          activeWorkspaceId={viewer.workspaceId}
          workspaces={workspaces}
          otherProfiles={otherProfiles}
        />
        <div className="min-w-0 flex-1 pb-20 lg:pb-0">
          <StorageWarning />
          {/*
            `max-w-[86rem]` (1376px) alih-alih `max-w-5xl` (1024px): pada layar
            1440px, batas lama menyisakan ~170px kosong di kanan sementara
            kontennya sempit. Padding yang menahan tepi, bukan max-width.
          */}
          <div className="mx-auto w-full max-w-[86rem] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
            {children}
          </div>
        </div>
      </div>
    </AppProviders>
  );
}

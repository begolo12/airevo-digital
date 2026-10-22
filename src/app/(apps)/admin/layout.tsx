import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { requireOwner } from "@/lib/session";
import { listPaymentProviders } from "@/lib/payments";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireOwner();
  const providers = listPaymentProviders();
  const active = providers.find((provider) => provider.configured);

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-[8px] border border-ink bg-butter text-xs font-black">
                A
              </span>
              <span className="text-sm font-bold">Admin</span>
            </Link>
            <span className="text-line-strong">/</span>
            <Link
              href="/admin/pesanan"
              className="text-sm font-semibold text-ink-soft hover:text-ink"
            >
              Pesanan
            </Link>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span>
              {session.name} · {session.role}
            </span>
            <Link
              href="/keluarga"
              className="rounded-full border border-line-strong bg-card px-3 py-1 font-semibold text-ink hover:bg-paper-deep"
            >
              Ke aplikasi
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
        <div className="mb-6 rounded-[10px] border border-line bg-paper-deep/50 px-4 py-2.5 text-base text-ink-soft">
          Pembayaran aktif:{" "}
          <strong>{active?.label ?? "Transfer bank"}</strong>
          {" · "}
          {providers
            .filter((provider) => !provider.configured)
            .map((provider) => provider.label)
            .join(", ") || "semua gateway"}{" "}
          belum dikonfigurasi.
        </div>
        {children}
      </main>
    </div>
  );
}

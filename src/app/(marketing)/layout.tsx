import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    /*
     * Halaman publik memakai skala teks yang lebih besar dari aplikasi.
     *
     * Token global `--text-sm` (12px) dan `--text-base` (13px) dirancang untuk
     * tabel dan panel padat di dalam aplikasi Keluarga. Di halaman pemasaran,
     * ukuran itu membuat paragraf kartu terbaca seperti catatan kaki, jadi
     * skalanya dinaikkan khusus di sini — bukan di `globals.css`, agar
     * kepadatan dashboard tidak ikut berubah.
     */
    <div className="flex flex-1 flex-col [--text-xs:0.8125rem] [--text-xs--line-height:1.45] [--text-sm:0.875rem] [--text-sm--line-height:1.55] [--text-base:0.9375rem] [--text-base--line-height:1.6]">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-on-emphasis"
      >
        Lompat ke konten
      </a>
      <SiteHeader />
      <main id="konten" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

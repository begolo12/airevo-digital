import Link from "next/link";
import { navigation, site } from "@/config/site";
import { Icon } from "@/components/ui/icon";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          {/*
            Huruf "A" hanya hiasan — teks di sebelahnya sudah menjadi nama
            tautan. Tanpa `aria-hidden`, pembaca layar membaca "A airevo
            digital", dan `aria-label` yang berbeda dari teks terlihat akan
            melanggar aturan `label-content-name-mismatch`.
          */}
          <span
            aria-hidden="true"
            className="grid h-8 w-8 place-items-center rounded-[9px] border border-ink bg-butter text-base font-black text-ink shadow-[2px_2px_0_0_var(--color-ink)]"
          >
            A
          </span>
          <span className="text-md font-bold tracking-tight">
            airevo<span className="text-muted"> digital</span>
          </span>
        </Link>

        <nav aria-label="Navigasi utama" className="hidden items-center gap-1 md:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className="rounded-full px-3.5 py-2 text-sm font-semibold text-ink-soft hover:text-ink"
          >
            Masuk
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-10 items-center rounded-full border border-emphasis bg-emphasis px-4 text-sm font-semibold text-on-emphasis transition-colors hover:bg-ink-soft"
          >
            Konsultasi
          </Link>
        </div>

        <details className="relative md:hidden">
          <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-line-strong bg-card text-ink [&::-webkit-details-marker]:hidden">
            <span className="sr-only">Buka menu</span>
            <Icon name="menu" size={18} strokeWidth={2} />
          </summary>
          <div className="absolute right-0 mt-2 w-56 rounded-[14px] border border-line-strong bg-card p-2 shadow-[var(--shadow-lift)]">
            {[...navigation, { label: "Masuk", href: "/login" }].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-paper-deep hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </details>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-paper-deep/60">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="text-lg font-bold">airevo digital</p>
          <p className="mt-2 max-w-sm text-sm text-muted">
            Membangun aplikasi web, alat internal, dan produk yang membuat pekerjaan
            sehari-hari berjalan lebih rapi.
          </p>
          <p className="hand mt-4 text-lg text-ink-soft">dibuat dengan tenang di {site.location}</p>
        </div>

        <nav aria-label="Navigasi footer">
          <p className="label-eyebrow mb-3">Jelajahi</p>
          <ul className="space-y-2 text-sm">
            {navigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-ink-soft hover:text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/login" className="text-ink-soft hover:text-ink">
                Masuk
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <p className="label-eyebrow mb-3">Kontak</p>
          <ul className="space-y-2 text-sm text-ink-soft">
            <li>
              <a href={`mailto:${site.email}`} className="hover:text-ink">
                {site.email}
              </a>
            </li>
            <li className="text-muted">Balasan {site.responseTime}</li>
          </ul>

          <p className="label-eyebrow mb-3 mt-6">Legal</p>
          <ul className="space-y-2 text-sm text-ink-soft">
            <li>
              <Link href="/legal/privacy" className="hover:text-ink">
                Kebijakan Privasi
              </Link>
            </li>
            <li>
              <Link href="/legal/terms" className="hover:text-ink">
                Ketentuan Layanan
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line px-5 py-5 sm:px-8">
        <p className="mx-auto max-w-6xl text-xs text-muted">
          © {new Date().getFullYear()} {site.name}. Semua hak dilindungi.
        </p>
      </div>
    </footer>
  );
}

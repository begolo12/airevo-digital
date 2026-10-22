import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Caveat, Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { site } from "@/config/site";
import { ToastProvider } from "@/components/ui/toast";
import { ConfirmProvider } from "@/components/ui/confirm";
import { ThemeScript } from "@/components/app/appearance";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Software yang dipakai, bukan hanya dipamerkan`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  keywords: [
    "jasa pembuatan web app",
    "internal tools Indonesia",
    "aplikasi keuangan keluarga",
    "software house Indonesia",
  ],
  authors: [{ name: site.name }],
  creator: site.name,
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "/",
    siteName: site.name,
    title: `${site.name} — Software yang dipakai`,
    description: site.description,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

/** Warna bilah browser mengikuti tema agar tidak ada pita putih di mode gelap. */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf6ec" },
    { media: "(prefers-color-scheme: dark)", color: "#16130f" },
  ],
};

/**
 * Script analytics hanya tersedia di infrastruktur Vercel.
 * Di local (`next dev`/`next start`) jangan dimuat agar tidak ada 404 di console.
 */
const onVercel = Boolean(process.env.VERCEL);

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      // `suppressHydrationWarning` karena `ThemeScript` menambah kelas `dark`
      // sebelum React hidrasi — perbedaan itu disengaja, bukan bug.
      suppressHydrationWarning
      className={`${bricolage.variable} ${jakarta.variable} ${caveat.variable} h-full antialiased`}
    >
      <head>
        {/*
          Dijalankan sebelum paint: tanpa ini, pengguna mode gelap melihat
          kilatan putih setiap memuat halaman.
        */}
        <ThemeScript />
      </head>
      <body className="paper-grain flex min-h-full flex-col">
        {/* Semua notifikasi dan konfirmasi tampil di dalam aplikasi, bukan dialog browser. */}
        <ToastProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </ToastProvider>
        {onVercel ? (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        ) : null}
      </body>
    </html>
  );
}

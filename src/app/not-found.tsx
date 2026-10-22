import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-5 py-20 text-center">
      <p className="hand text-3xl text-tomato-text">nyasar, ya?</p>
      <h1 className="mt-3 text-4xl">Halaman tidak ditemukan</h1>
      <p className="mt-3 text-sm text-muted">
        Alamat yang Anda buka tidak ada, sudah dipindahkan, atau salah ketik.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-full border border-emphasis bg-emphasis px-5 text-sm font-semibold text-on-emphasis hover:bg-ink-soft"
        >
          Kembali ke beranda
        </Link>
        <Link
          href="/aplikasi"
          className="inline-flex h-11 items-center rounded-full border border-line-strong bg-card px-5 text-sm font-semibold hover:bg-paper-deep"
        >
          Lihat aplikasi
        </Link>
      </div>
    </div>
  );
}

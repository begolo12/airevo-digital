"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-5 py-20 text-center">
      <p className="hand text-3xl text-tomato-text">ada yang tidak beres</p>
      <h1 className="mt-3 text-3xl">Halaman gagal dimuat</h1>
      <p className="mt-3 max-w-md text-sm text-muted">
        Coba muat ulang. Kalau terus terjadi, beri tahu saya lewat halaman kontak.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-flex h-11 items-center rounded-full border border-emphasis bg-emphasis px-5 text-sm font-semibold text-on-emphasis hover:bg-ink-soft"
      >
        Coba lagi
      </button>
    </div>
  );
}

import { getPersistenceState } from "@/lib/data/persist";

/**
 * Peringatan saat penyimpanan tidak bisa menulis.
 *
 * Aplikasi akuntansi yang kehilangan data tanpa memberi tahu adalah bug yang
 * lebih buruk daripada aplikasi yang menolak jalan. Karena itu kegagalan
 * penyimpanan ditampilkan di setiap halaman aplikasi, bukan hanya di log
 * server yang tidak pernah dibaca pengguna.
 *
 * Sengaja tidak bisa ditutup: menutupnya berarti pengguna lupa bahwa datanya
 * tidak aman.
 */
export function StorageWarning() {
  const state = getPersistenceState();
  if (!state.degraded) return null;

  return (
    <div
      role="alert"
      className="border-b border-tomato/40 bg-tomato/10 px-4 py-2.5 text-base text-tomato-ink sm:px-6"
    >
      <div className="mx-auto flex w-full max-w-[86rem] flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-bold">Penyimpanan bermasalah.</span>
        <span className="text-tomato-text">
          Perubahan hanya tersimpan sementara dan akan hilang saat server
          restart. Hubungi pengelola untuk mengaktifkan database.
        </span>
      </div>
    </div>
  );
}

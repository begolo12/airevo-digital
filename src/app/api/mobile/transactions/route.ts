import { withAuth, intParam, monthParam } from "@/lib/api/respond";
import { mobileTransactions } from "@/lib/data/mobile";

/**
 * Daftar transaksi, dengan paginasi.
 *
 * Paginasi memakai `limit`/`offset` dan menyertakan `hasMore`, supaya klien
 * bisa memuat bertahap saat menggulir — bukan mengunduh seluruh riwayat
 * sekaligus, yang bisa ribuan baris dan memakan kuota data pengguna.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);

  return withAuth(request, ({ viewer }) =>
    mobileTransactions(viewer, {
      limit: intParam(url, "limit", 30, 1, 200),
      offset: intParam(url, "offset", 0, 0, 100_000),
      month: monthParam(url),
    }),
  );
}

import { withAuth } from "@/lib/api/respond";
import { mobileSummary } from "@/lib/data/mobile";

/**
 * Ringkasan dashboard untuk aplikasi Android.
 *
 * Satu permintaan mengembalikan semua angka yang tampil di layar utama:
 * saldo, pemasukan, pengeluaran, anggaran, kekayaan bersih, dan proyeksi enam
 * bulan. Digabung supaya layar utama cukup satu kali perjalanan jaringan —
 * di koneksi seluler, empat permintaan terpisah terasa jauh lebih lambat
 * daripada satu.
 */
export async function GET(request: Request) {
  return withAuth(request, ({ viewer }) => mobileSummary(viewer));
}

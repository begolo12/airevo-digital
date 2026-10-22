import { withAuth } from "@/lib/api/respond";
import { mobileReference } from "@/lib/data/mobile";

/**
 * Akun dan kategori.
 *
 * Diambil sekali saat aplikasi dibuka, lalu disimpan di memori klien — datanya
 * jarang berubah, dan formulir transaksi butuh keduanya seketika.
 */
export async function GET(request: Request) {
  return withAuth(request, ({ viewer }) => mobileReference(viewer));
}

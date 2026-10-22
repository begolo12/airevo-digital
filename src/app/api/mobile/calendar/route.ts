import { apiError, withAuth } from "@/lib/api/respond";
import { mobileCalendar } from "@/lib/data/mobile";
import { todayISO } from "@/lib/format";

/**
 * Pengeluaran harian dalam satu bulan — untuk heatmap kalender.
 *
 * ## Beda "tidak ada parameter" dan "parameter tidak sah"
 *
 * Tidak ada `month` berarti klien ingin bulan berjalan: itu permintaan yang
 * wajar, dipakai saat aplikasi pertama dibuka.
 *
 * Tetapi `month=2026-13` adalah **galat klien**. Diam-diam menggantinya dengan
 * bulan berjalan akan menyembunyikan bug di aplikasi, dan pengguna melihat
 * data bulan yang salah tanpa tahu. Karena itu yang tidak sah ditolak.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get("month");

  let month: string;

  if (raw === null || raw === "") {
    month = todayISO().slice(0, 7);
  } else if (/^\d{4}-(0[1-9]|1[0-2])$/.test(raw)) {
    month = raw;
  } else {
    return apiError("Bulan tidak sah. Gunakan format YYYY-MM.", 422);
  }

  return withAuth(request, ({ viewer }) => mobileCalendar(viewer, month));
}

import { withAuth } from "@/lib/api/respond";
import { mobileReports } from "@/lib/data/mobile";

/** Laporan: ringkasan bulan, kategori, tren 12 bulan, dan kekayaan bersih. */
export async function GET(request: Request) {
  return withAuth(request, ({ viewer }) => mobileReports(viewer));
}

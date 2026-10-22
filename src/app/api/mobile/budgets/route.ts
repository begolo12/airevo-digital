import { withAuth } from "@/lib/api/respond";
import { mobileBudgets } from "@/lib/data/mobile";

/** Anggaran bulan berjalan beserta pemakaiannya. */
export async function GET(request: Request) {
  return withAuth(request, ({ viewer }) => mobileBudgets(viewer));
}

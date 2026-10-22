import { withAuth } from "@/lib/api/respond";
import { mobileBills } from "@/lib/data/mobile";

/** Tagihan aktif beserta status dan jatuh temponya. */
export async function GET(request: Request) {
  return withAuth(request, ({ viewer }) => mobileBills(viewer));
}

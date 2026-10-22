import { withAuth } from "@/lib/api/respond";
import { mobileGoals } from "@/lib/data/mobile";

/** Tujuan keuangan beserta progresnya. */
export async function GET(request: Request) {
  return withAuth(request, ({ viewer }) => mobileGoals(viewer));
}

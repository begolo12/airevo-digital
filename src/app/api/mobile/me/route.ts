import { withAuth } from "@/lib/api/respond";
import { workspacesForProfile } from "@/lib/data/workspace";
import { getStore } from "@/lib/data/store";

/**
 * Identitas pemilik token.
 *
 * Dipakai aplikasi saat dibuka kembali: memastikan token yang tersimpan masih
 * berlaku, sekaligus mengambil nama profil dan daftar ruang untuk pemilih ruang.
 *
 * Bila token sudah tidak sah, rute ini mengembalikan 401 dan aplikasi tahu
 * harus menampilkan layar masuk — bukan menampilkan layar kosong.
 */
export async function GET(request: Request) {
  return withAuth(request, ({ viewer, ...rest }) => {
    const profile = getStore().profiles.find((item) => item.id === viewer.profileId);

    return {
      profile: {
        id: viewer.profileId,
        name: profile?.name ?? "",
        initial: profile?.initial ?? "",
        color: profile?.color ?? "butter",
        role: viewer.role,
      },
      workspaceId: viewer.workspaceId,
      workspaces: workspacesForProfile(viewer.profileId).map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        type: workspace.type,
      })),
      ...rest,
    };
  });
}

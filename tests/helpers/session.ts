import { vi } from "vitest";
import type { Role } from "@/lib/data/types";

/**
 * Keadaan sesi tiruan untuk pengujian server action.
 *
 * Modul ini **hanya berisi data** — tidak memanggil `vi.mock`. Vitest 5 menolak
 * `vi.mock` yang berada di dalam fungsi, jadi pemasangan tiruan dilakukan di
 * tingkat modul masing-masing berkas test:
 *
 * ```ts
 * import { vi } from "vitest";
 *
 * vi.mock("@/lib/session", async () => {
 *   const { sessionMock } = await import("./helpers/session");
 *   return sessionMock();
 * });
 * ```
 *
 * Karena keadaan disimpan di modul terpisah, `setViewer()` dari test mengubah
 * apa yang dilihat oleh tiruan tersebut.
 */

export type ViewerState = {
  userId: string;
  profileId: string;
  workspaceId: string;
  role: Role;
};

export const viewerState: ViewerState = {
  userId: "u-irvan",
  profileId: "p-irvan",
  workspaceId: "ws-family",
  role: "owner",
};

/** Atur siapa yang sedang "masuk" pada test berikutnya. */
export function setViewer(next: Partial<ViewerState> & { workspaceId: string }): void {
  Object.assign(viewerState, {
    userId: "u-irvan",
    profileId: "p-irvan",
    role: "owner",
    ...next,
  });
}

/** Kosongkan sesi — meniru pengguna yang belum masuk. */
export function clearViewer(): void {
  Object.assign(viewerState, {
    userId: "",
    profileId: "",
    workspaceId: "",
    role: "viewer" as Role,
  });
}

/** Membuat FormData dari objek biasa. */
export function form(fields: Record<string, string | number | undefined>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) data.set(key, String(value));
  }
  return data;
}

/**
 * Bentuk tiruan modul `@/lib/session`.
 *
 * Dipanggil dari dalam `vi.mock` di tingkat modul berkas test. Semua fungsi
 * membaca `viewerState` saat dipanggil, bukan saat modul dimuat, sehingga
 * `setViewer()` di `beforeEach` langsung berlaku.
 */
export async function sessionMock() {
  const actual =
    await vi.importActual<typeof import("@/lib/session")>("@/lib/session");

  const currentViewer = () =>
    viewerState.workspaceId
      ? {
          userId: viewerState.userId,
          profileId: viewerState.profileId,
          workspaceId: viewerState.workspaceId,
          role: viewerState.role,
        }
      : null;

  return {
    ...actual,
    getViewer: async () => currentViewer(),
    requireViewer: async () => {
      const viewer = currentViewer();
      if (!viewer) throw new Error("Sesi berakhir.");
      return viewer;
    },
    getSession: async () =>
      viewerState.userId
        ? {
            userId: viewerState.userId,
            email: "irvan@airevo-digital.my.id",
            name: "Irvan",
            role: viewerState.role,
            stage: "active" as const,
            profileId: viewerState.profileId,
            workspaceId: viewerState.workspaceId,
          }
        : null,
    getAccountSession: async () => currentViewer(),
    requireActiveSession: async () => currentViewer(),
    requireSession: async () => currentViewer(),
    requireAccountSession: async () => currentViewer(),
    createSession: async () => {},
    destroySession: async () => {},
  };
}



import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Workspace bersama.
 *
 * Fitur ini memungkinkan dua profil bekerja di satu ruang data — mis. suami
 * dan istri. Yang dijaga di sini adalah **batas**, bukan sekadar "bisa dibuat":
 *
 * - maksimal 2 ruang bersama per profil (janji lisensi)
 * - tidak bisa bergabung ke ruang sendiri
 * - pemilik tidak bisa keluar dari ruangnya
 * - keluar dari ruang aktif mengembalikan sesi ke ruang pribadi
 */

const state = {
  loggedIn: true,
  profileId: "p-irvan",
  workspaceId: "ws-irvan",
};

vi.mock("@/lib/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/session")>("@/lib/session");

  const viewer = () =>
    state.loggedIn
      ? {
          userId: "u-irvan",
          profileId: state.profileId,
          workspaceId: state.workspaceId,
          role: "owner" as const,
        }
      : null;

  const session = () =>
    state.loggedIn
      ? {
          userId: "u-irvan",
          email: "irvan@airevo-digital.my.id",
          name: "Irvan",
          role: "owner" as const,
          stage: "active" as const,
          profileId: state.profileId,
          workspaceId: state.workspaceId,
        }
      : null;

  return {
    ...actual,
    getViewer: async () => viewer(),
    requireViewer: async () => {
      const current = viewer();
      if (!current) throw new Error("NEXT_REDIRECT:/pilih-profil");
      return current;
    },
    getSession: async () => session(),
    getAccountSession: async () => viewer(),
    requireActiveSession: async () => {
      const current = session();
      if (!current) throw new Error("NEXT_REDIRECT:/login");
      return current;
    },
    requireSession: async () => session(),
    requireAccountSession: async () => viewer(),
    createSession: async () => {},
    destroySession: async () => {},
  };
});

vi.mock("next/cache", async () => {
  const actual = await vi.importActual<typeof import("next/cache")>("next/cache");
  return { ...actual, revalidatePath: () => {} };
});

const { getStore, resetStore, WS } = await import("@/lib/data/store");
const {
  createSharedWorkspace,
  joinSharedWorkspace,
  leaveSharedWorkspace,
} = await import("@/lib/data/actions");
const { MAX_SHARED_WORKSPACES } = await import("@/lib/data/types");

function form(fields: Record<string, string | number>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, String(value));
  return data;
}

type Outcome = { ok: boolean; message?: string };

async function run(routine: () => Promise<Outcome>): Promise<Outcome> {
  try {
    return await routine();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT")) {
      return { ok: false, message: "redirect" };
    }
    throw error;
  }
}

beforeEach(() => {
  resetStore();
  Object.assign(state, {
    loggedIn: true,
    profileId: "p-irvan",
    workspaceId: WS.irvan,
  });
});

describe("createSharedWorkspace", () => {
  it("membuat ruang bersama beserta kode undangan", async () => {
    const before = getStore().workspaces.length;

    const result = await createSharedWorkspace(form({ name: "Ruang Uji" }));

    expect(result.ok).toBe(true);
    expect(getStore().workspaces).toHaveLength(before + 1);

    const created = getStore().workspaces.at(-1);
    expect(created?.type).toBe("shared");
    expect(created?.name).toBe("Ruang Uji");
    expect(created?.inviteCode).toMatch(/^[23456789A-Z]{6}$/);
    expect(created?.ownerProfileId).toBe("p-irvan");
  });

  it("menambahkan pembuat sebagai anggota dengan peran owner", async () => {
    await createSharedWorkspace(form({ name: "Ruang Uji" }));
    const created = getStore().workspaces.at(-1);

    const membership = getStore().workspaceMembers.find(
      (member) => member.workspaceId === created?.id && member.profileId === "p-irvan",
    );

    expect(membership?.role).toBe("owner");
  });

  it("menolak nama kosong", async () => {
    const before = getStore().workspaces.length;
    const result = await createSharedWorkspace(form({ name: "   " }));

    expect(result.ok).toBe(false);
    expect(getStore().workspaces).toHaveLength(before);
  });

  it("menolak nama yang sudah dipakai profil ini", async () => {
    /*
     * Nama ganda diperiksa sebelum kuota, supaya pesannya tepat: "nama sudah
     * dipakai", bukan "kuota habis".
     */
    const first = await createSharedWorkspace(form({ name: "Rumah Tangga" }));
    expect(first.ok).toBe(true);

    const result = await createSharedWorkspace(form({ name: "rumah tangga" }));

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/sudah dipakai/i);
  });

  it(`menolak lebih dari ${MAX_SHARED_WORKSPACES} ruang bersama`, async () => {
    /*
     * Ini janji lisensi, jadi harus ditegakkan di server — bukan hanya dengan
     * menyembunyikan tombol di UI.
     *
     * Data contoh sudah punya satu ruang bersama (`ws-family`), jadi sisa
     * kuota dihitung dari kondisi awal, bukan dari nol.
     */
    const { sharedWorkspacesOf } = await import("@/lib/data/workspace");
    const initial = sharedWorkspacesOf("p-irvan").length;

    // Isi kuota yang tersisa.
    for (let index = initial; index < MAX_SHARED_WORKSPACES; index += 1) {
      const result = await createSharedWorkspace(form({ name: `Ruang ${index}` }));
      expect(result.ok).toBe(true);
    }

    expect(sharedWorkspacesOf("p-irvan")).toHaveLength(MAX_SHARED_WORKSPACES);

    const over = await createSharedWorkspace(form({ name: "Ruang Berlebih" }));
    expect(over.ok).toBe(false);
    expect(over.message).toMatch(/maksimal/i);
  });

  it("menolak pengguna yang belum masuk", async () => {
    state.loggedIn = false;
    const before = getStore().workspaces.length;

    const result = await run(() => createSharedWorkspace(form({ name: "Ruang Uji" })));

    expect(result.ok).toBe(false);
    expect(getStore().workspaces).toHaveLength(before);
  });
});

describe("joinSharedWorkspace", () => {
  /** Membuat ruang bersama milik profil lain, mengembalikan kodenya. */
  async function otherWorkspace() {
    state.profileId = "p-sari";
    state.workspaceId = WS.sari;
    await createSharedWorkspace(form({ name: "Ruang Sari" }));
    const workspace = getStore().workspaces.at(-1);

    state.profileId = "p-irvan";
    state.workspaceId = WS.irvan;

    return workspace;
  }

  it("bergabung memakai kode undangan", async () => {
    const workspace = await otherWorkspace();

    const result = await joinSharedWorkspace(
      form({ code: workspace?.inviteCode ?? "" }),
    );

    expect(result.ok).toBe(true);
    const membership = getStore().workspaceMembers.find(
      (member) => member.workspaceId === workspace?.id && member.profileId === "p-irvan",
    );
    expect(membership?.role).toBe("editor");
  });

  it("menerima kode huruf kecil", async () => {
    const workspace = await otherWorkspace();
    const lower = (workspace?.inviteCode ?? "").toLowerCase();

    const result = await joinSharedWorkspace(form({ code: lower }));
    expect(result.ok).toBe(true);
  });

  it("menolak kode yang tidak dikenal", async () => {
    const result = await joinSharedWorkspace(form({ code: "SALAH1" }));

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/tidak dikenal/i);
  });

  it("menolak kode kosong", async () => {
    const result = await joinSharedWorkspace(form({ code: "  " }));
    expect(result.ok).toBe(false);
  });

  it("menolak bergabung dua kali", async () => {
    const workspace = await otherWorkspace();
    const code = workspace?.inviteCode ?? "";

    await joinSharedWorkspace(form({ code }));
    const again = await joinSharedWorkspace(form({ code }));

    expect(again.ok).toBe(false);
    expect(again.message).toMatch(/sudah tergabung/i);
  });

  it("menolak bergabung ke ruang sendiri", async () => {
    await createSharedWorkspace(form({ name: "Ruang Sendiri" }));
    const own = getStore().workspaces.at(-1);

    const result = await joinSharedWorkspace(form({ code: own?.inviteCode ?? "" }));

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/milik Anda sendiri/i);
  });
});

describe("leaveSharedWorkspace", () => {
  async function joinedWorkspace() {
    state.profileId = "p-sari";
    state.workspaceId = WS.sari;
    await createSharedWorkspace(form({ name: "Ruang Sari" }));
    const workspace = getStore().workspaces.at(-1);

    state.profileId = "p-irvan";
    state.workspaceId = WS.irvan;
    await joinSharedWorkspace(form({ code: workspace?.inviteCode ?? "" }));

    return workspace;
  }

  it("keluar dari ruang bersama", async () => {
    const workspace = await joinedWorkspace();

    const result = await leaveSharedWorkspace(
      form({ workspaceId: workspace?.id ?? "" }),
    );

    expect(result.ok).toBe(true);
    const stillMember = getStore().workspaceMembers.some(
      (member) =>
        member.workspaceId === workspace?.id && member.profileId === "p-irvan",
    );
    expect(stillMember).toBe(false);
  });

  it("pemilik tidak bisa keluar dari ruangnya sendiri", async () => {
    await createSharedWorkspace(form({ name: "Ruang Sendiri" }));
    const own = getStore().workspaces.at(-1);

    const result = await leaveSharedWorkspace(form({ workspaceId: own?.id ?? "" }));

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/pemilik tidak bisa keluar/i);
  });

  it("menolak keluar dari ruang yang bukan diikuti", async () => {
    const result = await leaveSharedWorkspace(form({ workspaceId: "ws-tidak-ada" }));
    expect(result.ok).toBe(false);
  });

  it("menolak keluar dari ruang pribadi", async () => {
    const result = await leaveSharedWorkspace(form({ workspaceId: WS.irvan }));
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/tidak ditemukan/i);
  });
});

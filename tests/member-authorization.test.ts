import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Otorisasi aksi anggota keluarga.
 *
 * `members` sengaja **tidak** di-scope per ruang: anggota keluarga adalah data
 * yang berlaku lintas ruang (ayah, ibu, anak yang sama). Karena itu aksi yang
 * mengubahnya tidak bisa mengandalkan penyaringan ruang — harus memeriksa sesi
 * secara eksplisit.
 *
 * Tanpa pemeriksaan itu, server action bisa dipanggil tanpa login dan siapa pun
 * bisa mengubah, menonaktifkan, atau menghapus anggota keluarga.
 */

const state = {
  loggedIn: true,
};

vi.mock("@/lib/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/session")>("@/lib/session");

  const viewer = () =>
    state.loggedIn
      ? {
          userId: "u-irvan",
          profileId: "p-irvan",
          workspaceId: "ws-family",
          role: "owner" as const,
        }
      : null;

  return {
    ...actual,
    getViewer: async () => viewer(),
    requireViewer: async () => {
      if (!viewer()) throw new Error("NEXT_REDIRECT:/login");
      return viewer();
    },
    getSession: async () =>
      state.loggedIn
        ? {
            userId: "u-irvan",
            email: "irvan@airevo-digital.my.id",
            name: "Irvan",
            role: "owner" as const,
            stage: "active" as const,
            profileId: "p-irvan",
            workspaceId: "ws-family",
          }
        : null,
    getAccountSession: async () => viewer(),
    requireActiveSession: async () => {
      if (!viewer()) throw new Error("NEXT_REDIRECT:/login");
      return viewer();
    },
    requireSession: async () => {
      if (!viewer()) throw new Error("NEXT_REDIRECT:/login");
      return viewer();
    },
    setSession: async () => {},
    clearSession: async () => {},
  };
});

vi.mock("next/cache", async () => {
  const actual = await vi.importActual<typeof import("next/cache")>("next/cache");
  return { ...actual, revalidatePath: () => {} };
});

const { getStore, resetStore } = await import("@/lib/data/store");
const { updateMember, toggleMemberActive, deleteMember } = await import(
  "@/lib/data/actions"
);

function form(fields: Record<string, string | number>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, String(value));
  return data;
}

/** Menjalankan aksi; mengembalikan hasil atau penanda redirect. */
type Outcome = { ok: boolean; message?: string; redirected?: boolean };

async function run(routine: () => Promise<Outcome>): Promise<Outcome> {
  try {
    return await routine();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT")) {
      return { ok: false, redirected: true };
    }
    throw error;
  }
}

beforeEach(() => {
  resetStore();
  state.loggedIn = true;
});

describe("aksi anggota tanpa sesi", () => {
  it("updateMember menolak pengguna yang belum masuk", async () => {
    state.loggedIn = false;

    const member = getStore().members[0];
    const before = member.name;

    const result = await run(() =>
      updateMember(form({ id: member.id, name: "Nama Diambil Alih" })),
    );

    expect(result.ok).toBe(false);
    expect(getStore().members[0].name).toBe(before);
  });

  it("toggleMemberActive menolak pengguna yang belum masuk", async () => {
    state.loggedIn = false;

    const member = getStore().members.find((m) => m.role !== "owner") ?? getStore().members[0];
    const before = member.active;

    const result = await run(() => toggleMemberActive(form({ id: member.id })));

    expect(result.ok).toBe(false);
    expect(getStore().members.find((m) => m.id === member.id)?.active).toBe(before);
  });

  it("deleteMember menolak pengguna yang belum masuk", async () => {
    state.loggedIn = false;

    const member = getStore().members.find((m) => m.role !== "owner");
    if (!member) return;

    const before = getStore().members.length;

    const result = await run(() => deleteMember(form({ id: member.id })));

    expect(result.ok).toBe(false);
    expect(getStore().members).toHaveLength(before);
  });
});

describe("aksi anggota dengan sesi", () => {
  it("updateMember tetap bekerja untuk pengguna yang masuk", async () => {
    const member = getStore().members[0];

    const result = await updateMember(
      form({ id: member.id, name: "Nama Baru" }),
    );

    expect(result.ok).toBe(true);
    expect(getStore().members[0].name).toBe("Nama Baru");
  });

  it("deleteMember menolak menghapus pemilik terakhir", async () => {
    const owner = getStore().members.find((m) => m.role === "owner" && m.active);
    if (!owner) return;

    // Pastikan hanya ada satu pemilik aktif.
    for (const member of getStore().members) {
      if (member.role === "owner" && member.id !== owner.id) member.active = false;
    }

    const result = await deleteMember(form({ id: owner.id }));
    expect(result.ok).toBe(false);
    expect(getStore().members.some((m) => m.id === owner.id)).toBe(true);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Aksi anggota kini memeriksa sesi (`requireViewer`), karena `members` berlaku
 * lintas ruang dan tidak bisa disaring lewat `workspaceId`. Test ini perlu
 * tiruan sesi agar bisa memanggil aksinya.
 */
vi.mock("@/lib/session", async () => {
  const { sessionMock } = await import("./helpers/session");
  return sessionMock();
});

const { getStore, resetStore } = await import("@/lib/data/store");
const { createMember, deleteMember, toggleMemberActive, updateMember } =
  await import("@/lib/data/actions");
const { setViewer } = await import("./helpers/session");

/**
 * Kelola anggota keluarga.
 *
 * Aturan yang dijaga:
 * - Pemilik terakhir tidak boleh dihapus/dinonaktifkan/diturunkan perannya.
 * - Anggota yang punya catatan tidak dihapus, hanya dinonaktifkan.
 * - Anggota tanpa catatan boleh dihapus permanen.
 */

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  resetStore();
  setViewer({ workspaceId: "ws-family", role: "owner" });
});

describe("createMember", () => {
  it("menambah anggota baru", async () => {
    const before = getStore().members.length;
    const result = await createMember(
      form({ name: "Uji Baru", relationship: "child", role: "child" }),
    );

    expect(result.ok).toBe(true);
    expect(getStore().members.length).toBe(before + 1);
    expect(getStore().members.at(-1)?.name).toBe("Uji Baru");
  });

  it("menolak nama kosong", async () => {
    const before = getStore().members.length;
    const result = await createMember(form({ name: "   " }));

    expect(result.ok).toBe(false);
    expect(getStore().members.length).toBe(before);
  });
});

describe("updateMember", () => {
  it("mengubah nama dan peran", async () => {
    const member = getStore().members.find((m) => m.id === "m-bima")!;
    const result = await updateMember(
      form({ id: member.id, name: "Bima Baru", role: "teen", relationship: "child" }),
    );

    expect(result.ok).toBe(true);
    expect(member.name).toBe("Bima Baru");
    expect(member.role).toBe("teen");
  });

  it("menolak menurunkan pemilik terakhir", async () => {
    const result = await updateMember(
      form({ id: "m-irvan", name: "Irvan", role: "adult", relationship: "self" }),
    );

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Pemilik/i);
    expect(getStore().members.find((m) => m.id === "m-irvan")?.role).toBe("owner");
  });

  it("mengizinkan menurunkan pemilik bila ada pemilik lain", async () => {
    // Angkat Sari jadi pemilik lebih dulu.
    await updateMember(
      form({ id: "m-sari", name: "Sari", role: "owner", relationship: "spouse" }),
    );
    const result = await updateMember(
      form({ id: "m-irvan", name: "Irvan", role: "adult", relationship: "self" }),
    );

    expect(result.ok).toBe(true);
    expect(getStore().members.find((m) => m.id === "m-irvan")?.role).toBe("adult");
  });
});

describe("toggleMemberActive", () => {
  it("menonaktifkan lalu mengaktifkan kembali", async () => {
    const member = getStore().members.find((m) => m.id === "m-nara")!;

    await toggleMemberActive(form({ id: member.id }));
    expect(member.active).toBe(false);

    await toggleMemberActive(form({ id: member.id }));
    expect(member.active).toBe(true);
  });

  it("menolak menonaktifkan pemilik terakhir", async () => {
    const result = await toggleMemberActive(form({ id: "m-irvan" }));

    expect(result.ok).toBe(false);
    expect(getStore().members.find((m) => m.id === "m-irvan")?.active).toBe(true);
  });
});

describe("deleteMember", () => {
  it("menolak menghapus anggota yang punya catatan", async () => {
    // Bima bukan pemilik, tetapi punya transaksi dan tugas.
    const before = getStore().members.length;
    const result = await deleteMember(form({ id: "m-bima" }));

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Nonaktifkan/i);
    expect(getStore().members.length).toBe(before);
  });

  it("menolak menghapus pemilik terakhir", async () => {
    const result = await deleteMember(form({ id: "m-irvan" }));
    expect(result.ok).toBe(false);
  });

  it("menghapus anggota tanpa catatan", async () => {
    await createMember(form({ name: "Sementara", relationship: "other", role: "viewer" }));
    const created = getStore().members.at(-1)!;
    const before = getStore().members.length;

    const result = await deleteMember(form({ id: created.id }));

    expect(result.ok).toBe(true);
    expect(getStore().members.length).toBe(before - 1);
    expect(getStore().members.some((m) => m.id === created.id)).toBe(false);
  });

  it("menolak id yang tidak ada", async () => {
    const result = await deleteMember(form({ id: "m-tidak-ada" }));
    expect(result.ok).toBe(false);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { resetStore, getStore } from "@/lib/data/store";
import {
  canCreateSharedWorkspace,
  findWorkspaceByInviteCode,
  isWorkspaceMember,
  personalWorkspaceOf,
  profilesForAccount,
  sharedWorkspacesOf,
  workspaceCompanions,
  workspaceMembersOf,
  workspaceRole,
  workspacesForProfile,
} from "@/lib/data/workspace";
import { MAX_SHARED_WORKSPACES } from "@/lib/data/types";
import { hashPin, verifyPin, PIN_PATTERN } from "@/lib/auth/password";

beforeEach(() => {
  resetStore();
});

describe("profil", () => {
  it("satu akun punya empat profil", () => {
    const profiles = profilesForAccount("u-irvan");
    expect(profiles).toHaveLength(4);
    expect(profiles.map((p) => p.name)).toEqual(["Irvan", "Sari", "Bima", "Nara"]);
  });

  it("hanya satu profil yang menjadi pemilik akun", () => {
    const owners = profilesForAccount("u-irvan").filter((p) => p.isAccountOwner);
    expect(owners).toHaveLength(1);
    expect(owners[0].name).toBe("Irvan");
  });

  it("setiap profil punya inisial untuk avatar", () => {
    for (const profile of getStore().profiles) {
      expect(profile.initial).toBeTruthy();
      expect(profile.initial.length).toBe(1);
    }
  });
});

describe("PIN profil", () => {
  it("menerima PIN yang benar", () => {
    const stored = hashPin("1234");
    expect(verifyPin("1234", stored)).toBe(true);
  });

  it("menolak PIN yang salah", () => {
    const stored = hashPin("1234");
    expect(verifyPin("4321", stored)).toBe(false);
    expect(verifyPin("", stored)).toBe(false);
  });

  it("hanya menerima 4–6 angka", () => {
    expect(PIN_PATTERN.test("1234")).toBe(true);
    expect(PIN_PATTERN.test("123456")).toBe(true);
    expect(PIN_PATTERN.test("123")).toBe(false);
    expect(PIN_PATTERN.test("1234567")).toBe(false);
    expect(PIN_PATTERN.test("12a4")).toBe(false);
  });

  it("profil tanpa PIN tidak pernah cocok lewat verifyPin", () => {
    expect(verifyPin("1234", undefined)).toBe(false);
  });

  it("PIN tidak tersimpan sebagai teks biasa", () => {
    for (const profile of getStore().profiles) {
      expect(profile.pinHash).toBeTruthy();
      expect(profile.pinHash).not.toContain("1234");
      expect(profile.pinHash?.startsWith("scrypt$")).toBe(true);
    }
  });
});

describe("workspace", () => {
  it("setiap profil punya tepat satu ruang pribadi", () => {
    for (const profile of getStore().profiles) {
      const personal = personalWorkspaceOf(profile.id);
      expect(personal).toBeDefined();
      expect(personal?.type).toBe("personal");
      expect(personal?.ownerProfileId).toBe(profile.id);
    }
  });

  it("ruang pribadi hanya berisi pemiliknya", () => {
    const personal = personalWorkspaceOf("p-irvan")!;
    const members = workspaceMembersOf(personal.id);
    expect(members).toHaveLength(1);
    expect(members[0].profileId).toBe("p-irvan");
  });

  it("Irvan bisa membuka ruang pribadi dan workspace bersama", () => {
    const workspaces = workspacesForProfile("p-irvan");
    expect(workspaces.some((w) => w.type === "personal")).toBe(true);
    expect(workspaces.some((w) => w.type === "shared")).toBe(true);
  });

  it("Sari ikut dalam workspace bersama sebagai editor", () => {
    const shared = sharedWorkspacesOf("p-sari");
    expect(shared.length).toBeGreaterThan(0);
    expect(workspaceRole(shared[0].id, "p-sari")).toBe("editor");
  });

  it("Bima belum ikut workspace bersama", () => {
    expect(sharedWorkspacesOf("p-bima")).toHaveLength(0);
  });

  it("anggota workspace bersama terdaftar lengkap", () => {
    const shared = sharedWorkspacesOf("p-irvan")[0];
    const members = workspaceMembersOf(shared.id);
    expect(members.map((m) => m.profileId).sort()).toEqual(["p-irvan", "p-sari"]);
  });

  it("companion tidak menyertakan diri sendiri", () => {
    const shared = sharedWorkspacesOf("p-irvan")[0];
    const companions = workspaceCompanions(shared.id, "p-irvan");
    expect(companions).toHaveLength(1);
    expect(companions[0].id).toBe("p-sari");
  });

  it("keanggotaan bisa diperiksa", () => {
    const shared = sharedWorkspacesOf("p-irvan")[0];
    expect(isWorkspaceMember(shared.id, "p-irvan")).toBe(true);
    expect(isWorkspaceMember(shared.id, "p-bima")).toBe(false);
  });
});

describe("batas workspace bersama", () => {
  it("profil baru masih boleh membuat workspace bersama", () => {
    // Irvan baru punya 1 dari 2.
    expect(sharedWorkspacesOf("p-irvan")).toHaveLength(1);
    expect(canCreateSharedWorkspace("p-irvan")).toBe(true);
  });

  it("menolak saat sudah mencapai batas", () => {
    const store = getStore();
    store.workspaces.push({
      id: "ws-extra",
      name: "Usaha",
      type: "shared",
      ownerProfileId: "p-irvan",
      inviteCode: "USAHA-1",
      color: "sky",
      createdAt: new Date().toISOString(),
    });
    store.workspaceMembers.push({
      workspaceId: "ws-extra",
      profileId: "p-irvan",
      role: "owner",
      joinedAt: new Date().toISOString(),
    });

    expect(sharedWorkspacesOf("p-irvan")).toHaveLength(MAX_SHARED_WORKSPACES);
    expect(canCreateSharedWorkspace("p-irvan")).toBe(false);
  });

  it("ruang pribadi tidak dihitung ke batas", () => {
    expect(sharedWorkspacesOf("p-irvan").every((w) => w.type === "shared")).toBe(true);
    expect(canCreateSharedWorkspace("p-sari")).toBe(true);
  });
});

describe("undangan workspace", () => {
  it("kode undangan bisa dicari tanpa peka huruf besar", () => {
    expect(findWorkspaceByInviteCode("klrg-irvn")?.id).toBe("ws-family");
    expect(findWorkspaceByInviteCode("  KLRG-IRVN  ")?.id).toBe("ws-family");
  });

  it("kode tidak dikenal mengembalikan undefined", () => {
    expect(findWorkspaceByInviteCode("TIDAK-ADA")).toBeUndefined();
  });

  it("ruang pribadi tidak punya kode undangan", () => {
    for (const workspace of getStore().workspaces) {
      if (workspace.type === "personal") {
        expect(workspace.inviteCode).toBeUndefined();
      }
    }
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { getStore, resetStore, WS } from "@/lib/data/store";

/**
 * Invariant: setiap entitas ter-scope wajib punya `workspaceId`.
 *
 * `workspaceId` sengaja dibuat opsional di tipe agar data lama tetap bisa
 * dimuat. Konsekuensinya TypeScript **tidak** menangkap aksi baru yang lupa
 * mengisinya — dan bug itu diam: data tersimpan tetapi tidak muncul di query
 * mana pun karena semua query memfilter per ruang.
 *
 * Test ini menutup celah tersebut dari sisi data: apa pun yang ada di store
 * harus punya ruang. Jadi kelalaian di masa depan langsung gagal di CI,
 * tanpa perlu mengubah 17 deklarasi tipe sekaligus.
 */

/** Koleksi yang isinya harus terikat ke satu ruang. */
const SCOPED_COLLECTIONS = [
  "accounts",
  "categories",
  "transactions",
  "budgets",
  "bills",
  "billPayments",
  "goals",
  "contributions",
  "events",
  "chores",
  "shopping",
  "debts",
  "assets",
  "insurances",
  "documents",
  "healthRecords",
  "educationRecords",
] as const;

beforeEach(() => {
  resetStore();
});

describe("invariant workspaceId", () => {
  it.each(SCOPED_COLLECTIONS)("setiap %s punya workspaceId", (collection) => {
    const rows = getStore()[collection] as Array<{
      id: string;
      workspaceId?: string;
    }>;

    const missing = rows.filter((row) => !row.workspaceId);

    expect(
      missing.map((row) => row.id),
      `${collection} memiliki entitas tanpa workspaceId`,
    ).toEqual([]);
  });

  it.each(SCOPED_COLLECTIONS)(
    "setiap %s menunjuk ruang yang benar-benar ada",
    (collection) => {
      const store = getStore();
      const workspaceIds = new Set(store.workspaces.map((workspace) => workspace.id));
      const rows = store[collection] as Array<{
        id: string;
        workspaceId?: string;
      }>;

      const dangling = rows.filter(
        (row) => row.workspaceId && !workspaceIds.has(row.workspaceId),
      );

      expect(
        dangling.map((row) => `${row.id} → ${row.workspaceId}`),
        `${collection} menunjuk workspace yang tidak ada`,
      ).toEqual([]);
    },
  );

  it("transaksi mencatat siapa yang mencatatnya", () => {
    const store = getStore();
    const profileIds = new Set(store.profiles.map((profile) => profile.id));

    const withoutRecorder = store.transactions.filter(
      (tx) => !tx.recordedByProfileId,
    );
    expect(withoutRecorder.map((tx) => tx.id)).toEqual([]);

    const unknownRecorder = store.transactions.filter(
      (tx) => tx.recordedByProfileId && !profileIds.has(tx.recordedByProfileId),
    );
    expect(unknownRecorder.map((tx) => tx.id)).toEqual([]);
  });

  it("dokumen dan catatan kesehatan punya pencatat", () => {
    const store = getStore();
    const profileIds = new Set(store.profiles.map((profile) => profile.id));

    for (const collection of ["documents", "healthRecords"] as const) {
      const rows = store[collection] as Array<{
        id: string;
        recordedByProfileId?: string;
      }>;
      const unknown = rows.filter(
        (row) => row.recordedByProfileId && !profileIds.has(row.recordedByProfileId),
      );
      expect(
        unknown.map((row) => row.id),
        `${collection} menunjuk profil yang tidak ada`,
      ).toEqual([]);
    }
  });
});

describe("ruang pribadi terpisah dari ruang bersama", () => {
  it("setiap profil punya tepat satu ruang pribadi", () => {
    const store = getStore();

    for (const profile of store.profiles) {
      const personal = store.workspaces.filter(
        (workspace) =>
          workspace.type === "personal" && workspace.ownerProfileId === profile.id,
      );
      expect(
        personal.length,
        `profil ${profile.name} punya ${personal.length} ruang pribadi`,
      ).toBe(1);
    }
  });

  it("ruang bersama punya kode undangan, ruang pribadi tidak", () => {
    const store = getStore();

    for (const workspace of store.workspaces) {
      if (workspace.type === "shared") {
        expect(workspace.inviteCode, `${workspace.name} tidak punya kode undangan`)
          .toBeTruthy();
      } else {
        expect(
          workspace.inviteCode,
          `${workspace.name} adalah ruang pribadi tetapi punya kode undangan`,
        ).toBeUndefined();
      }
    }
  });

  it("setiap ruang punya minimal satu anggota, dan pemiliknya terdaftar", () => {
    const store = getStore();

    for (const workspace of store.workspaces) {
      const members = store.workspaceMembers.filter(
        (member) => member.workspaceId === workspace.id,
      );
      expect(members.length, `${workspace.name} tanpa anggota`).toBeGreaterThan(0);

      const owner = members.find(
        (member) => member.profileId === workspace.ownerProfileId,
      );
      expect(owner, `${workspace.name} tidak mendaftarkan pemiliknya`).toBeDefined();
      expect(owner?.role).toBe("owner");
    }
  });

  it("tidak ada profil yang jadi anggota ruang pribadi orang lain", () => {
    const store = getStore();

    for (const workspace of store.workspaces) {
      if (workspace.type !== "personal") continue;

      const members = store.workspaceMembers.filter(
        (member) => member.workspaceId === workspace.id,
      );
      const outsiders = members.filter(
        (member) => member.profileId !== workspace.ownerProfileId,
      );

      expect(
        outsiders.map((member) => member.profileId),
        `${workspace.name} berisi profil lain`,
      ).toEqual([]);
    }
  });

  it("data keluarga tidak bocor ke ruang pribadi", () => {
    const store = getStore();

    const familyRows = store.transactions.filter(
      (tx) => tx.workspaceId === WS.family,
    );
    const personalRows = store.transactions.filter(
      (tx) => tx.workspaceId === WS.irvan,
    );

    expect(familyRows.length).toBeGreaterThan(0);

    // Tidak ada id yang muncul di dua ruang sekaligus.
    const familyIds = new Set(familyRows.map((tx) => tx.id));
    expect(personalRows.some((tx) => familyIds.has(tx.id))).toBe(false);
  });
});

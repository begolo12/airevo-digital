import { beforeEach, describe, expect, it } from "vitest";

/**
 * Isolasi ruang pada halaman detail.
 *
 * `goalById()` menerima id dari URL, bukan dari sesi. Tanpa penyaringan ruang,
 * pengguna yang login di satu ruang bisa membuka tujuan milik ruang lain hanya
 * dengan mengetahui id-nya — kebocoran data keuangan lintas profil.
 *
 * Test ini menjaga agar setiap fungsi pencarian berdasarkan id tetap sadar
 * ruang.
 */

const { getStore, resetStore, WS } = await import("@/lib/data/store");
const { goalById, contributionsFor } = await import("@/lib/data/queries");

beforeEach(() => {
  resetStore();
});

describe("goalById", () => {
  it("menemukan tujuan milik ruang yang diminta", () => {
    const store = getStore();
    const goal = store.goals.find((item) => item.workspaceId === WS.family);
    if (!goal) throw new Error("Data contoh tidak punya tujuan di ws-family");

    const found = goalById(goal.id, WS.family);
    expect(found?.id).toBe(goal.id);
  });

  it("menolak tujuan milik ruang lain", () => {
    const store = getStore();
    const goal = store.goals.find((item) => item.workspaceId === WS.family);
    if (!goal) throw new Error("Data contoh tidak punya tujuan di ws-family");

    /*
     * Inilah kebocorannya: id sah, tetapi bukan milik ruang peminta.
     * Harus mengembalikan undefined, bukan datanya.
     */
    const found = goalById(goal.id, WS.sari);
    expect(found).toBeUndefined();
  });

  it("mengembalikan undefined untuk id yang tidak ada", () => {
    expect(goalById("g-tidak-ada", WS.family)).toBeUndefined();
  });
});

describe("contributionsFor", () => {
  it("hanya mengembalikan kontribusi milik ruang yang diminta", () => {
    const store = getStore();
    const goal = store.goals.find((item) => item.workspaceId === WS.family);
    if (!goal) throw new Error("Data contoh tidak punya tujuan di ws-family");

    const own = contributionsFor(goal.id, WS.family);
    expect(own.every((item) => item.goalId === goal.id)).toBe(true);

    // Ruang lain tidak boleh melihat kontribusi tujuan ini.
    const other = contributionsFor(goal.id, WS.sari);
    expect(other).toHaveLength(0);
  });
});

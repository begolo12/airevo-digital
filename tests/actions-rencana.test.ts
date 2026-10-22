import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionResult } from "@/lib/data/types";

/**
 * Test server action modul rencana, agenda, tugas, belanja, utang, aset,
 * asuransi, dokumen, kesehatan, dan pendidikan.
 *
 * ## Kenapa `vi.mock` ditulis di berkas ini, bukan memakai tests/helpers/session.ts
 *
 * Helper tersebut membungkus `vi.mock("@/lib/session")` di dalam fungsi
 * `mockSessionModule()`. Vitest 5 menolak bentuk itu: berkas helper gagal
 * ditransformasi ("vi.mock ... was defined outside of the module's top level
 * scope") bahkan hanya dengan mengimpornya, sehingga semua test yang memakai
 * helper tidak pernah berjalan. Karena tugas ini hanya boleh menyentuh satu
 * berkas, tiruan sesi ditulis langsung di sini (isi & perilakunya sama dengan
 * helper). Perbaikan helper dilaporkan terpisah, bukan diubah di sini.
 *
 * ## Pola tiap test
 *
 * 1. Jalur berhasil diperiksa lewat isi `getStore()`, bukan hanya `result.ok`.
 * 2. Validasi input salah harus mengembalikan `{ ok: false }` **dan** tidak
 *    mengubah store.
 * 3. Isolasi ruang: entitas milik `WS.family` tidak boleh bisa diubah dari
 *    `WS.irvan`, begitu pula sebaliknya.
 *
 * `it.fails` dipakai untuk perilaku yang **seharusnya** berlaku tetapi belum
 * diterapkan kode produksi (bug yang dilaporkan, bukan diperbaiki). Selama bug
 * masih ada, test tersebut dianggap lulus; setelah kode diperbaiki test akan
 * merah dan penanda `.fails` harus dihapus.
 */

type Role = "owner" | "adult" | "teen" | "child" | "viewer";

/** Sesi tiruan; diubah lewat `masukSebagai()`. */
const viewerState: {
  userId: string;
  profileId: string;
  workspaceId: string;
  role: Role;
} = {
  userId: "u-irvan",
  profileId: "p-irvan",
  workspaceId: "ws-family",
  role: "owner",
};

vi.mock("@/lib/session", async () => {
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
    /*
     * Setia pada perilaku asli: melempar redirect saat tidak ada sesi.
     * Mock yang mengembalikan `null` membuat aksi tetap berjalan tanpa sesi,
     * sehingga test otorisasi bisa lulus palsu.
     */
    requireViewer: async () => {
      const viewer = currentViewer();
      if (!viewer) throw new Error("NEXT_REDIRECT:/pilih-profil");
      return viewer;
    },
    getSession: async () => null,
    getAccountSession: async () => currentViewer(),
    requireActiveSession: async () => currentViewer(),
    requireSession: async () => currentViewer(),
    requireAccountSession: async () => currentViewer(),
    createSession: async () => {},
    destroySession: async () => {},
  };
});

// Import setelah tiruan sesi terdaftar: `actions.ts` mengimpor `@/lib/session`,
// jadi tiruan harus aktif sebelum modul aksi dimuat.
const { getStore, resetStore, WS } = await import("@/lib/data/store");
const {
  createGoal,
  addContribution,
  updateGoalStatus,
  createEvent,
  deleteEvent,
  createChore,
  setChoreStatus,
  deleteChore,
  addShoppingItem,
  toggleShoppingItem,
  clearCheckedShopping,
  createDebt,
  payDebt,
  closeDebt,
  deleteDebt,
  createAsset,
  updateAssetValue,
  deleteAsset,
  createInsurance,
  deleteInsurance,
  createDocument,
  deleteDocument,
  createHealthRecord,
  deleteHealthRecord,
  createEducationRecord,
  deleteEducationRecord,
} = await import("@/lib/data/actions");

function form(fields: Record<string, string | number | undefined>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) data.set(key, String(value));
  }
  return data;
}

/** Atur siapa yang "sedang masuk" pada test berikutnya. */
function masukSebagai(workspaceId: string, profileId = "p-irvan") {
  Object.assign(viewerState, {
    userId: "u-irvan",
    profileId,
    role: "owner" as Role,
    workspaceId,
  });
}

beforeEach(() => {
  // Store adalah keadaan global per proses; reset agar test tidak saling
  // mewarisi mutasi.
  resetStore();
  masukSebagai(WS.family);
});

/* ---------------------------------- tujuan -------------------------------- */

describe("tujuan", () => {
  it("createGoal menyimpan tujuan baru di ruang aktif dengan tabungan nol", async () => {
    const sebelum = getStore().goals.length;

    const hasil = await createGoal(
      form({
        name: "Renovasi dapur",
        type: "home",
        targetAmount: 25_000_000,
        targetDate: "2027-06-01",
      }),
    );

    expect(hasil.ok).toBe(true);
    expect(getStore().goals).toHaveLength(sebelum + 1);
    expect(getStore().goals.at(-1)).toMatchObject({
      name: "Renovasi dapur",
      type: "home",
      targetAmount: 25_000_000,
      savedAmount: 0,
      status: "active",
      workspaceId: WS.family,
      recordedByProfileId: "p-irvan",
    });
  });

  it("createGoal menolak nama kosong tanpa menambah tujuan", async () => {
    const sebelum = getStore().goals.length;

    const hasil = await createGoal(
      form({ name: "   ", type: "custom", targetAmount: 1_000 }),
    );

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toMatch(/Nama tujuan/);
    expect(getStore().goals).toHaveLength(sebelum);
  });

  it("createGoal menolak target nol tanpa menambah tujuan", async () => {
    const sebelum = getStore().goals.length;

    const hasil = await createGoal(
      form({ name: "Tujuan tanpa target", type: "custom", targetAmount: 0 }),
    );

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toMatch(/Target/);
    expect(getStore().goals).toHaveLength(sebelum);
  });

  it("createGoal menolak akun milik ruang lain", async () => {
    // Rujukan lintas-ruang harus ditolak; kalau lolos, tujuan ruang keluarga
    // akan menunjuk akun pribadi orang lain.
    const akunAsing = getStore().accounts.find((a) => a.workspaceId === WS.irvan)!;
    const sebelum = getStore().goals.length;

    const hasil = await createGoal(
      form({
        name: "Tujuan akun asing",
        type: "custom",
        targetAmount: 1_000,
        accountId: akunAsing.id,
      }),
    );

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toMatch(/Akun/);
    expect(getStore().goals).toHaveLength(sebelum);
  });

  it("createGoal menerima anggota keluarga yang sah sebagai pemilik tujuan", async () => {
    /*
     * BUG: `invalidReference()` mencocokkan `workspaceId` pada koleksi
     * `store.members`, padahal anggota keluarga tidak pernah diberi
     * `workspaceId` (tidak ada di SCOPED_KEYS store.ts). Akibatnya SEMUA id
     * anggota dianggap "tidak ditemukan di ruang ini", sehingga tujuan yang
     * dikaitkan ke anak (mis. dana pendidikan) tidak bisa dibuat dari UI.
     */
    const hasil = await createGoal(
      form({
        name: "Kuliah Bima",
        type: "education",
        targetAmount: 10_000_000,
        memberId: "m-bima",
      }),
    );

    expect(hasil.ok).toBe(true);
  });

  it("addContribution menambah savedAmount dan mencatat kontribusi", async () => {
    const goal = getStore().goals.find((g) => g.id === "g-liburan")!;
    const tabunganAwal = goal.savedAmount;
    const kontribusiAwal = getStore().contributions.length;

    const hasil = await addContribution(
      form({ goalId: goal.id, amount: 1_000_000, note: "Bonus proyek" }),
    );

    expect(hasil.ok).toBe(true);
    // Bukan hanya "ok": tabungan tujuan harus benar-benar bertambah.
    expect(goal.savedAmount).toBe(tabunganAwal + 1_000_000);
    expect(getStore().contributions).toHaveLength(kontribusiAwal + 1);
    expect(getStore().contributions.at(-1)).toMatchObject({
      goalId: goal.id,
      amount: 1_000_000,
      note: "Bonus proyek",
      workspaceId: WS.family,
      recordedByProfileId: "p-irvan",
    });
  });

  it("addContribution menandai tujuan achieved begitu target tercapai", async () => {
    const goal = getStore().goals.find((g) => g.id === "g-liburan")!;
    expect(goal.status).toBe("active");

    const hasil = await addContribution(
      form({ goalId: goal.id, amount: goal.targetAmount }),
    );

    expect(hasil.ok).toBe(true);
    expect(goal.savedAmount).toBeGreaterThanOrEqual(goal.targetAmount);
    // Status harus ikut berubah, bukan hanya nominalnya.
    expect(goal.status).toBe("achieved");
  });

  it("addContribution menolak jumlah nol tanpa mengubah store", async () => {
    const goal = getStore().goals.find((g) => g.id === "g-liburan")!;
    const tabunganAwal = goal.savedAmount;
    const kontribusiAwal = getStore().contributions.length;

    const hasil = await addContribution(form({ goalId: goal.id, amount: 0 }));

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toMatch(/lebih dari nol/);
    expect(goal.savedAmount).toBe(tabunganAwal);
    expect(getStore().contributions).toHaveLength(kontribusiAwal);
  });

  it("addContribution menolak tujuan milik ruang lain", async () => {
    const goal = getStore().goals.find((g) => g.id === "g-darurat")!;
    const tabunganAwal = goal.savedAmount;

    masukSebagai(WS.irvan);
    const hasil = await addContribution(form({ goalId: goal.id, amount: 500_000 }));

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toMatch(/Tujuan tidak ditemukan/);
    expect(goal.savedAmount).toBe(tabunganAwal);
  });

  it("addContribution menolak tujuan milik ruang pribadi profil lain", async () => {
    // Tujuan dibuat di ruang pribadi Irvan, lalu dicoba diisi dari ruang
    // keluarga: id yang sama tidak boleh bisa ditembus hanya karena tahu id.
    masukSebagai(WS.irvan);
    await createGoal(
      form({ name: "Tujuan pribadi Irvan", type: "custom", targetAmount: 2_000_000 }),
    );
    const goal = getStore().goals.at(-1)!;
    expect(goal.workspaceId).toBe(WS.irvan);

    masukSebagai(WS.family);
    const hasil = await addContribution(form({ goalId: goal.id, amount: 100_000 }));

    expect(hasil.ok).toBe(false);
    expect(goal.savedAmount).toBe(0);
  });

  it("addContribution menolak jumlah non-numerik", async () => {
    /*
     * BUG: `Number("abc")` menghasilkan NaN, dan `NaN <= 0` bernilai false,
     * sehingga validasi "harus lebih dari nol" lolos. `savedAmount` lalu
     * menjadi NaN (tersimpan sebagai null) — data tujuan rusak permanen.
     */
    const goal = getStore().goals.find((g) => g.id === "g-liburan")!;

    const hasil = await addContribution(form({ goalId: goal.id, amount: "abc" }));

    expect(hasil.ok).toBe(false);
  });

  it("updateGoalStatus mengubah status tujuan", async () => {
    const goal = getStore().goals.find((g) => g.id === "g-darurat")!;

    const hasil = await updateGoalStatus(
      form({ goalId: goal.id, status: "paused" }),
    );

    expect(hasil.ok).toBe(true);
    expect(goal.status).toBe("paused");
  });

  it("updateGoalStatus menolak tujuan ruang lain", async () => {
    const goal = getStore().goals.find((g) => g.id === "g-darurat")!;

    masukSebagai(WS.irvan);
    const hasil = await updateGoalStatus(
      form({ goalId: goal.id, status: "achieved" }),
    );

    expect(hasil.ok).toBe(false);
    expect(goal.status).toBe("active");
  });

  it("updateGoalStatus menolak status di luar active/achieved/paused", async () => {
    /*
     * BUG: status hanya di-cast (`as "active" | "achieved" | "paused"`) tanpa
     * divalidasi, jadi string sembarang ikut tersimpan dan melanggar tipe
     * Goal["status"]. UI yang memetakan status ke label/warna akan kosong.
     */
    const goal = getStore().goals.find((g) => g.id === "g-darurat")!;

    const hasil = await updateGoalStatus(
      form({ goalId: goal.id, status: "selesai" }),
    );

    expect(hasil.ok).toBe(false);
  });
});

/* ---------------------------------- agenda -------------------------------- */

describe("agenda", () => {
  it("createEvent menyimpan acara dan menandainya sepanjang hari bila tanpa jam", async () => {
    const sebelum = getStore().events.length;

    const hasil = await createEvent(
      form({ title: "Syukuran rumah", type: "family", date: "2026-11-20" }),
    );

    expect(hasil.ok).toBe(true);
    expect(getStore().events).toHaveLength(sebelum + 1);
    expect(getStore().events.at(-1)).toMatchObject({
      title: "Syukuran rumah",
      type: "family",
      date: "2026-11-20",
      allDay: true,
      workspaceId: WS.family,
      recordedByProfileId: "p-irvan",
    });
  });

  it("createEvent memakai allDay=false saat jam diisi", async () => {
    await createEvent(
      form({
        title: "Kontrol gigi",
        type: "medical",
        date: "2026-11-21",
        time: "09:30",
      }),
    );

    expect(getStore().events.at(-1)).toMatchObject({
      time: "09:30",
      allDay: false,
    });
  });

  it("createEvent menolak tanggal tidak valid tanpa menambah acara", async () => {
    const sebelum = getStore().events.length;

    const hasil = await createEvent(
      form({ title: "Tanggal ngawur", type: "family", date: "20-11-2026" }),
    );

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toMatch(/Tanggal tidak valid/);
    expect(getStore().events).toHaveLength(sebelum);
  });

  it("createEvent menolak judul kosong tanpa menambah acara", async () => {
    const sebelum = getStore().events.length;

    const hasil = await createEvent(
      form({ title: "  ", type: "family", date: "2026-11-20" }),
    );

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toMatch(/Judul acara/);
    expect(getStore().events).toHaveLength(sebelum);
  });

  it("deleteEvent menghapus acara ruang aktif", async () => {
    const acara = getStore().events.find((e) => e.id === "e-1")!;
    const sebelum = getStore().events.length;

    const hasil = await deleteEvent(form({ id: acara.id }));

    expect(hasil.ok).toBe(true);
    expect(getStore().events).toHaveLength(sebelum - 1);
    expect(getStore().events.some((e) => e.id === "e-1")).toBe(false);
  });

  it("deleteEvent melaporkan gagal saat id tidak ada", async () => {
    // Sukses palsu membuat UI tidak bisa membedakan "terhapus" dari
    // "tidak ada apa-apa", dan menyembunyikan id yang salah.
    const sebelum = getStore().events.length;

    const hasil = await deleteEvent(form({ id: "e-tidak-ada" }));

    expect(hasil.ok).toBe(false);
    expect(getStore().events).toHaveLength(sebelum);
  });
});

/* ---------------------------------- tugas --------------------------------- */

describe("tugas", () => {
  it("createChore menyimpan tugas baru berstatus todo", async () => {
    const sebelum = getStore().chores.length;

    const hasil = await createChore(
      form({
        title: "Menyiram tanaman",
        frequency: "daily",
        dueDate: "2026-11-03",
        points: 2,
      }),
    );

    expect(hasil.ok).toBe(true);
    expect(getStore().chores).toHaveLength(sebelum + 1);
    expect(getStore().chores.at(-1)).toMatchObject({
      title: "Menyiram tanaman",
      frequency: "daily",
      dueDate: "2026-11-03",
      status: "todo",
      points: 2,
      workspaceId: WS.family,
      recordedByProfileId: "p-irvan",
    });
  });

  it("createChore menolak judul kosong tanpa menambah tugas", async () => {
    const sebelum = getStore().chores.length;

    const hasil = await createChore(form({ title: "   " }));

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toMatch(/Nama tugas/);
    expect(getStore().chores).toHaveLength(sebelum);
  });

  it("createChore menerima anggota keluarga yang sah sebagai penanggung jawab", async () => {
    // BUG yang sama dengan createGoal: rujukan `members` selalu dianggap asing
    // karena `findScoped()` mewajibkan `workspaceId` yang tidak dimiliki
    // anggota keluarga. Akibatnya tugas tidak bisa ditugaskan ke siapa pun.
    const hasil = await createChore(
      form({ title: "Buang sampah", assigneeMemberId: "m-bima" }),
    );

    expect(hasil.ok).toBe(true);
  });

  it("setChoreStatus mengubah status tugas", async () => {
    const chore = getStore().chores.find((c) => c.id === "ch-1")!;
    expect(chore.status).toBe("todo");

    const hasil = await setChoreStatus(form({ id: chore.id, status: "done" }));

    expect(hasil.ok).toBe(true);
    expect(chore.status).toBe("done");
  });

  it("setChoreStatus menolak tugas ruang lain", async () => {
    const chore = getStore().chores.find((c) => c.id === "ch-1")!;

    masukSebagai(WS.irvan);
    const hasil = await setChoreStatus(form({ id: chore.id, status: "done" }));

    expect(hasil.ok).toBe(false);
    expect(chore.status).toBe("todo");
  });

  it("deleteChore menghapus tugas ruang aktif", async () => {
    const chore = getStore().chores.find((c) => c.id === "ch-1")!;
    const sebelum = getStore().chores.length;

    const hasil = await deleteChore(form({ id: chore.id }));

    expect(hasil.ok).toBe(true);
    expect(getStore().chores).toHaveLength(sebelum - 1);
    expect(getStore().chores.some((c) => c.id === chore.id)).toBe(false);
  });
});

/* --------------------------------- belanja -------------------------------- */

describe("belanja", () => {
  it("addShoppingItem menyimpan barang baru dalam keadaan belum dicentang", async () => {
    const sebelum = getStore().shopping.length;

    const hasil = await addShoppingItem(
      form({ name: "Kopi bubuk", qty: 2, unit: "paket", estimatedPrice: 55_000 }),
    );

    expect(hasil.ok).toBe(true);
    expect(getStore().shopping).toHaveLength(sebelum + 1);
    expect(getStore().shopping.at(-1)).toMatchObject({
      name: "Kopi bubuk",
      qty: 2,
      unit: "paket",
      estimatedPrice: 55_000,
      checked: false,
      workspaceId: WS.family,
      recordedByProfileId: "p-irvan",
    });
  });

  it("addShoppingItem menolak nama kosong tanpa menambah barang", async () => {
    const sebelum = getStore().shopping.length;

    const hasil = await addShoppingItem(form({ name: "   ", qty: 1 }));

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toMatch(/Nama barang/);
    expect(getStore().shopping).toHaveLength(sebelum);
  });

  it("addShoppingItem menolak jumlah nol tanpa menambah barang", async () => {
    const sebelum = getStore().shopping.length;

    const hasil = await addShoppingItem(form({ name: "Sabun", qty: 0 }));

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toMatch(/lebih dari nol/);
    expect(getStore().shopping).toHaveLength(sebelum);
  });

  it("addShoppingItem menolak harga perkiraan negatif", async () => {
    /*
     * BUG: `estimatedPrice` tidak divalidasi sama sekali. Nilai negatif ikut
     * tersimpan dan membuat total belanja (`shoppingTotals`) menjadi negatif.
     */
    const sebelum = getStore().shopping.length;

    const hasil = await addShoppingItem(
      form({ name: "Barang aneh", qty: 1, estimatedPrice: -5_000 }),
    );

    expect(hasil.ok).toBe(false);
    expect(getStore().shopping).toHaveLength(sebelum);
  });

  it("toggleShoppingItem membalik checked dua arah", async () => {
    const item = getStore().shopping.find((s) => s.id === "s-1")!;
    expect(item.checked).toBe(false);

    const pertama = await toggleShoppingItem(form({ id: item.id }));
    expect(pertama.ok).toBe(true);
    expect(item.checked).toBe(true);

    const kedua = await toggleShoppingItem(form({ id: item.id }));
    expect(kedua.ok).toBe(true);
    expect(item.checked).toBe(false);
  });

  it("toggleShoppingItem menolak barang ruang lain", async () => {
    const item = getStore().shopping.find((s) => s.id === "s-1")!;

    masukSebagai(WS.irvan);
    const hasil = await toggleShoppingItem(form({ id: item.id }));

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toMatch(/Barang tidak ditemukan/);
    expect(item.checked).toBe(false);
  });

  it("clearCheckedShopping hanya menghapus barang yang sudah dicentang", async () => {
    const sebelum = getStore().shopping.length;
    const dicentang = getStore().shopping.filter((s) => s.checked).map((s) => s.id);
    const belumDicentang = getStore()
      .shopping
      .filter((s) => !s.checked)
      .map((s) => s.id);
    expect(dicentang.length).toBeGreaterThan(0);

    const hasil = await clearCheckedShopping();

    expect(hasil.ok).toBe(true);
    expect(getStore().shopping).toHaveLength(sebelum - dicentang.length);
    for (const id of dicentang) {
      expect(getStore().shopping.some((s) => s.id === id)).toBe(false);
    }
    for (const id of belumDicentang) {
      expect(getStore().shopping.some((s) => s.id === id)).toBe(true);
    }
  });

  it("clearCheckedShopping tidak menyentuh barang ruang lain", async () => {
    /*
     * BUG: `clearCheckedShopping()` tidak memakai `currentScope()` sama sekali
     * dan memfilter seluruh koleksi `shopping`. Barang yang sudah dicentang di
     * ruang pribadi orang lain ikut terhapus saat pengguna membersihkan daftar
     * belanja ruang keluarga.
     */
    getStore().shopping.push({
      id: "s-ruang-lain",
      workspaceId: WS.irvan,
      name: "Barang ruang pribadi",
      qty: 1,
      unit: "pcs",
      estimatedPrice: 10_000,
      checked: true,
    });

    await clearCheckedShopping();

    expect(getStore().shopping.some((s) => s.id === "s-ruang-lain")).toBe(true);
  });

  it("clearCheckedShopping menolak pemanggilan tanpa sesi", async () => {
    // BUG: tanpa `currentScope()`, aksi ini tetap menghapus data meski sesi
    // sudah berakhir (cookie hilang/kedaluwarsa).
    const sebelum = getStore().shopping.length;

    masukSebagai("");
    const hasil = await clearCheckedShopping();

    expect(hasil.ok).toBe(false);
    expect(getStore().shopping).toHaveLength(sebelum);
  });
});

/* ---------------------------------- utang --------------------------------- */

describe("utang", () => {
  it("createDebt menyimpan utang dengan sisa awal sama dengan pokok", async () => {
    const sebelum = getStore().debts.length;

    const hasil = await createDebt(
      form({
        type: "payable",
        counterparty: "Koperasi sekolah",
        principal: 2_000_000,
      }),
    );

    expect(hasil.ok).toBe(true);
    expect(getStore().debts).toHaveLength(sebelum + 1);
    expect(getStore().debts.at(-1)).toMatchObject({
      type: "payable",
      counterparty: "Koperasi sekolah",
      principal: 2_000_000,
      remaining: 2_000_000,
      status: "active",
      workspaceId: WS.family,
      recordedByProfileId: "p-irvan",
    });
  });

  it("createDebt menolak sisa lebih besar dari pokok", async () => {
    const sebelum = getStore().debts.length;

    const hasil = await createDebt(
      form({
        type: "payable",
        counterparty: "Pinjaman aneh",
        principal: 1_000_000,
        remaining: 2_000_000,
      }),
    );

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toMatch(/Sisa tidak boleh lebih besar/);
    expect(getStore().debts).toHaveLength(sebelum);
  });

  it("createDebt menolak pokok nol tanpa menambah catatan", async () => {
    const sebelum = getStore().debts.length;

    const hasil = await createDebt(
      form({ type: "payable", counterparty: "Tanpa pokok", principal: 0 }),
    );

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toMatch(/Pokok pinjaman/);
    expect(getStore().debts).toHaveLength(sebelum);
  });

  it("payDebt mengurangi remaining sesuai jumlah pembayaran", async () => {
    const debt = getStore().debts.find((d) => d.id === "d-2")!;
    const sisaAwal = debt.remaining;

    const hasil = await payDebt(form({ id: debt.id, amount: 1_000_000 }));

    expect(hasil.ok).toBe(true);
    expect(debt.remaining).toBe(sisaAwal - 1_000_000);
    expect(debt.status).toBe("active");
  });

  it("payDebt tidak membuat remaining negatif dan menandai lunas", async () => {
    const debt = getStore().debts.find((d) => d.id === "d-2")!;

    const hasil = await payDebt(form({ id: debt.id, amount: 99_000_000 }));

    expect(hasil.ok).toBe(true);
    // Pembayaran melebihi sisa harus dijepit di nol, bukan menjadi minus.
    expect(debt.remaining).toBe(0);
    expect(debt.status).toBe("paid");
  });

  it("payDebt menolak jumlah nol tanpa mengubah remaining", async () => {
    const debt = getStore().debts.find((d) => d.id === "d-2")!;
    const sisaAwal = debt.remaining;

    const hasil = await payDebt(form({ id: debt.id, amount: 0 }));

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toMatch(/lebih dari nol/);
    expect(debt.remaining).toBe(sisaAwal);
  });

  it("payDebt menolak utang milik ruang lain", async () => {
    const debt = getStore().debts.find((d) => d.id === "d-1")!;
    const sisaAwal = debt.remaining;

    masukSebagai(WS.irvan);
    const hasil = await payDebt(form({ id: debt.id, amount: 1_000_000 }));

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toMatch(/Catatan tidak ditemukan/);
    expect(debt.remaining).toBe(sisaAwal);
  });

  it("payDebt menolak jumlah non-numerik", async () => {
    /*
     * BUG: sama seperti addContribution — `NaN <= 0` bernilai false sehingga
     * validasi lolos, lalu `Math.max(NaN - NaN, 0)` menghasilkan NaN dan
     * `remaining` utang rusak permanen.
     */
    const debt = getStore().debts.find((d) => d.id === "d-2")!;

    const hasil = await payDebt(form({ id: debt.id, amount: "abc" }));

    expect(hasil.ok).toBe(false);
  });

  it("closeDebt menandai lunas tanpa menghapus catatan", async () => {
    const debt = getStore().debts.find((d) => d.id === "d-1")!;
    const jumlahAwal = getStore().debts.length;

    const hasil = await closeDebt(form({ id: debt.id }));

    expect(hasil.ok).toBe(true);
    // Riwayat utang harus tetap ada agar laporan historis tidak berubah.
    expect(getStore().debts).toHaveLength(jumlahAwal);
    expect(getStore().debts.some((d) => d.id === "d-1")).toBe(true);
    expect(debt.status).toBe("paid");
    expect(debt.remaining).toBe(0);
  });

  it("closeDebt menolak utang milik ruang lain", async () => {
    const debt = getStore().debts.find((d) => d.id === "d-1")!;

    masukSebagai(WS.irvan);
    const hasil = await closeDebt(form({ id: debt.id }));

    expect(hasil.ok).toBe(false);
    expect(debt.status).toBe("active");
    expect(debt.remaining).toBe(268_500_000);
  });

  it("deleteDebt menghapus catatan ruang aktif", async () => {
    const debt = getStore().debts.find((d) => d.id === "d-3")!;
    const sebelum = getStore().debts.length;

    const hasil = await deleteDebt(form({ id: debt.id }));

    expect(hasil.ok).toBe(true);
    expect(getStore().debts).toHaveLength(sebelum - 1);
    expect(getStore().debts.some((d) => d.id === debt.id)).toBe(false);
  });
});

/* ----------------------------------- aset --------------------------------- */

describe("aset", () => {
  it("createAsset menyimpan aset baru", async () => {
    const sebelum = getStore().assets.length;

    const hasil = await createAsset(
      form({
        name: "Laptop kerja",
        type: "other",
        acquisitionValue: 18_000_000,
        currentValue: 15_000_000,
        acquiredAt: "2025-02-01",
      }),
    );

    expect(hasil.ok).toBe(true);
    expect(getStore().assets).toHaveLength(sebelum + 1);
    expect(getStore().assets.at(-1)).toMatchObject({
      name: "Laptop kerja",
      type: "other",
      acquisitionValue: 18_000_000,
      currentValue: 15_000_000,
      workspaceId: WS.family,
      recordedByProfileId: "p-irvan",
    });
  });

  it("createAsset menolak nilai sekarang negatif", async () => {
    const sebelum = getStore().assets.length;

    const hasil = await createAsset(
      form({ name: "Aset aneh", type: "gold", currentValue: -1 }),
    );

    expect(hasil.ok).toBe(false);
    expect(getStore().assets).toHaveLength(sebelum);
  });

  it("updateAssetValue memperbarui currentValue", async () => {
    const aset = getStore().assets.find((a) => a.id === "as-1")!;

    const hasil = await updateAssetValue(
      form({ id: aset.id, currentValue: 810_000_000 }),
    );

    expect(hasil.ok).toBe(true);
    expect(aset.currentValue).toBe(810_000_000);
  });

  it("updateAssetValue menolak nilai negatif tanpa mengubah aset", async () => {
    const aset = getStore().assets.find((a) => a.id === "as-1")!;
    const nilaiAwal = aset.currentValue;

    const hasil = await updateAssetValue(form({ id: aset.id, currentValue: -5 }));

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toMatch(/tidak boleh kurang dari|tidak valid/i);
    expect(aset.currentValue).toBe(nilaiAwal);
  });

  it("updateAssetValue menolak nilai non-numerik", async () => {
    /*
     * BUG: `Number("abc")` menghasilkan NaN, dan `NaN < 0` bernilai false,
     * sehingga penjagaan "nilai tidak valid" lolos. `currentValue` aset lalu
     * menjadi NaN — tersimpan sebagai `null` di store.json dan membuat
     * `netWorth()` menghasilkan NaN.
     */
    const aset = getStore().assets.find((a) => a.id === "as-1")!;
    const nilaiAwal = aset.currentValue;

    const hasil = await updateAssetValue(
      form({ id: aset.id, currentValue: "abc" }),
    );

    expect(hasil.ok).toBe(false);
    expect(aset.currentValue).toBe(nilaiAwal);
  });

  it("updateAssetValue menolak aset milik ruang lain", async () => {
    const aset = getStore().assets.find((a) => a.id === "as-1")!;
    const nilaiAwal = aset.currentValue;

    masukSebagai(WS.irvan);
    const hasil = await updateAssetValue(
      form({ id: aset.id, currentValue: 1_000 }),
    );

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toMatch(/Aset tidak ditemukan/);
    expect(aset.currentValue).toBe(nilaiAwal);
  });

  it("deleteAsset menghapus aset ruang aktif", async () => {
    const aset = getStore().assets.find((a) => a.id === "as-2")!;
    const sebelum = getStore().assets.length;

    const hasil = await deleteAsset(form({ id: aset.id }));

    expect(hasil.ok).toBe(true);
    expect(getStore().assets).toHaveLength(sebelum - 1);
    expect(getStore().assets.some((a) => a.id === aset.id)).toBe(false);
  });
});

/* -------------------------------- asuransi -------------------------------- */

describe("asuransi", () => {
  it("createInsurance menyimpan polis baru berstatus aktif", async () => {
    const sebelum = getStore().insurances.length;

    const hasil = await createInsurance(
      form({
        type: "health",
        provider: "Allianz",
        premium: 850_000,
        period: "monthly",
        policyNumber: "ALZ-001",
      }),
    );

    expect(hasil.ok).toBe(true);
    expect(getStore().insurances).toHaveLength(sebelum + 1);
    expect(getStore().insurances.at(-1)).toMatchObject({
      type: "health",
      provider: "Allianz",
      premium: 850_000,
      period: "monthly",
      policyNumber: "ALZ-001",
      status: "active",
      workspaceId: WS.family,
      recordedByProfileId: "p-irvan",
    });
  });

  it("createInsurance menolak penyedia kosong", async () => {
    const sebelum = getStore().insurances.length;

    const hasil = await createInsurance(
      form({ type: "health", provider: "  ", premium: 100_000, period: "monthly" }),
    );

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toMatch(/penyedia/);
    expect(getStore().insurances).toHaveLength(sebelum);
  });

  it("deleteInsurance menghapus polis ruang aktif", async () => {
    const polis = getStore().insurances.find((i) => i.id === "ins-1")!;
    const sebelum = getStore().insurances.length;

    const hasil = await deleteInsurance(form({ id: polis.id }));

    expect(hasil.ok).toBe(true);
    expect(getStore().insurances).toHaveLength(sebelum - 1);
    expect(getStore().insurances.some((i) => i.id === polis.id)).toBe(false);
  });
});

/* --------------------------------- dokumen -------------------------------- */

describe("dokumen", () => {
  it("createDocument menyimpan dokumen baru", async () => {
    const sebelum = getStore().documents.length;

    const hasil = await createDocument(
      form({
        title: "Paspor Irvan",
        category: "identity",
        documentNumber: "A1234567",
        issuer: "Imigrasi",
        visibility: "private",
      }),
    );

    expect(hasil.ok).toBe(true);
    expect(getStore().documents).toHaveLength(sebelum + 1);
    expect(getStore().documents.at(-1)).toMatchObject({
      title: "Paspor Irvan",
      category: "identity",
      documentNumber: "A1234567",
      visibility: "private",
      workspaceId: WS.family,
      recordedByProfileId: "p-irvan",
    });
  });

  it("createDocument menolak judul kosong", async () => {
    const sebelum = getStore().documents.length;

    const hasil = await createDocument(
      form({ title: "   ", category: "other", visibility: "household" }),
    );

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toMatch(/Judul dokumen/);
    expect(getStore().documents).toHaveLength(sebelum);
  });

  it("createDocument menolak kategori yang tidak dikenal", async () => {
    const sebelum = getStore().documents.length;

    const hasil = await createDocument(
      form({ title: "Dokumen aneh", category: "rahasia", visibility: "household" }),
    );

    expect(hasil.ok).toBe(false);
    expect(getStore().documents).toHaveLength(sebelum);
  });

  it("deleteDocument menghapus dokumen ruang aktif", async () => {
    const dokumen = getStore().documents.find((d) => d.id === "doc-1")!;
    const sebelum = getStore().documents.length;

    const hasil = await deleteDocument(form({ id: dokumen.id }));

    expect(hasil.ok).toBe(true);
    expect(getStore().documents).toHaveLength(sebelum - 1);
    expect(getStore().documents.some((d) => d.id === dokumen.id)).toBe(false);
  });
});

/* -------------------------------- kesehatan ------------------------------- */

describe("kesehatan", () => {
  it("createHealthRecord menyimpan catatan kesehatan baru", async () => {
    const sebelum = getStore().healthRecords.length;

    const hasil = await createHealthRecord(
      form({
        memberId: "m-bima",
        type: "checkup",
        title: "Imunisasi lanjutan",
        recordedAt: "2026-10-05",
        visibility: "household",
      }),
    );

    expect(hasil.ok).toBe(true);
    expect(getStore().healthRecords).toHaveLength(sebelum + 1);
    expect(getStore().healthRecords.at(-1)).toMatchObject({
      memberId: "m-bima",
      type: "checkup",
      title: "Imunisasi lanjutan",
      recordedAt: "2026-10-05",
      visibility: "household",
      workspaceId: WS.family,
      recordedByProfileId: "p-irvan",
    });
  });

  it("createHealthRecord menolak anggota kosong", async () => {
    const sebelum = getStore().healthRecords.length;

    const hasil = await createHealthRecord(
      form({
        memberId: "",
        type: "checkup",
        title: "Tanpa anggota",
        recordedAt: "2026-10-05",
        visibility: "household",
      }),
    );

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toMatch(/Pilih anggota/);
    expect(getStore().healthRecords).toHaveLength(sebelum);
  });

  it("createHealthRecord menolak format tanggal yang salah", async () => {
    const sebelum = getStore().healthRecords.length;

    const hasil = await createHealthRecord(
      form({
        memberId: "m-bima",
        type: "checkup",
        title: "Tanggal ngawur",
        recordedAt: "05-10-2026",
        visibility: "household",
      }),
    );

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toMatch(/Tanggal tidak valid/);
    expect(getStore().healthRecords).toHaveLength(sebelum);
  });

  it("createHealthRecord menolak tanggal yang tidak ada di kalender", async () => {
    /*
     * BUG: validasi tanggal hanya regex bentuk `\d{4}-\d{2}-\d{2}`, sehingga
     * bulan 13 dan tanggal 45 lolos. Catatan tersimpan dengan tanggal yang
     * tidak bisa diurai `new Date()`, lalu hilang dari pengurutan/laporan.
     */
    const sebelum = getStore().healthRecords.length;

    const hasil = await createHealthRecord(
      form({
        memberId: "m-bima",
        type: "checkup",
        title: "Tanggal mustahil",
        recordedAt: "2026-13-45",
        visibility: "household",
      }),
    );

    expect(hasil.ok).toBe(false);
    expect(getStore().healthRecords).toHaveLength(sebelum);
  });

  it("createHealthRecord menolak anggota yang tidak ada", async () => {
    /*
     * BUG: `memberId` hanya divalidasi "wajib diisi", tidak dicek ke koleksi
     * anggota. Catatan kesehatan untuk id anggota fiktif tetap tersimpan dan
     * muncul sebagai baris tanpa nama di halaman kesehatan.
     */
    const sebelum = getStore().healthRecords.length;

    const hasil = await createHealthRecord(
      form({
        memberId: "m-tidak-ada",
        type: "checkup",
        title: "Anggota fiktif",
        recordedAt: "2026-10-05",
        visibility: "household",
      }),
    );

    expect(hasil.ok).toBe(false);
    expect(getStore().healthRecords).toHaveLength(sebelum);
  });

  it("deleteHealthRecord menghapus catatan ruang aktif", async () => {
    const catatan = getStore().healthRecords.find((h) => h.id === "h-1")!;
    const sebelum = getStore().healthRecords.length;

    const hasil = await deleteHealthRecord(form({ id: catatan.id }));

    expect(hasil.ok).toBe(true);
    expect(getStore().healthRecords).toHaveLength(sebelum - 1);
    expect(getStore().healthRecords.some((h) => h.id === catatan.id)).toBe(false);
  });
});

/* -------------------------------- pendidikan ------------------------------ */

describe("pendidikan", () => {
  it("createEducationRecord menyimpan data pendidikan baru", async () => {
    const sebelum = getStore().educationRecords.length;

    const hasil = await createEducationRecord(
      form({
        memberId: "m-nara",
        school: "SMA Harapan",
        level: "sma",
        academicYear: "2027/2028",
        annualCost: 12_000_000,
      }),
    );

    expect(hasil.ok).toBe(true);
    expect(getStore().educationRecords).toHaveLength(sebelum + 1);
    expect(getStore().educationRecords.at(-1)).toMatchObject({
      memberId: "m-nara",
      school: "SMA Harapan",
      level: "sma",
      academicYear: "2027/2028",
      annualCost: 12_000_000,
      workspaceId: WS.family,
      recordedByProfileId: "p-irvan",
    });
  });

  it("createEducationRecord menolak sekolah kosong", async () => {
    const sebelum = getStore().educationRecords.length;

    const hasil = await createEducationRecord(
      form({
        memberId: "m-nara",
        school: "   ",
        level: "smp",
        academicYear: "2026/2027",
      }),
    );

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toMatch(/Nama sekolah/);
    expect(getStore().educationRecords).toHaveLength(sebelum);
  });

  it("createEducationRecord menolak tahun ajaran kosong", async () => {
    const sebelum = getStore().educationRecords.length;

    const hasil = await createEducationRecord(
      form({ memberId: "m-nara", school: "SMP Harapan", level: "smp", academicYear: "" }),
    );

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toMatch(/Tahun ajaran/);
    expect(getStore().educationRecords).toHaveLength(sebelum);
  });

  it("createEducationRecord menolak tujuan milik ruang lain", async () => {
    /*
     * BUG: `goalId` tidak pernah divalidasi ke `store.goals`. Rujukan ke tujuan
     * ruang pribadi orang lain tetap tersimpan, sehingga laporan pendidikan
     * ruang keluarga bisa menarik data dari ruang yang tidak boleh dibaca.
     */
    getStore().goals.push({
      id: "g-ruang-lain",
      workspaceId: WS.irvan,
      name: "Tujuan ruang pribadi",
      type: "education",
      targetAmount: 1_000_000,
      savedAmount: 0,
      visibility: "household",
      status: "active",
    });

    const hasil = await createEducationRecord(
      form({
        memberId: "m-nara",
        school: "SMP Harapan",
        level: "smp",
        academicYear: "2026/2027",
        goalId: "g-ruang-lain",
      }),
    );

    expect(hasil.ok).toBe(false);
  });

  it("deleteEducationRecord menghapus data ruang aktif", async () => {
    const catatan = getStore().educationRecords.find((e) => e.id === "ed-1")!;
    const sebelum = getStore().educationRecords.length;

    const hasil = await deleteEducationRecord(form({ id: catatan.id }));

    expect(hasil.ok).toBe(true);
    expect(getStore().educationRecords).toHaveLength(sebelum - 1);
    expect(getStore().educationRecords.some((e) => e.id === catatan.id)).toBe(
      false,
    );
  });
});

/* ---------------------- isolasi ruang pada aksi hapus --------------------- */

type AksiHapus = (formData: FormData) => Promise<ActionResult>;

const KASUS_HAPUS: Array<{
  nama: string;
  ambil: () => Array<{ id: string; workspaceId?: string }>;
  hapus: AksiHapus;
}> = [
  { nama: "deleteEvent", ambil: () => getStore().events, hapus: deleteEvent },
  { nama: "deleteChore", ambil: () => getStore().chores, hapus: deleteChore },
  { nama: "deleteDebt", ambil: () => getStore().debts, hapus: deleteDebt },
  { nama: "deleteAsset", ambil: () => getStore().assets, hapus: deleteAsset },
  {
    nama: "deleteInsurance",
    ambil: () => getStore().insurances,
    hapus: deleteInsurance,
  },
  {
    nama: "deleteDocument",
    ambil: () => getStore().documents,
    hapus: deleteDocument,
  },
  {
    nama: "deleteHealthRecord",
    ambil: () => getStore().healthRecords,
    hapus: deleteHealthRecord,
  },
  {
    nama: "deleteEducationRecord",
    ambil: () => getStore().educationRecords,
    hapus: deleteEducationRecord,
  },
];

describe("isolasi ruang pada aksi hapus", () => {
  /*
   * BUG: kedelapan aksi hapus memakai pola
   *   store.<koleksi> = store.<koleksi>.filter((row) => row.id !== id);
   * tanpa membandingkan `workspaceId` dan tanpa `findScoped()`. Akibatnya
   * pengguna di satu ruang dapat menghapus data ruang lain hanya dengan
   * mengirim id yang diketahuinya — termasuk data ruang pribadi orang lain.
   *
   * Test di bawah menjaga agar hal itu tidak kembali terjadi: aksi hapus wajib
   * memakai `findScoped()`, sehingga entitas ruang lain tidak tersentuh.
   */
  it.each(KASUS_HAPUS)(
    "$nama menolak menghapus entitas milik ruang lain",
    async ({ ambil, hapus }) => {
      const entitas = ambil().find((baris) => baris.workspaceId === WS.family)!;
      expect(entitas).toBeDefined();

      masukSebagai(WS.irvan);
      const hasil = await hapus(form({ id: entitas.id }));

      expect(hasil.ok).toBe(false);
      expect(ambil().some((baris) => baris.id === entitas.id)).toBe(true);
    },
  );
});

/* ----------------------------- sesi berakhir ------------------------------ */

describe("sesi berakhir", () => {
  it("menolak aksi tulis tanpa sesi dan tidak mengubah store", async () => {
    const sebelum = getStore().goals.length;

    masukSebagai("");
    const hasil = await createGoal(
      form({ name: "Tanpa sesi", type: "custom", targetAmount: 1_000 }),
    );

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toMatch(/Sesi berakhir/);
    expect(getStore().goals).toHaveLength(sebelum);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Persistensi pembatas laju.
 *
 * ## Masalah yang diuji
 *
 * Hitungan percobaan gagal disimpan di memori proses. Tanpa persistensi,
 * restart server menghapus semua blokir — penyerang hanya perlu menunggu
 * instance didaur ulang, lalu mendapat kuota penuh lagi.
 *
 * ## Yang diuji di sini
 *
 * Fungsi penyimpanan dan pemulihan bekerja benar terhadap `appState`, termasuk
 * membuang hitungan yang jendelanya sudah lewat. Koneksi Postgres sebenarnya
 * diuji terpisah lewat `scripts/check-db.cjs`.
 */

/** Penyimpanan tiruan untuk `appState`. */
const rows = new Map<string, unknown>();

vi.mock("@/lib/db", () => ({
  db: {
    insert: () => ({
      values: (payload: { key: string; value: unknown }) => ({
        onConflictDoUpdate: async () => {
          rows.set(payload.key, payload.value);
        },
      }),
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            const value = rows.get("rateLimits");
            return value === undefined ? [] : [{ key: "rateLimits", value }];
          },
        }),
      }),
    }),
  },
}));

const { persistRateLimits, loadRateLimits, setWriteIntervalForTests } = await import(
  "@/lib/auth/rate-limit-store"
);

beforeEach(() => {
  rows.clear();
  /*
   * Produksi menahan penulisan 2 detik agar tidak menulis di setiap percobaan.
   * Test tidak perlu menunggu selama itu — jedanya dinolkan.
   */
  setWriteIntervalForTests(0);
});

describe("persistRateLimits", () => {
  it("menyimpan keadaan ke penyimpanan", async () => {
    const now = Date.now();
    await persistRateLimits({
      "login:uji@contoh.id": { hits: [now - 1000, now - 500], blockedUntil: 0 },
    });

    expect(rows.get("rateLimits")).toBeTruthy();
  });

  it("menimpa keadaan sebelumnya, bukan menumpuk", async () => {
    await persistRateLimits({ a: { hits: [Date.now()], blockedUntil: 0 } });
    await persistRateLimits({ b: { hits: [Date.now()], blockedUntil: 0 } });

    const stored = rows.get("rateLimits") as Record<string, unknown>;
    expect(Object.keys(stored)).toEqual(["b"]);
  });
});

describe("loadRateLimits", () => {
  it("mengembalikan null saat belum ada data", async () => {
    expect(await loadRateLimits()).toBeNull();
  });

  it("memuat kembali keadaan yang disimpan", async () => {
    const now = Date.now();
    const blockedUntil = now + 60_000;

    await persistRateLimits({
      "login:uji@contoh.id": { hits: [now - 1000], blockedUntil },
    });

    const loaded = await loadRateLimits();
    expect(loaded).not.toBeNull();
    expect(loaded?.["login:uji@contoh.id"]?.blockedUntil).toBe(blockedUntil);
  });

  it("membuang hitungan yang jendelanya sudah lewat", async () => {
    /*
     * Server yang mati lama tidak boleh membawa blokir kedaluwarsa. Tanpa
     * pembersihan ini, pengguna sah bisa terkunci karena blokir dari berhari
     * hari lalu.
     */
    const now = Date.now();
    await persistRateLimits({
      "login:lama@contoh.id": { hits: [now - 2 * 60 * 60 * 1000], blockedUntil: 0 },
    });

    const loaded = await loadRateLimits();
    expect(loaded?.["login:lama@contoh.id"]).toBeUndefined();
  });

  it("mempertahankan blokir yang masih berlaku", async () => {
    const now = Date.now();
    await persistRateLimits({
      "pin:p-irvan": { hits: [], blockedUntil: now + 5 * 60 * 1000 },
    });

    const loaded = await loadRateLimits();
    expect(loaded?.["pin:p-irvan"]?.blockedUntil).toBeGreaterThan(now);
  });

  it("membuang blokir yang sudah kedaluwarsa", async () => {
    const now = Date.now();
    await persistRateLimits({
      "pin:p-irvan": { hits: [now - 1000], blockedUntil: now - 60_000 },
    });

    const loaded = await loadRateLimits();
    // Hitungan masih dalam jendela, tetapi blokir sudah lewat.
    expect(loaded?.["pin:p-irvan"]?.blockedUntil).toBe(0);
  });

  it("mengabaikan bentuk data yang rusak", async () => {
    rows.set("rateLimits", { rusak: "bukan objek", juga: { hits: "bukan array" } });

    const loaded = await loadRateLimits();
    // Tidak melempar, dan tidak memasukkan data yang tidak bisa dipakai.
    expect(loaded).toEqual({});
  });
});

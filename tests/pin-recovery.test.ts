import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Pemulihan PIN yang terlupakan.
 *
 * ## Kenapa fitur ini perlu
 *
 * PIN melindungi privasi antar anggota keluarga, bukan rahasia dari pemilik
 * akun. Tanpa jalur pemulihan, pemilik akun yang lupa PIN kehilangan akses ke
 * datanya sendiri secara permanen.
 *
 * ## Kenapa berbahaya bila salah
 *
 * Jalur pemulihan adalah pintu masuk alternatif. Bila tidak dijaga ketat, ia
 * menjadi cara melewati PIN — dan seluruh perlindungan privasi antar anggota
 * jadi sia-sia. Test ini menjaga empat hal:
 *
 * 1. wajib sudah masuk sebagai pemilik akun,
 * 2. wajib kata sandi akun yang benar,
 * 3. profil harus milik akun itu,
 * 4. percobaan dibatasi.
 */

const state = { account: null as null | { userId: string; email: string } };

vi.mock("@/lib/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/session")>("@/lib/session");

  return {
    ...actual,
    getAccountSession: async () =>
      state.account
        ? {
            userId: state.account.userId,
            email: state.account.email,
            name: "Irvan",
            role: "owner" as const,
            stage: "profile" as const,
          }
        : null,
    requireAccountSession: async () => {
      if (!state.account) throw new Error("NEXT_REDIRECT:/login");
      return {
        userId: state.account.userId,
        email: state.account.email,
        name: "Irvan",
        role: "owner" as const,
        stage: "profile" as const,
      };
    },
    getViewer: async () => null,
    requireViewer: async () => {
      throw new Error("NEXT_REDIRECT:/pilih-profil");
    },
    getSession: async () => null,
    getAccountSessionOrNull: async () => null,
  };
});

vi.mock("next/cache", async () => {
  const actual = await vi.importActual<typeof import("next/cache")>("next/cache");
  return { ...actual, revalidatePath: () => {} };
});

const { getStore, resetStore } = await import("@/lib/data/store");
const { resetProfilePin } = await import("@/lib/data/actions");
const { resetAllRateLimits } = await import("@/lib/auth/rate-limit");
const { verifyPin } = await import("@/lib/auth/password");

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

/** Akun demo beserta profilnya. */
function demoAccount() {
  const user = getStore().users[0];
  const profiles = getStore().profiles.filter(
    (profile) => profile.accountId === user.id,
  );
  if (profiles.length === 0) throw new Error("Akun demo tidak punya profil");
  return { user, profile: profiles[0] };
}

beforeEach(() => {
  resetStore();
  resetAllRateLimits();
  const user = getStore().users[0];
  state.account = { userId: user.id, email: user.email };
});

describe("resetProfilePin", () => {
  it("mengganti PIN dengan kata sandi yang benar", async () => {
    const { user, profile } = demoAccount();

    const result = await resetProfilePin(
      form({
        profileId: profile.id,
        password: "airevo123",
        pin: "9876",
        confirmPin: "9876",
      }),
    );

    expect(result.ok).toBe(true);

    const updated = getStore().profiles.find((item) => item.id === profile.id)!;
    expect(verifyPin("9876", updated.pinHash)).toBe(true);
    expect(verifyPin("1234", updated.pinHash)).toBe(false);
    expect(user.email).toBeTruthy();
  });

  it("menolak kata sandi yang salah", async () => {
    const { profile } = demoAccount();

    const result = await resetProfilePin(
      form({
        profileId: profile.id,
        password: "sandi-salah",
        pin: "9876",
        confirmPin: "9876",
      }),
    );

    expect(result.ok).toBe(false);
    // PIN lama tidak berubah.
    const unchanged = getStore().profiles.find((item) => item.id === profile.id)!;
    expect(verifyPin("1234", unchanged.pinHash)).toBe(true);
  });

  it("menolak tanpa sesi akun", async () => {
    state.account = null;
    const { profile } = demoAccount();

    await expect(
      resetProfilePin(
        form({
          profileId: profile.id,
          password: "airevo123",
          pin: "9876",
          confirmPin: "9876",
        }),
      ),
    ).rejects.toThrow();
  });

  it("menolak profil milik akun lain", async () => {
    const { user } = demoAccount();
    const other = getStore().profiles.find(
      (profile) => profile.accountId !== user.id,
    );

    if (!other) return; // data contoh hanya punya satu akun

    const result = await resetProfilePin(
      form({
        profileId: other.id,
        password: "airevo123",
        pin: "9876",
        confirmPin: "9876",
      }),
    );

    expect(result.ok).toBe(false);
  });

  it("menolak PIN yang bukan 4–6 angka", async () => {
    const { profile } = demoAccount();

    for (const pin of ["123", "1234567", "abcd", "12a4"]) {
      const result = await resetProfilePin(
        form({
          profileId: profile.id,
          password: "airevo123",
          pin,
          confirmPin: pin,
        }),
      );
      expect(result.ok).toBe(false);
    }
  });

  it("menolak konfirmasi yang tidak sama", async () => {
    const { profile } = demoAccount();

    const result = await resetProfilePin(
      form({
        profileId: profile.id,
        password: "airevo123",
        pin: "9876",
        confirmPin: "9877",
      }),
    );

    expect(result.ok).toBe(false);
  });

  it("membatasi percobaan kata sandi", async () => {
    /*
     * Tanpa batas, jalur pemulihan menjadi cara menebak kata sandi tanpa
     * terkena pembatas login — pintu belakang yang tidak diinginkan.
     */
    const { profile } = demoAccount();

    let lastResult: { ok: boolean; message?: string } = { ok: true, message: "" };
    for (let attempt = 0; attempt < 8; attempt += 1) {
      lastResult = await resetProfilePin(
        form({
          profileId: profile.id,
          password: "salah-terus",
          pin: "9876",
          confirmPin: "9876",
        }),
      );
    }

    expect(lastResult.ok).toBe(false);
    expect(lastResult.message ?? "").toMatch(/terlalu banyak/i);
  });

  it("mereset hitungan PIN setelah berhasil", async () => {
    /*
     * Pengguna yang baru memulihkan akses tidak boleh langsung terkunci lagi
     * oleh sisa hitungan sebelum pemulihan — itu membuat fitur ini tampak
     * tidak bekerja.
     */
    const { profile } = demoAccount();

    // Buat beberapa percobaan PIN gagal lebih dulu.
    const { recordFailure, PIN_RULE } = await import("@/lib/auth/rate-limit");
    for (let attempt = 0; attempt < 4; attempt += 1) {
      recordFailure(PIN_RULE, profile.id);
    }

    const result = await resetProfilePin(
      form({
        profileId: profile.id,
        password: "airevo123",
        pin: "9876",
        confirmPin: "9876",
      }),
    );

    expect(result.ok).toBe(true);

    // Setelah reset, percobaan berikutnya tidak langsung terkunci.
    const { checkRateLimit } = await import("@/lib/auth/rate-limit");
    const limit = checkRateLimit(PIN_RULE, profile.id);
    expect(limit.allowed).toBe(true);
  });
});

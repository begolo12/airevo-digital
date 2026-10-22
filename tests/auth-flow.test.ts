import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PIN_PATTERN,
  hashPassword,
  hashPin,
  verifyPassword,
  verifyPin,
} from "@/lib/auth/password";
import {
  decodeSession,
  encodeSession,
  sessionCookie,
  type SessionPayload,
} from "@/lib/auth/session";
import {
  LOGIN_RULE,
  PIN_RULE,
  checkRateLimit,
  resetAllRateLimits,
} from "@/lib/auth/rate-limit";
import {
  authenticate,
  canOpenWorkspace,
  defaultWorkspaceFor,
  getViewer,
  unlockProfile,
} from "@/lib/session";
import { loginAction, selectProfileAction } from "@/lib/data/actions";
import { WS, getStore, resetStore } from "@/lib/data/store";

/**
 * Alur autentikasi dua tahap + pembatas percobaan.
 *
 * ## Mengapa tidak memakai `mockSessionModule()`
 *
 * Helper itu mengganti seluruh modul `@/lib/session`, termasuk `authenticate()`
 * dan `unlockProfile()`, dengan tiruan yang selalu mengembalikan `null`. Untuk
 * test *integrasi* login/PIN, justru dua fungsi itulah yang harus berjalan
 * sungguhan — kalau ditiru, test hanya membuktikan tiruannya bekerja.
 *
 * Yang ditiru di sini adalah lapisan Next.js saja:
 *
 * - `next/headers` → cookie jar di memori, supaya `createSession()` dan
 *   `getSession()` bisa menulis/membaca sesi seperti di server.
 * - `next/navigation` → `redirect()` yang melempar error bertanda `NEXT_REDIRECT`,
 *   sama seperti perilaku aslinya (redirect tidak pernah "kembali normal").
 *
 * Dengan begitu jalur sukses benar-benar diuji: kata sandi diverifikasi,
 * cookie ditandatangani, tahap sesi naik, lalu redirect terjadi.
 *
 * Catatan: `tests/helpers/session.ts` sengaja **tidak** diimpor sama sekali.
 * Berkas itu memanggil `vi.mock` di dalam sebuah fungsi, dan Vitest 5 menolak
 * modul seperti itu saat transformasi ("defined outside of the module's top
 * level scope"). Akibatnya setiap test yang mengimpor helper tersebut gagal
 * sebelum satu test pun berjalan. Karena helper tidak boleh diubah di tugas ini,
 * `form()` ditulis ulang kecil di bawah.
 */

/** Cookie jar dan catatan redirect, dibuat sebelum `vi.mock` diangkat. */
const harness = vi.hoisted(() => {
  /** Cookie jar tiruan: meniru `cookies()` milik Next.js. */
  const jar = new Map<string, string>();
  /** Opsi yang dipakai saat cookie diset — untuk memeriksa httpOnly dsb. */
  const options = new Map<string, Record<string, unknown>>();
  /** Alamat tujuan `redirect()`, berurutan. */
  const redirects: string[] = [];
  return { jar, options, redirects };
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      harness.jar.has(name)
        ? { name, value: harness.jar.get(name) as string }
        : undefined,
    set: (name: string, value: string, opts?: Record<string, unknown>) => {
      harness.jar.set(name, value);
      harness.options.set(name, opts ?? {});
    },
    delete: (name: string) => {
      harness.jar.delete(name);
    },
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string): never => {
    harness.redirects.push(url);
    // Next.js melempar error ber-digest NEXT_REDIRECT, bukan return.
    const error = new Error(`NEXT_REDIRECT: ${url}`) as Error & {
      digest?: string;
    };
    error.digest = `NEXT_REDIRECT;push;${url};307;`;
    throw error;
  },
}));

const EMAIL = "irvan@airevo-digital.my.id";
const PASSWORD = "airevo123";
/** PIN bawaan data contoh di `src/lib/data/store.ts`. */
const DEMO_PIN = "1234";

/** Membuat `FormData` dari objek biasa — bentuk yang diterima server action. */
function form(fields: Record<string, string | number | undefined>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) data.set(key, String(value));
  }
  return data;
}

/** Tulis cookie sesi seolah-olah pengguna sudah melewati tahap tertentu. */
function signIn(payload: Omit<SessionPayload, "exp">): void {
  harness.jar.set(sessionCookie.name, encodeSession(payload));
}

/** Baca kembali sesi dari cookie jar, memakai decoder asli. */
function currentSession(): SessionPayload | null {
  return decodeSession(harness.jar.get(sessionCookie.name));
}

/** Sesi level akun (tahap "profile"), seperti setelah `/login` berhasil. */
function accountSession(overrides: Partial<SessionPayload> = {}) {
  return {
    userId: "u-irvan",
    email: EMAIL,
    name: "Irvan",
    role: "owner",
    stage: "profile" as const,
    ...overrides,
  };
}

/**
 * Ubah isi payload tanpa menandatangani ulang.
 *
 * Inilah serangan yang harus gagal: penyerang mengubah cookie di browser, tetapi
 * tidak memegang `SESSION_SECRET`, sehingga tanda tangan lama tidak cocok lagi.
 */
function tamperBody(
  token: string,
  mutate: (body: Record<string, unknown>) => void,
): string {
  const [encoded, signature] = token.split(".");
  const body = JSON.parse(
    Buffer.from(encoded, "base64url").toString(),
  ) as Record<string, unknown>;
  mutate(body);
  return `${Buffer.from(JSON.stringify(body)).toString("base64url")}.${signature}`;
}

/** Jalankan aksi dan ambil error redirect-nya (bila ada). */
async function catchRedirect(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return error;
  }
  throw new Error("Aksi selesai tanpa redirect — seharusnya redirect.");
}

beforeEach(() => {
  resetStore();
  resetAllRateLimits();
  harness.jar.clear();
  harness.options.clear();
  harness.redirects.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

/* ------------------------------- kata sandi ------------------------------- */

describe("kata sandi", () => {
  it("hashPassword memakai salt acak, jadi sandi sama menghasilkan hash berbeda", () => {
    // Tanpa salt, dua akun bersandi sama akan punya hash identik dan satu
    // rainbow table membuka keduanya sekaligus.
    const pertama = hashPassword("sandi-yang-sama");
    const kedua = hashPassword("sandi-yang-sama");

    expect(pertama).not.toBe(kedua);
    expect(pertama).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  });

  it("verifyPassword menerima sandi yang benar dan menolak yang salah", () => {
    const stored = hashPassword(PASSWORD);

    expect(verifyPassword(PASSWORD, stored)).toBe(true);
    expect(verifyPassword("salah", stored)).toBe(false);
    expect(verifyPassword("", stored)).toBe(false);
    // Peka huruf besar/kecil: "Airevo123" bukan sandi yang sama.
    expect(verifyPassword("Airevo123", stored)).toBe(false);
  });

  it("verifyPassword menolak hash berformat asing tanpa melempar error", () => {
    // Hash lama/rusak tidak boleh membuat login crash (500), cukup ditolak.
    for (const stored of [
      "bukan-hash",
      "scrypt$hanya-dua-bagian",
      "scrypt$$",
      "scrypt$salt$bukanhex",
      "bcrypt$salt$hash",
    ]) {
      expect(verifyPassword("apa saja", stored)).toBe(false);
    }
  });
});

/* ----------------------------------- PIN ---------------------------------- */

describe("PIN", () => {
  it("hashPin menghasilkan hash berbeda untuk PIN yang sama (salt acak)", () => {
    expect(hashPin(DEMO_PIN)).not.toBe(hashPin(DEMO_PIN));
  });

  it("verifyPin menerima PIN 4 angka yang benar", () => {
    const stored = hashPin("1234");

    expect(verifyPin("1234", stored)).toBe(true);
    expect(verifyPin("1235", stored)).toBe(false);
  });

  it("verifyPin menerima PIN 6 angka yang benar", () => {
    const stored = hashPin("123456");

    expect(verifyPin("123456", stored)).toBe(true);
    expect(verifyPin("123457", stored)).toBe(false);
  });

  it("verifyPin menolak PIN salah, hash kosong, dan PIN di luar pola", () => {
    const stored = hashPin(DEMO_PIN);

    expect(verifyPin("0000", stored)).toBe(false);
    expect(verifyPin(DEMO_PIN, undefined)).toBe(false);
    expect(verifyPin(DEMO_PIN, "")).toBe(false);
    // Di luar 4–6 angka: ditolak sebelum hash sempat dihitung.
    expect(verifyPin("123", stored)).toBe(false);
    expect(verifyPin("1234567", stored)).toBe(false);
    expect(verifyPin("abcd", stored)).toBe(false);
  });

  it("PIN_PATTERN hanya menerima 4 sampai 6 angka", () => {
    for (const sah of ["1234", "12345", "123456"]) {
      expect(PIN_PATTERN.test(sah)).toBe(true);
    }

    for (const tidakSah of [
      "123", // terlalu pendek
      "1234567", // terlalu panjang
      "abcd", // bukan angka
      "12a4", // campuran
      "", // kosong
      " 1234", // spasi di depan
      "1234 ", // spasi di belakang
      "12 34", // spasi di tengah
      "1234\n", // baris baru
      "١٢٣٤", // angka non-ASCII
    ]) {
      expect(PIN_PATTERN.test(tidakSah)).toBe(false);
    }
  });

  it("verifyPin menolak PIN tak berpola walau hash-nya dibuat dari string itu", () => {
    // hashPin() tidak memvalidasi pola; pengamannya ada di verifyPin().
    // Test ini memastikan tidak ada jalan pintas lewat hash yang "aneh".
    const stored = hashPin("abcd");

    expect(verifyPin("abcd", stored)).toBe(false);
  });
});

/* ------------------------------- cookie sesi ------------------------------- */

describe("cookie sesi", () => {
  const payload = {
    userId: "u-irvan",
    email: EMAIL,
    name: "Irvan",
    role: "owner",
    stage: "active" as const,
    profileId: "p-irvan",
    workspaceId: WS.family,
  };

  it("encodeSession dan decodeSession bolak-balik mempertahankan semua field", () => {
    const decoded = decodeSession(encodeSession(payload));

    expect(decoded).toMatchObject(payload);
    expect(decoded?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("cookie yang payload-nya diubah tanpa tanda tangan ulang ditolak", () => {
    // Inti keamanan: tahap sesi tidak boleh bisa dinaikkan dari browser.
    // Penyerang mengubah stage "profile" menjadi "active" plus profil target.
    const token = encodeSession(accountSession());
    const dipalsukan = tamperBody(token, (body) => {
      body.stage = "active";
      body.profileId = "p-irvan";
      body.workspaceId = WS.family;
    });

    expect(dipalsukan).not.toBe(token);
    expect(decodeSession(dipalsukan)).toBeNull();
  });

  it("cookie yang userId-nya ditukar tanpa tanda tangan ulang ditolak", () => {
    const token = encodeSession(payload);
    const dipalsukan = tamperBody(token, (body) => {
      body.userId = "u-sari";
    });

    expect(decodeSession(dipalsukan)).toBeNull();
  });

  it("cookie yang masa berlakunya diperpanjang tanpa tanda tangan ulang ditolak", () => {
    const token = encodeSession(payload);
    const dipalsukan = tamperBody(token, (body) => {
      body.exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;
    });

    expect(decodeSession(dipalsukan)).toBeNull();
  });

  it("tanda tangan milik cookie lain tidak bisa dipakai ulang", () => {
    const asli = encodeSession(payload);
    const lain = encodeSession({ ...payload, userId: "u-sari" });
    const [bodyAsli] = asli.split(".");
    const [, sigLain] = lain.split(".");

    expect(decodeSession(`${bodyAsli}.${sigLain}`)).toBeNull();
  });

  it("sesi lama tanpa stage dianggap sudah aktif (kompatibilitas)", () => {
    // Cookie yang ditandatangani versi aplikasi sebelumnya belum punya `stage`.
    // Menolaknya akan memaksa semua pengguna login ulang setelah deploy.
    const sesiLama = {
      userId: "u-irvan",
      email: EMAIL,
      name: "Irvan",
      role: "owner",
    } as unknown as Omit<SessionPayload, "exp">;

    expect(decodeSession(encodeSession(sesiLama))?.stage).toBe("active");
  });

  it("cookie kedaluwarsa ditolak, yang masih berlaku diterima", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const token = encodeSession(payload);

    // 6 hari kemudian: masih di dalam masa berlaku 7 hari.
    vi.setSystemTime(new Date("2026-01-07T00:00:00Z"));
    expect(decodeSession(token)).not.toBeNull();

    // 8 hari kemudian: lewat masa berlaku.
    vi.setSystemTime(new Date("2026-01-09T00:00:00Z"));
    expect(decodeSession(token)).toBeNull();
  });

  it("cookie kosong, rusak, atau tanpa tanda tangan ditolak", () => {
    for (const raw of [
      undefined,
      "",
      "abc",
      "abc.def",
      "abc.def.ghi",
      "..",
      `${Buffer.from(JSON.stringify({ userId: "u-1", exp: 9999999999 })).toString("base64url")}.`,
    ]) {
      expect(decodeSession(raw)).toBeNull();
    }
  });

  it("cookie sesi diset httpOnly, sameSite lax, dan berlaku di seluruh situs", async () => {
    // httpOnly mencegah JavaScript (XSS) membaca token; sameSite lax menahan
    // CSRF pada permintaan lintas situs.
    await catchRedirect(() =>
      loginAction(form({ email: EMAIL, password: PASSWORD })),
    );

    const opsi = harness.options.get(sessionCookie.name);
    expect(opsi).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
    expect(opsi?.maxAge).toBe(sessionCookie.maxAge);
  });
});

/* -------------------------------- loginAction ------------------------------ */

describe("loginAction", () => {
  it("login berhasil menandatangani sesi tahap profile lalu mengalihkan ke pemilih profil", async () => {
    const error = await catchRedirect(() =>
      loginAction(form({ email: EMAIL, password: PASSWORD })),
    );

    expect(String(error)).toContain("NEXT_REDIRECT");
    // Tahap 1 belum punya profil: pemilihan profil adalah langkah berikutnya.
    expect(harness.redirects.at(-1)).toBe("/pilih-profil?next=%2Fkeluarga");

    const sesi = currentSession();
    expect(sesi?.stage).toBe("profile");
    expect(sesi?.userId).toBe("u-irvan");
    expect(sesi?.profileId).toBeUndefined();
    expect(sesi?.workspaceId).toBeUndefined();
  });

  it("kata sandi salah menyebut sisa percobaan, bukan pesan generik", async () => {
    const hasil = await loginAction(form({ email: EMAIL, password: "salah" }));

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toContain("Sisa 4 percobaan");
    expect(harness.redirects).toHaveLength(0);
  });

  it("lima percobaan salah mengunci akun dan menyebut waktu tunggu", async () => {
    let hasil = await loginAction(form({ email: EMAIL, password: "salah" }));
    for (let ke = 2; ke <= LOGIN_RULE.max; ke += 1) {
      hasil = await loginAction(form({ email: EMAIL, password: "salah" }));
    }

    // Percobaan ke-5 sudah memicu kunci, dengan pesan yang bisa ditindaklanjuti.
    expect(hasil.ok).toBe(false);
    expect(hasil.message).toContain("Akun dikunci sementara");
    expect(hasil.message).toContain("sekitar 15 menit");

    const batas = checkRateLimit(LOGIN_RULE, EMAIL);
    expect(batas.allowed).toBe(false);
    expect(batas.retryAfterMs).toBeGreaterThan(0);
  });

  it("percobaan ke-6 ditolak walau kata sandinya benar", async () => {
    for (let ke = 1; ke <= LOGIN_RULE.max; ke += 1) {
      await loginAction(form({ email: EMAIL, password: "salah" }));
    }

    // Kunci harus diperiksa SEBELUM kata sandi diverifikasi; kalau tidak,
    // penyerang yang kebetulan menebak benar tetap masuk.
    const hasil = await loginAction(form({ email: EMAIL, password: PASSWORD }));

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toContain("Terlalu banyak percobaan masuk");
    expect(hasil.message).toContain("sekitar 15 menit");
    expect(harness.redirects).toHaveLength(0);
    expect(harness.jar.has(sessionCookie.name)).toBe(false);
  });

  it("login berhasil mereset hitungan percobaan", async () => {
    for (let ke = 1; ke < LOGIN_RULE.max; ke += 1) {
      await loginAction(form({ email: EMAIL, password: "salah" }));
    }
    expect(checkRateLimit(LOGIN_RULE, EMAIL).remaining).toBe(1);

    await catchRedirect(() =>
      loginAction(form({ email: EMAIL, password: PASSWORD })),
    );

    // Pengguna sah tidak boleh terhukum oleh salah ketik sebelumnya.
    expect(checkRateLimit(LOGIN_RULE, EMAIL).remaining).toBe(LOGIN_RULE.max);
  });

  it("kapitalisasi email tidak membuka kuota baru", async () => {
    for (let ke = 1; ke <= LOGIN_RULE.max; ke += 1) {
      await loginAction(form({ email: EMAIL, password: "salah" }));
    }

    // "Irvan@..." harus dihitung sebagai akun yang sama.
    const hasil = await loginAction(
      form({ email: "Irvan@Airevo-Digital.My.Id", password: PASSWORD }),
    );

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toContain("Terlalu banyak percobaan masuk");
  });

  it("form kosong ditolak tanpa menghabiskan kuota", async () => {
    const hasil = await loginAction(form({ email: "", password: "" }));

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toContain("wajib diisi");
    // Validasi bentuk form bukan percobaan menebak sandi.
    expect(checkRateLimit(LOGIN_RULE, EMAIL).remaining).toBe(LOGIN_RULE.max);
  });
});

/* ---------------------------- selectProfileAction -------------------------- */

describe("selectProfileAction", () => {
  it("PIN benar membuka profil, menaikkan sesi ke active, dan mengalihkan", async () => {
    signIn(accountSession());

    const error = await catchRedirect(() =>
      selectProfileAction(form({ profileId: "p-irvan", pin: DEMO_PIN })),
    );

    expect(String(error)).toContain("NEXT_REDIRECT");
    expect(harness.redirects.at(-1)).toBe("/keluarga");

    const sesi = currentSession();
    expect(sesi?.stage).toBe("active");
    expect(sesi?.profileId).toBe("p-irvan");
    // Workspace awal: ruang bersama lebih dulu, baru ruang pribadi.
    expect(sesi?.workspaceId).toBe(WS.family);
    // Nama & peran mengikuti profil yang dipilih, bukan akun.
    expect(sesi?.name).toBe("Irvan");
  });

  it("PIN salah menyebut sisa percobaan", async () => {
    signIn(accountSession());

    const hasil = await selectProfileAction(
      form({ profileId: "p-irvan", pin: "0000" }),
    );

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toContain("Sisa 4 percobaan");
    // Sesi belum boleh naik tahap.
    expect(currentSession()?.stage).toBe("profile");
  });

  it("PIN salah berulang mengunci profil itu saja", async () => {
    signIn(accountSession());

    let hasil = await selectProfileAction(
      form({ profileId: "p-irvan", pin: "0000" }),
    );
    for (let ke = 2; ke <= PIN_RULE.max; ke += 1) {
      hasil = await selectProfileAction(
        form({ profileId: "p-irvan", pin: "0000" }),
      );
    }

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toContain("Profil dikunci sementara");
    expect(hasil.message).toContain("sekitar 10 menit");

    expect(checkRateLimit(PIN_RULE, "p-irvan").allowed).toBe(false);
    // Profil lain di akun yang sama tetap bisa dibuka.
    expect(checkRateLimit(PIN_RULE, "p-sari").allowed).toBe(true);
  });

  it("percobaan PIN ke-6 ditolak walau PIN-nya benar", async () => {
    signIn(accountSession());

    for (let ke = 1; ke <= PIN_RULE.max; ke += 1) {
      await selectProfileAction(form({ profileId: "p-irvan", pin: "0000" }));
    }

    const hasil = await selectProfileAction(
      form({ profileId: "p-irvan", pin: DEMO_PIN }),
    );

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toContain("Terlalu banyak percobaan PIN");
    expect(hasil.message).toContain("sekitar 10 menit");
    expect(harness.redirects).toHaveLength(0);
    expect(currentSession()?.stage).toBe("profile");
  });

  it("PIN benar mereset hitungan percobaan profil", async () => {
    signIn(accountSession());

    for (let ke = 1; ke < PIN_RULE.max; ke += 1) {
      await selectProfileAction(form({ profileId: "p-irvan", pin: "0000" }));
    }
    expect(checkRateLimit(PIN_RULE, "p-irvan").remaining).toBe(1);

    await catchRedirect(() =>
      selectProfileAction(form({ profileId: "p-irvan", pin: DEMO_PIN })),
    );

    expect(checkRateLimit(PIN_RULE, "p-irvan").remaining).toBe(PIN_RULE.max);
  });

  it("tanpa sesi akun aksi menolak dan tidak menghabiskan kuota", async () => {
    const hasil = await selectProfileAction(
      form({ profileId: "p-irvan", pin: "0000" }),
    );

    expect(hasil.ok).toBe(false);
    expect(hasil.message).toContain("Sesi berakhir");
    expect(checkRateLimit(PIN_RULE, "p-irvan").remaining).toBe(PIN_RULE.max);
  });

  it("profil milik akun lain tidak bisa dibuka walau PIN-nya benar", async () => {
    // Sari masuk dengan akunnya sendiri; semua profil contoh milik u-irvan.
    signIn(
      accountSession({
        userId: "u-sari",
        email: "sari@airevo-digital.my.id",
        name: "Sari",
        role: "adult",
      }),
    );

    const hasil = await selectProfileAction(
      form({ profileId: "p-irvan", pin: DEMO_PIN }),
    );

    expect(hasil.ok).toBe(false);
    expect(harness.redirects).toHaveLength(0);
    expect(currentSession()?.stage).toBe("profile");
  });
});

/* ------------------------------- lapisan sesi ------------------------------ */

describe("lapisan sesi", () => {
  it("authenticate mengembalikan sesi tahap profile untuk kredensial benar", () => {
    const sesi = authenticate(EMAIL, PASSWORD);

    expect(sesi).toMatchObject({
      userId: "u-irvan",
      email: EMAIL,
      stage: "profile",
    });
    // Tahap 1 belum memilih profil, jadi belum ada workspace.
    expect(sesi?.profileId).toBeUndefined();
  });

  it("authenticate menolak sandi salah dan email tak dikenal", () => {
    expect(authenticate(EMAIL, "salah")).toBeNull();
    expect(authenticate("tidak-ada@airevo-digital.my.id", PASSWORD)).toBeNull();
  });

  it("authenticate tidak peduli kapitalisasi dan spasi di email", () => {
    expect(authenticate(`  ${EMAIL.toUpperCase()}  `, PASSWORD)).not.toBeNull();
  });

  it("unlockProfile menolak profil milik akun lain", () => {
    // Id profil bisa ditebak/dikirim lewat form, jadi kepemilikan wajib dicek.
    expect(unlockProfile("u-sari", "p-irvan", DEMO_PIN)).toBeNull();
    expect(unlockProfile("u-irvan", "p-irvan", DEMO_PIN)).not.toBeNull();
  });

  it("unlockProfile meloloskan profil tanpa PIN", () => {
    const profil = getStore().profiles.find((item) => item.id === "p-bima");
    expect(profil).toBeDefined();
    profil!.pinHash = undefined;

    // Profil anak tanpa PIN tidak boleh terkunci selamanya.
    expect(unlockProfile("u-irvan", "p-bima", "")?.id).toBe("p-bima");
  });

  it("getViewer hanya berlaku untuk sesi tahap active", async () => {
    signIn(accountSession());
    expect(await getViewer()).toBeNull();

    signIn({
      ...accountSession(),
      stage: "active",
      profileId: "p-irvan",
      workspaceId: WS.family,
    });
    expect(await getViewer()).toMatchObject({
      userId: "u-irvan",
      profileId: "p-irvan",
      workspaceId: WS.family,
      role: "owner",
    });
  });

  it("getViewer menolak workspace yang bukan milik profil", async () => {
    // Cookie sah tetapi workspace-nya bukan anggota: akses harus gugur.
    signIn({
      ...accountSession(),
      stage: "active",
      profileId: "p-irvan",
      workspaceId: WS.bima,
    });

    expect(await getViewer()).toBeNull();
  });

  it("canOpenWorkspace mengikuti keanggotaan workspace", () => {
    expect(canOpenWorkspace("p-sari", WS.family)).toBe(true);
    expect(canOpenWorkspace("p-bima", WS.family)).toBe(false);
    expect(canOpenWorkspace("p-bima", WS.bima)).toBe(true);
    expect(canOpenWorkspace("p-bima", "ws-tidak-ada")).toBe(false);
  });

  it("defaultWorkspaceFor memilih ruang bersama sebelum ruang pribadi", () => {
    expect(defaultWorkspaceFor("p-irvan")).toBe(WS.family);
    expect(defaultWorkspaceFor("p-bima")).toBe(WS.bima);
    expect(defaultWorkspaceFor("p-tidak-ada")).toBeUndefined();
  });
});

/* ---------------------------------- temuan -------------------------------- */

/**
 * Test di bawah ini merekam **perilaku saat ini**, bukan perilaku yang benar.
 *
 * Keduanya menunjukkan celah yang belum ditutup di kode produksi. Bila celahnya
 * diperbaiki, test ini harus dibalik (menjadi `expect(...).toBe(false)` dan
 * `expect(redirect).not.toBe("//evil.com")`).
 */

describe("celah keamanan yang sudah ditutup", () => {
  it("PIN salah dari akun lain TIDAK bisa mengunci profil orang lain", async () => {
    /*
     * selectProfileAction mencatat kegagalan PIN ke `profileId` dari form
     * SEBELUM memeriksa apakah profil itu milik akun yang sedang masuk.
     * Akibatnya Sari (u-sari) — yang tidak punya profil apa pun — bisa
     * menghabiskan kuota PIN milik profil Irvan hanya dengan mengirim id-nya.
     * Ini penolakan layanan lintas akun, bukan tebakan PIN.
     */
    signIn(
      accountSession({
        userId: "u-sari",
        email: "sari@airevo-digital.my.id",
        name: "Sari",
        role: "adult",
      }),
    );

    for (let ke = 1; ke <= PIN_RULE.max; ke += 1) {
      await selectProfileAction(form({ profileId: "p-irvan", pin: "0000" }));
    }

    // Kepemilikan profil diperiksa sebelum kuota disentuh, jadi kuota profil
    // orang lain tidak tersentuh sama sekali.
    expect(checkRateLimit(PIN_RULE, "p-irvan").allowed).toBe(true);

    // Pemilik sah tetap bisa masuk dengan PIN benar.
    signIn(accountSession());
    await catchRedirect(() =>
      selectProfileAction(form({ profileId: "p-irvan", pin: DEMO_PIN })),
    );
    expect(harness.redirects.at(-1)).toBe("/keluarga");
  });

  it("parameter next tidak bisa mengalihkan ke situs luar", async () => {
    /*
     * Penjaga `next.startsWith("/")` meloloskan URL relatif-protokol
     * ("//evil.example"), yang oleh browser dibaca sebagai situs lain.
     * Penyerang mengirim tautan /login?next=//evil.example, dan setelah korban
     * benar-benar login + memilih PIN, ia dilempar ke situs penyerang —
     * dari domain yang dipercaya.
     */
    signIn(accountSession());

    await catchRedirect(() =>
      selectProfileAction(
        form({ profileId: "p-irvan", pin: DEMO_PIN, next: "//evil.example" }),
      ),
    );

    // URL relatif-protokol ditolak; pengguna diarahkan ke halaman aman.
    expect(harness.redirects.at(-1)).toBe("/keluarga");
  });
});

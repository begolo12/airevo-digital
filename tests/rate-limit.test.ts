import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONTACT_RULE,
  LOGIN_RULE,
  PIN_RULE,
  checkRateLimit,
  humanizeRetry,
  recordFailure,
  resetAllRateLimits,
  resetRateLimit,
} from "@/lib/auth/rate-limit";

/**
 * Pembatas percobaan.
 *
 * Aturan yang dijaga: percobaan sah tidak boleh terhukum, batas benar-benar
 * mengunci, dan kunci terlepas setelah jendela waktu habis.
 */

beforeEach(() => {
  resetAllRateLimits();
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("checkRateLimit", () => {
  it("mengizinkan percobaan pertama", () => {
    const result = checkRateLimit(LOGIN_RULE, "a@b.c");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(LOGIN_RULE.max);
  });

  it("mengizinkan sampai batas, lalu menolak", () => {
    const identity = "batas@b.c";

    for (let index = 0; index < LOGIN_RULE.max; index += 1) {
      expect(checkRateLimit(LOGIN_RULE, identity).allowed).toBe(true);
      const after = recordFailure(LOGIN_RULE, identity);
      // Percobaan ke-max memicu kunci.
      if (index === LOGIN_RULE.max - 1) {
        expect(after.allowed).toBe(false);
      } else {
        expect(after.allowed).toBe(true);
      }
    }

    const blocked = checkRateLimit(LOGIN_RULE, identity);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("memisahkan hitungan antar identitas", () => {
    for (let index = 0; index < LOGIN_RULE.max; index += 1) {
      recordFailure(LOGIN_RULE, "terkunci@b.c");
    }

    expect(checkRateLimit(LOGIN_RULE, "terkunci@b.c").allowed).toBe(false);
    expect(checkRateLimit(LOGIN_RULE, "lain@b.c").allowed).toBe(true);
  });

  it("memisahkan aturan walau identitasnya sama", () => {
    for (let index = 0; index < PIN_RULE.max; index += 1) {
      recordFailure(PIN_RULE, "sama");
    }

    // PIN terkunci, login dengan identitas sama tetap boleh.
    expect(checkRateLimit(PIN_RULE, "sama").allowed).toBe(false);
    expect(checkRateLimit(LOGIN_RULE, "sama").allowed).toBe(true);
  });
});

describe("resetRateLimit", () => {
  it("membuka kuota setelah percobaan berhasil", () => {
    const identity = "pulih@b.c";
    for (let index = 0; index < LOGIN_RULE.max - 1; index += 1) {
      recordFailure(LOGIN_RULE, identity);
    }
    expect(checkRateLimit(LOGIN_RULE, identity).remaining).toBe(1);

    resetRateLimit(LOGIN_RULE, identity);

    expect(checkRateLimit(LOGIN_RULE, identity).remaining).toBe(LOGIN_RULE.max);
  });

  it("membuka kunci yang sudah aktif", () => {
    const identity = "bukakunci@b.c";
    for (let index = 0; index < LOGIN_RULE.max; index += 1) {
      recordFailure(LOGIN_RULE, identity);
    }
    expect(checkRateLimit(LOGIN_RULE, identity).allowed).toBe(false);

    resetRateLimit(LOGIN_RULE, identity);
    expect(checkRateLimit(LOGIN_RULE, identity).allowed).toBe(true);
  });
});

describe("jendela waktu", () => {
  it("kunci terlepas setelah masa blokir habis", () => {
    vi.useFakeTimers();
    const identity = "waktu@b.c";

    for (let index = 0; index < LOGIN_RULE.max; index += 1) {
      recordFailure(LOGIN_RULE, identity);
    }
    expect(checkRateLimit(LOGIN_RULE, identity).allowed).toBe(false);

    vi.advanceTimersByTime(LOGIN_RULE.blockMs + 1000);

    expect(checkRateLimit(LOGIN_RULE, identity).allowed).toBe(true);
  });

  it("hitungan lama tidak menumpuk selamanya", () => {
    vi.useFakeTimers();
    const identity = "lama@b.c";

    // Tiga kegagalan, lalu tunggu melewati jendela.
    for (let index = 0; index < 3; index += 1) {
      recordFailure(LOGIN_RULE, identity);
    }
    vi.advanceTimersByTime(LOGIN_RULE.windowMs + 1000);

    // Kuota kembali penuh karena catatan lama dibuang.
    expect(checkRateLimit(LOGIN_RULE, identity).remaining).toBe(LOGIN_RULE.max);
  });
});

describe("aturan yang dipakai aplikasi", () => {
  it("login dibatasi 5 percobaan per 15 menit", () => {
    expect(LOGIN_RULE.max).toBe(5);
    expect(LOGIN_RULE.windowMs).toBe(15 * 60 * 1000);
    expect(LOGIN_RULE.blockMs).toBeGreaterThan(0);
  });

  it("PIN dibatasi tidak lebih longgar dari login", () => {
    // PIN hanya 4–6 angka, jadi harus sekurang-kurangnya seketat login.
    expect(PIN_RULE.max).toBeLessThanOrEqual(LOGIN_RULE.max);
  });

  it("form kontak punya batas", () => {
    expect(CONTACT_RULE.max).toBeGreaterThan(0);
    expect(CONTACT_RULE.windowMs).toBeGreaterThan(0);
  });
});

describe("humanizeRetry", () => {
  it("membulatkan ke satuan yang mudah dibaca", () => {
    expect(humanizeRetry(30_000)).toBe("sekitar 1 menit");
    expect(humanizeRetry(5 * 60_000)).toBe("sekitar 5 menit");
    expect(humanizeRetry(90 * 60_000)).toBe("sekitar 2 jam");
  });
});

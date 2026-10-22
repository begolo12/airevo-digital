import { beforeEach, describe, expect, it } from "vitest";
import {
  authenticateRequest,
  bearerToken,
  authFailureStatus,
} from "@/lib/auth/mobile";
import { encodeSession } from "@/lib/auth/session";
import { resetStore } from "@/lib/data/store";
import { resetAllRateLimits } from "@/lib/auth/rate-limit";

/**
 * Autentikasi API mobile.
 *
 * ## Yang dijaga
 *
 * API mobile memakai token yang sama dengan cookie web. Itu keputusan yang
 * menghemat banyak kode — tetapi juga berarti **setiap kelemahan pada token
 * langsung berlaku di dua jalur**. Test ini memastikan jalur mobile tidak
 * menerima apa pun yang seharusnya ditolak.
 *
 * Yang paling penting: token tidak boleh menaikkan hak akses. Keanggotaan
 * workspace diperiksa ulang setiap permintaan, bukan dipercaya dari isi token.
 */

function request(token?: string): Request {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  return new Request("http://localhost/api/mobile/summary", { headers });
}

/** Token sah untuk profil Irvan di ruang keluarga. */
function validToken(overrides: Record<string, unknown> = {}) {
  return encodeSession({
    userId: "u-irvan",
    email: "irvan@airevo-digital.my.id",
    name: "Irvan",
    role: "owner",
    stage: "active",
    profileId: "p-irvan",
    workspaceId: "ws-family",
    ...overrides,
  } as Parameters<typeof encodeSession>[0]);
}

beforeEach(() => {
  resetStore();
  resetAllRateLimits();
});

describe("bearerToken", () => {
  it("membaca token dari header Authorization", () => {
    expect(bearerToken(request("abc123"))).toBe("abc123");
  });

  it("menerima skema huruf besar", () => {
    const req = new Request("http://localhost/", {
      headers: { authorization: "BEARER token-uji" },
    });
    expect(bearerToken(req)).toBe("token-uji");
  });

  it("mengembalikan null tanpa header", () => {
    expect(bearerToken(request())).toBeNull();
  });

  it("menolak skema selain Bearer", () => {
    const req = new Request("http://localhost/", {
      headers: { authorization: "Basic dXNlcjpwYXNz" },
    });
    expect(bearerToken(req)).toBeNull();
  });

  it("menolak Bearer tanpa nilai", () => {
    const req = new Request("http://localhost/", {
      headers: { authorization: "Bearer" },
    });
    expect(bearerToken(req)).toBeNull();
  });
});

describe("authenticateRequest", () => {
  it("menerima token yang sah", () => {
    const result = authenticateRequest(request(validToken()));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.viewer.profileId).toBe("p-irvan");
    expect(result.viewer.workspaceId).toBe("ws-family");
  });

  it("menolak tanpa token", () => {
    const result = authenticateRequest(request());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.reason).toBe("missing");
  });

  it("menolak token yang ditandatangani kunci lain", () => {
    /*
     * Tanda tangan adalah satu-satunya yang membedakan token sah dari token
     * buatan sendiri. Token dengan payload benar tetapi tanda tangan salah
     * harus ditolak.
     */
    const forged = `${Buffer.from(
      JSON.stringify({
        userId: "u-irvan",
        email: "irvan@airevo-digital.my.id",
        name: "Irvan",
        role: "owner",
        stage: "active",
        profileId: "p-irvan",
        workspaceId: "ws-family",
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url")}.tanda-tangan-palsu`;

    const result = authenticateRequest(request(forged));
    expect(result.ok).toBe(false);
  });

  it("menolak token yang dipotong", () => {
    const token = validToken();
    const result = authenticateRequest(request(token.slice(0, token.length - 5)));
    expect(result.ok).toBe(false);
  });

  it("menolak token tahap profile (belum pilih profil)", () => {
    /*
     * Token tahap profile membuktikan kata sandi benar, tetapi belum memilih
     * profil. Memberinya akses data berarti melewati PIN.
     */
    const token = encodeSession({
      userId: "u-irvan",
      email: "irvan@airevo-digital.my.id",
      name: "Irvan",
      role: "owner",
      stage: "profile",
    });

    const result = authenticateRequest(request(token));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.reason).toBe("not_active");
  });

  it("menolak token tanpa profileId", () => {
    const token = encodeSession({
      userId: "u-irvan",
      email: "irvan@airevo-digital.my.id",
      name: "Irvan",
      role: "owner",
      stage: "active",
      workspaceId: "ws-family",
    });

    const result = authenticateRequest(request(token));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.reason).toBe("no_profile");
  });

  it("menolak profil yang tidak ada", () => {
    const result = authenticateRequest(request(validToken({ profileId: "p-hantu" })));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.reason).toBe("no_profile");
  });

  it("menolak profil yang bukan anggota workspace", () => {
    /*
     * Token bisa berumur tujuh hari. Selama itu, keanggotaan bisa dicabut.
     * Mempercayai isi token berarti pencabutan tidak pernah berlaku sampai
     * token kedaluwarsa sendiri — dan itu terlalu lama.
     */
    const result = authenticateRequest(
      request(validToken({ profileId: "p-sari", workspaceId: "ws-irvan" })),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.reason).toBe("not_member");
  });

  it("menolak workspace yang tidak ada", () => {
    const result = authenticateRequest(
      request(validToken({ workspaceId: "ws-hantu" })),
    );

    expect(result.ok).toBe(false);
  });
});

describe("authFailureStatus", () => {
  it("memetakan kegagalan sesi ke 401", () => {
    expect(authFailureStatus({ reason: "missing" })).toBe(401);
    expect(authFailureStatus({ reason: "expired" })).toBe(401);
  });

  it("memetakan kegagalan hak akses ke 403", () => {
    expect(authFailureStatus({ reason: "not_member" })).toBe(403);
    expect(authFailureStatus({ reason: "not_active", stage: "profile" })).toBe(403);
    expect(authFailureStatus({ reason: "no_profile" })).toBe(403);
  });
});

import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { decodeSession, encodeSession } from "@/lib/auth/session";

describe("kata sandi", () => {
  it("menerima kata sandi yang benar", () => {
    const stored = hashPassword("airevo123");
    expect(verifyPassword("airevo123", stored)).toBe(true);
  });

  it("menolak kata sandi yang salah", () => {
    const stored = hashPassword("airevo123");
    expect(verifyPassword("salah", stored)).toBe(false);
    expect(verifyPassword("", stored)).toBe(false);
  });

  it("menghasilkan hash berbeda untuk kata sandi sama (salt acak)", () => {
    expect(hashPassword("sama")).not.toBe(hashPassword("sama"));
  });

  it("menolak format hash yang tidak dikenal", () => {
    expect(verifyPassword("apa saja", "bukan-hash")).toBe(false);
    expect(verifyPassword("apa saja", "scrypt$hanya-dua")).toBe(false);
  });
});

describe("cookie sesi", () => {
  const payload = {
    userId: "u-1",
    email: "a@b.c",
    name: "Uji",
    stage: "active" as const,
    profileId: "p-1",
    workspaceId: "ws-1",
    role: "owner",
  };

  it("bisa dibaca kembali setelah ditandatangani", () => {
    const token = encodeSession(payload);
    const decoded = decodeSession(token);
    expect(decoded?.userId).toBe("u-1");
    expect(decoded?.role).toBe("owner");
    expect(decoded?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("menolak token yang diubah", () => {
    const token = encodeSession(payload);
    const [body, sig] = token.split(".");
    const tampered = `${Buffer.from(
      JSON.stringify({ ...payload, role: "owner", userId: "u-999" }),
    ).toString("base64url")}.${sig}`;
    expect(decodeSession(tampered)).toBeNull();
    expect(body).toBeTruthy();
  });

  it("menolak token tanpa tanda tangan atau kosong", () => {
    expect(decodeSession(undefined)).toBeNull();
    expect(decodeSession("")).toBeNull();
    expect(decodeSession("abc")).toBeNull();
    expect(decodeSession("abc.def")).toBeNull();
  });
});

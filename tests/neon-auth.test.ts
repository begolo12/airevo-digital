import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "node:http";
import { SignJWT, exportJWK, generateKeyPair } from "jose";

/**
 * Verifikasi token Neon Auth.
 *
 * JWKS branch produksi berisi kunci publik yang tidak bisa dipakai untuk
 * menandatangani, jadi di sini dipakai JWKS tiruan dengan kunci milik sendiri.
 * Yang diuji adalah **logika verifikasi aplikasi**: tanda tangan, penerbit,
 * masa berlaku, dan penolakan token yang dimanipulasi.
 *
 * Bahwa JWKS Neon yang sebenarnya hidup diuji terpisah oleh `/api/health`
 * (`neonAuth: "ok"`), yang mengambil kunci EdDSA asli dari branch.
 */

const ISSUER = "https://uji.neonauth.local/neondb/auth";

let server: http.Server;
let jwksUrl: string;
let privateKey: CryptoKey;
let verifyNeonAuthToken: (token: string) => Promise<{ userId: string; email?: string } | null>;

async function sign(overrides: {
  subject?: string;
  issuer?: string;
  expiresIn?: string | number;
  issuedAt?: number;
} = {}) {
  const builder = new SignJWT({ email: "irvan@airevo-digital.my.id", name: "Irvan" })
    .setProtectedHeader({ alg: "EdDSA", kid: "uji" })
    .setSubject(overrides.subject ?? "neon-user-123")
    .setIssuer(overrides.issuer ?? ISSUER);

  if (typeof overrides.issuedAt === "number") {
    builder.setIssuedAt(overrides.issuedAt);
  } else {
    builder.setIssuedAt();
  }

  builder.setExpirationTime(overrides.expiresIn ?? "10m");
  return builder.sign(privateKey);
}

beforeAll(async () => {
  const keys = await generateKeyPair("EdDSA");
  privateKey = keys.privateKey;

  const jwk = await exportJWK(keys.publicKey);
  jwk.kid = "uji";
  jwk.alg = "EdDSA";
  jwk.use = "sig";

  server = http.createServer((request, response) => {
    if (request.url?.startsWith("/.well-known/jwks.json")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ keys: [jwk] }));
      return;
    }
    response.writeHead(404);
    response.end();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  jwksUrl = `http://127.0.0.1:${port}/.well-known/jwks.json`;

  // Modul membaca env saat dipanggil, jadi aman diatur di sini.
  process.env.NEON_AUTH_BASE_URL = ISSUER;
  process.env.NEON_AUTH_JWKS_URL = jwksUrl;

  ({ verifyNeonAuthToken } = await import("@/lib/auth/neon-auth"));
});

afterAll(() => {
  server?.close();
});

describe("verifikasi token Neon Auth", () => {
  it("menerima token yang sah", async () => {
    const identity = await verifyNeonAuthToken(await sign());

    expect(identity).not.toBeNull();
    expect(identity?.userId).toBe("neon-user-123");
    expect(identity?.email).toBe("irvan@airevo-digital.my.id");
  });

  it("menolak token kedaluwarsa", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await sign({ issuedAt: now - 7200, expiresIn: now - 3600 });

    expect(await verifyNeonAuthToken(token)).toBeNull();
  });

  it("menolak token dari penerbit lain", async () => {
    const token = await sign({ issuer: "https://penyerang.example" });
    expect(await verifyNeonAuthToken(token)).toBeNull();
  });

  it("menolak token yang tanda tangannya dirusak", async () => {
    const token = await sign();
    const tampered = `${token.slice(0, -4)}AAAA`;

    expect(await verifyNeonAuthToken(tampered)).toBeNull();
  });

  it("menolak token tanpa subjek", async () => {
    const token = await new SignJWT({ email: "a@b.c" })
      .setProtectedHeader({ alg: "EdDSA", kid: "uji" })
      .setIssuer(ISSUER)
      .setIssuedAt()
      .setExpirationTime("10m")
      .sign(privateKey);

    expect(await verifyNeonAuthToken(token)).toBeNull();
  });

  it("menolak masukan yang bukan JWT", async () => {
    expect(await verifyNeonAuthToken("bukan.jwt.sama.sekali")).toBeNull();
    expect(await verifyNeonAuthToken("")).toBeNull();
  });

  it("menolak token yang ditandatangani kunci lain", async () => {
    const lain = await generateKeyPair("EdDSA");
    const token = await new SignJWT({ email: "a@b.c" })
      .setProtectedHeader({ alg: "EdDSA", kid: "uji" })
      .setSubject("neon-user-999")
      .setIssuer(ISSUER)
      .setIssuedAt()
      .setExpirationTime("10m")
      .sign(lain.privateKey);

    expect(await verifyNeonAuthToken(token)).toBeNull();
  });
});

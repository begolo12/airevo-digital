import "server-only";

import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Verifikasi token Neon Auth (Managed Better Auth).
 *
 * ## Kenapa tidak menggantikan auth yang ada
 *
 * Aplikasi ini sudah punya auth sendiri: scrypt untuk kata sandi dan PIN,
 * cookie HMAC bertanda tangan, dua tahap sesi, dan pemisahan ruang per profil.
 * Semua itu berfungsi dan sudah diuji. Menggantinya dengan Neon Auth berarti
 * membongkar alur login, sesi, dan seluruh test yang menjaganya.
 *
 * Karena itu Neon Auth dipasang sebagai **jalur masuk tambahan**, bukan
 * pengganti: aplikasi bisa memverifikasi token yang diterbitkan Neon Auth
 * (mis. dari aplikasi mobile atau integrasi masa depan) tanpa mengubah alur
 * yang sudah berjalan.
 *
 * ## Cara verifikasi
 *
 * Token diperiksa tanda tangannya terhadap JWKS milik branch, lalu klaim
 * penerbit dan masa berlakunya. Kunci diambil sekali lalu di-cache oleh
 * `createRemoteJWKSet`.
 */

const baseUrl = process.env.NEON_AUTH_BASE_URL;
const jwksUrl = process.env.NEON_AUTH_JWKS_URL;

export function isNeonAuthConfigured(): boolean {
  return Boolean(baseUrl && jwksUrl);
}

export type NeonAuthIdentity = {
  /** Subjek token — id pengguna di Neon Auth. */
  userId: string;
  email?: string;
  name?: string;
  /** Waktu kedaluwarsa (epoch detik). */
  expiresAt: number;
};

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!jwksUrl) {
    throw new Error("NEON_AUTH_JWKS_URL belum diisi.");
  }
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(jwksUrl));
  }
  return jwks;
}

/**
 * Memverifikasi token akses Neon Auth.
 *
 * Mengembalikan `null` bila token tidak sah — tidak pernah melempar, supaya
 * pemanggil tidak perlu membedakan "tidak valid" dari "gagal jaringan".
 */
export async function verifyNeonAuthToken(token: string): Promise<NeonAuthIdentity | null> {
  if (!isNeonAuthConfigured() || !token) return null;

  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: baseUrl,
    });

    if (!payload.sub) return null;

    return {
      userId: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
      name: typeof payload.name === "string" ? payload.name : undefined,
      expiresAt: typeof payload.exp === "number" ? payload.exp : 0,
    };
  } catch {
    return null;
  }
}

/**
 * Mengambil token dari header `Authorization: Bearer …`.
 */
export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

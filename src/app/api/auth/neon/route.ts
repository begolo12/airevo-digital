import { NextResponse } from "next/server";
import {
  bearerToken,
  isNeonAuthConfigured,
  verifyNeonAuthToken,
} from "@/lib/auth/neon-auth";
import { getStore } from "@/lib/data/store";

/**
 * Memverifikasi token Neon Auth.
 *
 * Dipakai untuk membuktikan jalur auth Neon benar-benar berfungsi: token
 * diperiksa tanda tangannya terhadap JWKS branch, lalu dicocokkan dengan akun
 * yang dikenal aplikasi.
 *
 * Endpoint ini tidak membuat sesi. Alur login aplikasi tetap memakai kata
 * sandi + PIN yang sudah ada; lihat `src/lib/auth/neon-auth.ts` untuk alasannya.
 */
export async function GET(request: Request) {
  if (!isNeonAuthConfigured()) {
    return NextResponse.json(
      { ok: false, message: "Neon Auth belum dikonfigurasi." },
      { status: 503 },
    );
  }

  const token = bearerToken(request);
  if (!token) {
    return NextResponse.json(
      { ok: false, message: "Header Authorization: Bearer <token> diperlukan." },
      { status: 401 },
    );
  }

  const identity = await verifyNeonAuthToken(token);
  if (!identity) {
    return NextResponse.json(
      { ok: false, message: "Token tidak sah atau sudah kedaluwarsa." },
      { status: 401 },
    );
  }

  // Cocokkan dengan akun aplikasi, bila ada.
  const account = identity.email
    ? getStore().users.find(
        (user) => user.email.toLowerCase() === identity.email?.toLowerCase(),
      )
    : undefined;

  return NextResponse.json({
    ok: true,
    identity: {
      userId: identity.userId,
      email: identity.email ?? null,
      name: identity.name ?? null,
      expiresAt: identity.expiresAt,
    },
    matchedAccount: account
      ? { id: account.id, email: account.email, role: account.role }
      : null,
    jwks: process.env.NEON_AUTH_JWKS_URL,
  });
}

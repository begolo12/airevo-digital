import "server-only";

import { NextResponse } from "next/server";
import {
  authenticateRequest,
  authFailureMessage,
  authFailureStatus,
} from "@/lib/auth/mobile";
import type { Viewer } from "@/lib/session";

/**
 * Pembungkus rute API mobile.
 *
 * Mengumpulkan tiga hal yang selalu sama di setiap rute — autentikasi,
 * pembentukan respons JSON, dan penanganan galat — supaya rute tinggal berisi
 * logika datanya.
 *
 * ## Kenapa galat tak terduga tidak dibocorkan
 *
 * Pesan galat internal bisa memuat nama tabel, potongan SQL, atau path berkas.
 * Klien hanya menerima pesan umum; detailnya masuk log server. Ini penting
 * karena API mobile dapat diakses siapa pun yang punya token, bukan hanya
 * pengembang.
 */

export type ApiHandler = (context: {
  viewer: Viewer;
  request: Request;
}) => Promise<unknown> | unknown;

/** Respons JSON dengan bentuk yang konsisten. */
export function apiJson(data: unknown, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function apiError(message: string, status = 400, extra?: object) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

/**
 * Menjalankan handler dengan autentikasi token.
 *
 * Semua rute data memakai ini, sehingga tidak ada rute yang bisa lupa
 * memeriksa sesi — kesalahan yang pernah terjadi pada server action web.
 */
export async function withAuth(
  request: Request,
  handler: ApiHandler,
): Promise<NextResponse> {
  const auth = authenticateRequest(request);

  if (!auth.ok) {
    return apiError(
      authFailureMessage(auth.failure),
      authFailureStatus(auth.failure),
      { reason: auth.failure.reason },
    );
  }

  try {
    const data = await handler({ viewer: auth.viewer, request });
    return apiJson(data);
  } catch (error) {
    console.error(
      "[mobile-api] galat tak terduga:",
      error instanceof Error ? error.message : error,
    );
    return apiError("Terjadi kesalahan di server. Coba lagi.", 500);
  }
}

/** Membaca parameter angka dari query string, dengan batas aman. */
export function intParam(
  url: URL,
  name: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = url.searchParams.get(name);
  if (raw === null) return fallback;

  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;

  return Math.min(Math.max(Math.trunc(value), min), max);
}

/**
 * Membaca parameter bulan `YYYY-MM`, dengan validasi.
 *
 * Bulan yang tidak sah dikembalikan sebagai `undefined` agar pemanggil memakai
 * bulan berjalan — bukan menghasilkan query kosong yang membingungkan.
 */
export function monthParam(url: URL): string | undefined {
  const raw = url.searchParams.get("month");
  if (!raw) return undefined;

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(raw)) return undefined;

  return raw;
}

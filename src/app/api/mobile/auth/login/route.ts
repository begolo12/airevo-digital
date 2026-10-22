import "server-only";

import { NextResponse } from "next/server";
import { encodeSession } from "@/lib/auth/session";
import { authenticate } from "@/lib/session";
import { profilesForAccount } from "@/lib/data/workspace";
import {
  LOGIN_RULE,
  checkRateLimit,
  recordFailure,
  resetRateLimit,
  humanizeRetry,
} from "@/lib/auth/rate-limit";
import { apiError } from "@/lib/api/respond";

/**
 * Masuk dari aplikasi Android — tahap 1: email + kata sandi.
 *
 * Mengembalikan token bertahap `profile`, sama seperti cookie web. Token ini
 * belum memberi akses data; ia hanya membuktikan pemilik akun, dan dipakai
 * untuk memilih profil pada langkah berikutnya.
 *
 * ## Kenapa dua tahap
 *
 * Satu akun bisa punya beberapa profil (mis. suami, istri, anak), masing-masing
 * dengan PIN dan ruang datanya sendiri. Memisahkan tahap akun dan tahap profil
 * membuat PIN bisa diperiksa per profil tanpa membocorkan profil mana yang ada
 * ke orang yang belum membuktikan kata sandinya.
 *
 * ## Pembatasan percobaan
 *
 * Memakai aturan yang sama dengan login web (`LOGIN_RULE`). Tanpa itu, API ini
 * menjadi jalur alternatif untuk menebak kata sandi tanpa terkena batas —
 * pintu belakang yang tidak diinginkan.
 */
export async function POST(request: Request) {
  let payload: { email?: string; password?: string };
  try {
    payload = await request.json();
  } catch {
    return apiError("Permintaan tidak valid.", 400);
  }

  const email = String(payload.email ?? "").trim();
  const password = String(payload.password ?? "");

  if (!email || !password) {
    return apiError("Email dan kata sandi wajib diisi.", 422);
  }

  const identity = email.toLowerCase();

  const limit = checkRateLimit(LOGIN_RULE, identity);
  if (!limit.allowed) {
    return apiError(
      `Terlalu banyak percobaan masuk. Coba lagi dalam ${humanizeRetry(limit.retryAfterMs)}.`,
      429,
    );
  }

  const session = authenticate(email, password);

  if (!session) {
    const after = recordFailure(LOGIN_RULE, identity);

    if (!after.allowed) {
      return apiError(
        `Terlalu banyak percobaan masuk. Akun dikunci sementara, coba lagi dalam ${humanizeRetry(after.retryAfterMs)}.`,
        429,
      );
    }

    /*
     * Pesannya sengaja tidak membedakan "email tidak terdaftar" dari "kata
     * sandi salah" — membedakannya memberi tahu penyerang email mana yang ada.
     */
    return apiError(
      `Email atau kata sandi belum tepat. Sisa ${after.remaining} percobaan.`,
      401,
    );
  }

  resetRateLimit(LOGIN_RULE, identity);

  const token = encodeSession(session);

  const profiles = profilesForAccount(session.userId).map((profile) => ({
    id: profile.id,
    name: profile.name,
    initial: profile.initial,
    color: profile.color,
    role: profile.role,
    hasPin: Boolean(profile.pinHash),
  }));

  return NextResponse.json({
    ok: true,
    data: {
      token,
      stage: "profile" as const,
      account: { email: session.email, name: session.name },
      profiles,
    },
  });
}

/** Menolak metode lain dengan penjelasan, bukan 405 kosong. */
export async function GET() {
  return apiError("Gunakan POST untuk masuk.", 405);
}

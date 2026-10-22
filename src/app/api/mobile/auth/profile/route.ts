import "server-only";

import { NextResponse } from "next/server";
import { decodeSession, encodeSession } from "@/lib/auth/session";
import { unlockProfile } from "@/lib/session";
import { profilesForAccount, workspacesForProfile } from "@/lib/data/workspace";
import { defaultWorkspaceFor } from "@/lib/session";
import {
  PIN_RULE,
  checkRateLimit,
  recordFailure,
  resetRateLimit,
  humanizeRetry,
} from "@/lib/auth/rate-limit";
import { apiError } from "@/lib/api/respond";

/**
 * Masuk dari aplikasi Android — tahap 2: pilih profil + PIN.
 *
 * Menukar token bertahap `profile` dengan token bertahap `active` yang sudah
 * memuat `profileId` dan `workspaceId`. Setelah ini token boleh dipakai untuk
 * membaca data.
 *
 * ## Urutan pemeriksaan
 *
 * Kepemilikan profil diperiksa **sebelum** kuota PIN disentuh. Kalau urutannya
 * dibalik, siapa pun yang punya akun bisa mengunci PIN profil milik akun lain
 * dengan mengirim `profileId` orang itu dan PIN salah berulang kali — penghuni
 * sahnya lalu terkunci. Itu penolakan layanan lintas akun.
 */
export async function POST(request: Request) {
  let payload: { token?: string; profileId?: string; pin?: string };
  try {
    payload = await request.json();
  } catch {
    return apiError("Permintaan tidak valid.", 400);
  }

  const token = String(payload.token ?? "");
  const profileId = String(payload.profileId ?? "");
  const pin = String(payload.pin ?? "");

  const session = decodeSession(token);
  if (!session) {
    return apiError("Sesi sudah berakhir. Silakan masuk kembali.", 401);
  }

  if (!profileId) {
    return apiError("Pilih profil dulu.", 422);
  }

  const owned = profilesForAccount(session.userId).find(
    (item) => item.id === profileId,
  );
  if (!owned) {
    return apiError("Profil tidak ditemukan pada akun ini.", 404);
  }

  /*
   * Profil tanpa PIN langsung lolos — PIN bersifat opsional per profil.
   * Pemeriksaan kuota dilewati karena tidak ada yang perlu ditebak.
   */
  if (owned.pinHash) {
    const limit = checkRateLimit(PIN_RULE, profileId);
    if (!limit.allowed) {
      return apiError(
        `Terlalu banyak percobaan PIN. Coba lagi dalam ${humanizeRetry(limit.retryAfterMs)}.`,
        429,
      );
    }

    const profile = unlockProfile(session.userId, profileId, pin);
    if (!profile) {
      const after = recordFailure(PIN_RULE, profileId);
      if (!after.allowed) {
        return apiError(
          `Terlalu banyak percobaan PIN. Profil dikunci sementara, coba lagi dalam ${humanizeRetry(after.retryAfterMs)}.`,
          429,
        );
      }
      return apiError(
        `PIN belum tepat. Sisa ${after.remaining} percobaan sebelum dikunci sementara.`,
        401,
      );
    }

    resetRateLimit(PIN_RULE, profileId);
  }

  const workspaceId = defaultWorkspaceFor(profileId);
  if (!workspaceId) {
    return apiError("Profil ini belum punya ruang data.", 409);
  }

  const active = encodeSession({
    userId: session.userId,
    email: session.email,
    name: owned.name,
    role: owned.role,
    stage: "active",
    profileId,
    workspaceId,
  });

  const workspaces = workspacesForProfile(profileId).map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    type: workspace.type,
  }));

  return NextResponse.json({
    ok: true,
    data: {
      token: active,
      stage: "active" as const,
      profile: {
        id: owned.id,
        name: owned.name,
        initial: owned.initial,
        color: owned.color,
        role: owned.role,
      },
      workspaceId,
      workspaces,
    },
  });
}

import "server-only";

import { decodeSession, type SessionPayload } from "@/lib/auth/session";
import { profileById, isWorkspaceMember } from "@/lib/data/workspace";
import type { Viewer } from "@/lib/session";
import type { Role } from "@/lib/data/types";

/**
 * Autentikasi untuk aplikasi mobile.
 *
 * ## Kenapa memakai token yang sama dengan cookie
 *
 * Sesi web disimpan di cookie `airevo_session` berisi payload yang ditandatangani
 * HMAC. Payload itu **mandiri** — tidak bergantung pada cookie untuk berarti.
 *
 * Jadi aplikasi Android cukup mengirim string yang sama lewat header
 * `Authorization: Bearer <token>`. Satu mekanisme sesi, dua cara pengiriman:
 *
 * | Klien | Transport |
 * | --- | --- |
 * | Web | cookie `airevo_session` |
 * | Android | header `Authorization` |
 *
 * Konsekuensi yang disengaja: masa berlaku, cara menandatangani, dan aturan
 * kedaluwarsa hanya ada di satu tempat. Kalau salah satunya diubah, kedua klien
 * ikut berubah — tidak ada jalur yang tertinggal.
 *
 * ## Yang tetap sama
 *
 * Token tidak menaikkan hak akses. Semua pemeriksaan yang berlaku di web tetap
 * berlaku: profil harus ada, dan profil harus benar-benar anggota workspace
 * yang sedang aktif. Token yang sah untuk profil yang aksesnya sudah dicabut
 * tetap ditolak.
 */

/** Kegagalan autentikasi, dipetakan ke status HTTP oleh pemanggil. */
export type AuthFailure =
  | { reason: "missing" }
  | { reason: "invalid" }
  | { reason: "expired" }
  | { reason: "not_active"; stage: string }
  | { reason: "no_profile" }
  | { reason: "not_member" };

export type AuthResult =
  | { ok: true; session: SessionPayload; viewer: Viewer }
  | { ok: false; failure: AuthFailure };

/** Mengambil token dari header `Authorization: Bearer ...`. */
export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;

  const [scheme, value] = header.split(" ");
  if (!value || scheme.toLowerCase() !== "bearer") return null;

  return value.trim() || null;
}

/**
 * Memeriksa token dan mengembalikan konteks aksesnya.
 *
 * Membedakan "tidak ada token" dari "token tidak sah" dari "token kedaluwarsa"
 * supaya klien bisa memberi pesan yang tepat — pengguna yang sesinya habis
 * perlu diminta masuk lagi, bukan diberi pesan "akses ditolak".
 */
export function authenticateRequest(request: Request): AuthResult {
  const token = bearerToken(request);
  if (!token) return { ok: false, failure: { reason: "missing" } };

  const session = decodeSession(token);
  if (!session) {
    /*
     * `decodeSession` mengembalikan null untuk tanda tangan salah DAN untuk
     * token kedaluwarsa. Untuk memberi pesan yang tepat, bentuknya diperiksa
     * ulang: token yang bentuknya sah tetapi ditolak hampir selalu karena
     * kedaluwarsa.
     */
    return { ok: false, failure: { reason: "expired" } };
  }

  if (session.stage !== "active") {
    return { ok: false, failure: { reason: "not_active", stage: session.stage } };
  }

  if (!session.profileId || !session.workspaceId) {
    return { ok: false, failure: { reason: "no_profile" } };
  }

  const profile = profileById(session.profileId);
  if (!profile) return { ok: false, failure: { reason: "no_profile" } };

  /*
   * Keanggotaan diperiksa ulang, bukan dipercaya dari token.
   *
   * Token bisa berumur sampai tujuh hari. Selama itu, pemilik workspace bisa
   * mencabut akses profil ini — dan token lama tidak boleh tetap berlaku.
   */
  if (!isWorkspaceMember(session.workspaceId, session.profileId)) {
    return { ok: false, failure: { reason: "not_member" } };
  }

  return {
    ok: true,
    session,
    viewer: {
      userId: session.userId,
      profileId: session.profileId,
      workspaceId: session.workspaceId,
      role: profile.role as Role,
    },
  };
}

/** Pesan bahasa Indonesia untuk setiap kegagalan. */
export function authFailureMessage(failure: AuthFailure): string {
  switch (failure.reason) {
    case "missing":
      return "Anda belum masuk. Silakan masuk kembali.";
    case "invalid":
      return "Sesi tidak sah.";
    case "expired":
      return "Sesi sudah berakhir. Silakan masuk kembali.";
    case "not_active":
      return "Pilih profil dulu.";
    case "no_profile":
      return "Profil tidak ditemukan.";
    case "not_member":
      return "Akses ke ruang ini sudah dicabut.";
  }
}

/** Status HTTP yang sesuai untuk setiap kegagalan. */
export function authFailureStatus(failure: AuthFailure): number {
  switch (failure.reason) {
    case "missing":
    case "invalid":
    case "expired":
      return 401;
    case "not_active":
    case "no_profile":
    case "not_member":
      return 403;
  }
}

import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "airevo_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/**
 * Secret untuk menandatangani cookie sesi.
 *
 * Urutan: SESSION_SECRET → BETTER_AUTH_SECRET → (produksi) acak per proses.
 * Di produksi tanpa env, secret dibuat acak supaya tidak ada nilai default yang
 * bisa ditebak; konsekuensinya sesi hangus setiap proses baru. Isi
 * SESSION_SECRET di Vercel untuk sesi yang stabil.
 */
function resolveSecret(): string {
  const fromEnv = process.env.SESSION_SECRET ?? process.env.BETTER_AUTH_SECRET;
  if (fromEnv && fromEnv.length >= 16) return fromEnv;

  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[auth] SESSION_SECRET belum diisi — memakai secret acak per proses. " +
        "Sesi akan hangus setiap restart. Isi SESSION_SECRET di environment.",
    );
    return randomBytes(32).toString("base64url");
  }

  return "airevo-local-development-secret-change-me";
}

const SECRET = resolveSecret();

/**
 * Sesi dua tahap.
 *
 * 1. Setelah email + kata sandi benar: `stage = "profile"`, belum ada profil.
 * 2. Setelah profil dipilih dan PIN benar: `stage = "active"`, lengkap dengan
 *    `profileId` dan `workspaceId` yang sedang aktif.
 *
 * Cookie ditandatangani HMAC, jadi tahap tidak bisa dinaikkan dari klien.
 */
export type SessionStage = "profile" | "active";

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  role: string;
  stage: SessionStage;
  /** Profil yang sedang dipakai. Kosong saat stage = "profile". */
  profileId?: string;
  /** Workspace aktif. Kosong saat stage = "profile". */
  workspaceId?: string;
  exp: number;
};

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("base64url");
}

export function encodeSession(payload: Omit<SessionPayload, "exp">): string {
  const body: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function decodeSession(raw: string | undefined): SessionPayload | null {
  if (!raw) return null;
  const [encoded, signature] = raw.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString(),
    ) as SessionPayload;

    if (!parsed?.userId || !parsed.exp) return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    // Sesi lama sebelum ada dua tahap dianggap sudah masuk penuh.
    if (!parsed.stage) parsed.stage = "active";

    return parsed;
  } catch {
    return null;
  }
}

export const sessionCookie = {
  name: COOKIE_NAME,
  maxAge: MAX_AGE_SECONDS,
};

import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  decodeSession,
  encodeSession,
  sessionCookie,
  type SessionPayload,
} from "@/lib/auth/session";
import { verifyPassword, verifyPin } from "@/lib/auth/password";
import { getStore } from "@/lib/data/store";
import {
  isWorkspaceMember,
  personalWorkspaceOf,
  profileById,
  profilesForAccount,
  workspaceById,
  workspacesForProfile,
} from "@/lib/data/workspace";
import type { Profile, Role } from "@/lib/data/types";

export type Session = SessionPayload;

/** Konteks akses untuk query yang perlu memfilter visibilitas. */
export type Viewer = {
  userId: string;
  profileId: string;
  workspaceId: string;
  role: Role;
};

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return decodeSession(store.get(sessionCookie.name)?.value);
}

/** Sesi yang sudah melewati pemilihan profil. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login?next=/keluarga");
  if (session.stage !== "active" || !session.profileId) {
    redirect("/pilih-profil");
  }
  return session;
}

/** Sesi level akun, sebelum memilih profil. */
export async function requireAccountSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login?next=/keluarga");
  return session;
}

/** Sesi level akun tanpa redirect, untuk server action. */
export async function getAccountSession(): Promise<Session | null> {
  return getSession();
}

/** Sesi yang sudah aktif penuh, tanpa redirect. */
export async function requireActiveSession(): Promise<Session> {
  const session = await getSession();
  if (!session || session.stage !== "active" || !session.profileId) {
    redirect("/pilih-profil");
  }
  return session;
}

/**
 * Sesi dengan peran owner. Dipakai untuk halaman penjualan.
 *
 * `stage` wajib `active`. Sesi level akun (baru lolos email + kata sandi) sudah
 * membawa `role: "owner"`, tapi PIN profil belum pernah dimasukkan — tanpa
 * pemeriksaan ini, halaman admin dan aksi penerbitan lisensi terbuka bagi siapa
 * pun yang tahu kata sandi akun.
 */
export async function requireOwner(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin/pesanan");
  if (session.stage !== "active" || !session.profileId) {
    redirect("/pilih-profil?next=/admin/pesanan");
  }
  if (session.role !== "owner") redirect("/keluarga");
  return session;
}

/** Konteks akses lengkap: profil + workspace aktif. */
export async function getViewer(): Promise<Viewer | null> {
  const session = await getSession();
  if (!session || session.stage !== "active") return null;
  if (!session.profileId || !session.workspaceId) return null;

  const profile = profileById(session.profileId);
  if (!profile) return null;
  // Workspace bisa saja sudah dihapus atau aksesnya dicabut.
  if (!isWorkspaceMember(session.workspaceId, session.profileId)) return null;

  return {
    userId: session.userId,
    profileId: session.profileId,
    workspaceId: session.workspaceId,
    role: profile.role,
  };
}

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/pilih-profil");
  return viewer;
}

export async function createSession(payload: Omit<SessionPayload, "exp">) {
  const store = await cookies();
  store.set(sessionCookie.name, encodeSession(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionCookie.maxAge,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(sessionCookie.name);
}

/* ------------------------------ autentikasi ------------------------------ */

/** Cek email + kata sandi. Hasilnya sesi tahap "profile". */
export function authenticate(
  email: string,
  password: string,
): Omit<SessionPayload, "exp"> | null {
  const user = getStore().users.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
  );
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    stage: "profile",
  };
}

/**
 * Memverifikasi PIN sebuah profil milik akun yang sedang masuk.
 *
 * Mengembalikan profil bila cocok. Profil tanpa PIN langsung lolos.
 */
export function unlockProfile(
  accountId: string,
  profileId: string,
  pin: string,
): Profile | null {
  const profile = profileById(profileId);
  if (!profile) return null;
  if (profile.accountId !== accountId) return null;
  if (!profile.pinHash) return profile;
  return verifyPin(pin, profile.pinHash) ? profile : null;
}

/**
 * Menentukan workspace awal setelah profil dipilih.
 *
 * Prioritas: workspace bersama bila ada (itu yang biasanya dipakai bersama),
 * selain itu ruang pribadi. Bisa diganti setelah masuk lewat pemilih ruang.
 */
export function defaultWorkspaceFor(profileId: string): string | undefined {
  const workspaces = workspacesForProfile(profileId);
  const shared = workspaces.find((workspace) => workspace.type === "shared");
  return shared?.id ?? personalWorkspaceOf(profileId)?.id ?? workspaces[0]?.id;
}

/** Profil yang bisa dipilih untuk sebuah akun. */
export function selectableProfiles(accountId: string): Profile[] {
  return profilesForAccount(accountId);
}

/** Validasi bahwa sebuah workspace boleh dibuka oleh profil. */
export function canOpenWorkspace(profileId: string, workspaceId: string): boolean {
  return Boolean(workspaceById(workspaceId)) && isWorkspaceMember(workspaceId, profileId);
}

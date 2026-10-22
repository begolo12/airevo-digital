import "server-only";

import { MAX_SHARED_WORKSPACES } from "./types";
import type { Profile, Workspace, WorkspaceMember } from "./types";
import { getStore } from "./store";

/* -------------------------------- profil --------------------------------- */

export function profileById(id?: string): Profile | undefined {
  return id ? getStore().profiles.find((profile) => profile.id === id) : undefined;
}

export function profilesForAccount(accountId: string): Profile[] {
  return getStore().profiles.filter((profile) => profile.accountId === accountId);
}

export function profileInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

/* ------------------------------- workspace ------------------------------- */

export function workspaceById(id?: string): Workspace | undefined {
  return id ? getStore().workspaces.find((workspace) => workspace.id === id) : undefined;
}

export function workspaceMembersOf(workspaceId: string): WorkspaceMember[] {
  return getStore().workspaceMembers.filter(
    (member) => member.workspaceId === workspaceId,
  );
}

/** Semua workspace yang bisa dibuka sebuah profil. */
export function workspacesForProfile(profileId: string): Workspace[] {
  const store = getStore();
  const ids = new Set(
    store.workspaceMembers
      .filter((member) => member.profileId === profileId)
      .map((member) => member.workspaceId),
  );
  return store.workspaces.filter((workspace) => ids.has(workspace.id));
}

/** Ruang pribadi sebuah profil. Dibuat saat profil dibuat. */
export function personalWorkspaceOf(profileId: string): Workspace | undefined {
  return getStore().workspaces.find(
    (workspace) =>
      workspace.type === "personal" && workspace.ownerProfileId === profileId,
  );
}

/** Workspace bersama yang diikuti sebuah profil. */
export function sharedWorkspacesOf(profileId: string): Workspace[] {
  return workspacesForProfile(profileId).filter(
    (workspace) => workspace.type === "shared",
  );
}

/** Apakah profil masih boleh membuat workspace bersama baru. */
export function canCreateSharedWorkspace(profileId: string): boolean {
  return sharedWorkspacesOf(profileId).length < MAX_SHARED_WORKSPACES;
}

export function isWorkspaceMember(workspaceId: string, profileId: string): boolean {
  return getStore().workspaceMembers.some(
    (member) =>
      member.workspaceId === workspaceId && member.profileId === profileId,
  );
}

export function workspaceRole(
  workspaceId: string,
  profileId: string,
): WorkspaceMember["role"] | null {
  const member = getStore().workspaceMembers.find(
    (item) => item.workspaceId === workspaceId && item.profileId === profileId,
  );
  return member?.role ?? null;
}

/** Profil lain yang ikut dalam sebuah workspace. */
export function workspaceCompanions(
  workspaceId: string,
  excludeProfileId?: string,
): Profile[] {
  const store = getStore();
  const ids = new Set(
    store.workspaceMembers
      .filter(
        (member) =>
          member.workspaceId === workspaceId &&
          member.profileId !== excludeProfileId,
      )
      .map((member) => member.profileId),
  );
  return store.profiles.filter((profile) => ids.has(profile.id));
}

export function workspaceInviteCode(workspace: Workspace): string | undefined {
  return workspace.type === "shared" ? workspace.inviteCode : undefined;
}

export function findWorkspaceByInviteCode(code: string): Workspace | undefined {
  const normalized = code.trim().toUpperCase();
  return getStore().workspaces.find(
    (workspace) =>
      workspace.type === "shared" &&
      workspace.inviteCode?.toUpperCase() === normalized,
  );
}

/* ------------------------------ atribusi --------------------------------- */

/** Nama profil yang mencatat sebuah entri, untuk ditampilkan di UI. */
export function recorderName(profileId?: string): string | undefined {
  if (!profileId) return undefined;
  return profileById(profileId)?.name;
}

export function recorderProfile(profileId?: string): Profile | undefined {
  return profileById(profileId);
}

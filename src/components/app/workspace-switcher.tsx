"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { switchProfileAction, switchWorkspaceAction } from "@/lib/data/actions";

type WorkspaceOption = {
  id: string;
  name: string;
  type: "personal" | "shared";
  color: string;
  memberCount: number;
};

const colorDot: Record<string, string> = {
  butter: "bg-butter-deep",
  plum: "bg-plum",
  sky: "bg-sky-deep",
  mint: "bg-mint-deep",
  tomato: "bg-tomato",
};

/**
 * Pemilih ruang + profil di puncak sidebar.
 *
 * Menjawab satu pertanyaan yang sering muncul: "saya sedang mencatat di ruang
 * siapa?". Ruang aktif ditampilkan besar; ruang lain dan profil lain ada di
 * dalam menu.
 */
export function WorkspaceSwitcher({
  profileName,
  profileInitial,
  profileColor,
  activeWorkspaceId,
  workspaces,
  otherProfiles,
}: {
  profileName: string;
  profileInitial: string;
  profileColor: string;
  activeWorkspaceId: string;
  workspaces: WorkspaceOption[];
  otherProfiles: { id: string; name: string; initial: string; color: string }[];
}) {
  const pathname = usePathname();
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;

  const active = workspaces.find((workspace) => workspace.id === activeWorkspaceId);
  const personal = workspaces.filter((workspace) => workspace.type === "personal");
  const shared = workspaces.filter((workspace) => workspace.type === "shared");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpenAt(open ? null : pathname)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-[9px] border border-line-strong bg-card px-2 py-1.5 text-left transition-colors hover:border-ink/30 hover:bg-paper"
      >
        {/*
          Tujuan tombol ditambahkan sebagai teks tersembunyi, bukan lewat
          `aria-label`. `aria-label` yang berbeda dari teks terlihat melanggar
          aturan `label-content-name-mismatch`: pengguna pembaca layar yang
          mengandalkan suara tidak bisa mencocokkan apa yang didengar dengan
          apa yang tertulis di layar.
        */}
        <span className="sr-only">Ganti ruang atau profil: </span>
        <span
          aria-hidden="true"
          className={cx(
            "grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-ink/15 text-xs font-black",
            colorDot[profileColor] ? `${colorDot[profileColor]}/70` : "bg-butter",
          )}
        >
          {profileInitial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-bold leading-tight">
            {active?.name ?? "Ruang"}
          </span>
          <span className="block truncate text-2xs leading-tight text-muted">
            {profileName}
            {active?.type === "shared"
              ? ` · ${active.memberCount} anggota`
              : " · pribadi"}
          </span>
        </span>
        <Icon
          name="chevron-down"
          size={12}
          className={cx("shrink-0 text-muted transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div className="animate-rise absolute left-0 right-0 top-full z-30 mt-1.5 max-h-[70vh] overflow-y-auto rounded-[14px] border border-line-strong bg-card p-1.5 shadow-[var(--shadow-lift)]">
          {shared.length > 0 ? (
            <>
              <p className="label-eyebrow px-2.5 pb-1 pt-1">Ruang bersama</p>
              {shared.map((workspace) => (
                <form key={workspace.id} action={switchWorkspaceAction}>
                  <input type="hidden" name="workspaceId" value={workspace.id} />
                  <button
                    type="submit"
                    className="menu-item"
                    data-highlighted={
                      workspace.id === activeWorkspaceId ? "true" : undefined
                    }
                  >
                    <span
                      aria-hidden="true"
                      className={cx(
                        "h-2.5 w-2.5 shrink-0 rounded-full",
                        colorDot[workspace.color] ?? "bg-line-strong",
                      )}
                    />
                    <span className="truncate">{workspace.name}</span>
                    <span className="ml-auto shrink-0 text-2xs text-muted">
                      {workspace.memberCount}
                    </span>
                  </button>
                </form>
              ))}
            </>
          ) : null}

          {personal.length > 0 ? (
            <>
              <p className="label-eyebrow px-2.5 pb-1 pt-2">Ruang pribadi</p>
              {personal.map((workspace) => (
                <form key={workspace.id} action={switchWorkspaceAction}>
                  <input type="hidden" name="workspaceId" value={workspace.id} />
                  <button
                    type="submit"
                    className="menu-item"
                    data-highlighted={
                      workspace.id === activeWorkspaceId ? "true" : undefined
                    }
                  >
                    <span
                      aria-hidden="true"
                      className={cx(
                        "h-2.5 w-2.5 shrink-0 rounded-full",
                        colorDot[workspace.color] ?? "bg-line-strong",
                      )}
                    />
                    <span className="truncate">{workspace.name}</span>
                  </button>
                </form>
              ))}
            </>
          ) : null}

          <div className="my-1 h-px bg-line" />

          <p className="label-eyebrow px-2.5 pb-1 pt-1">Profil</p>
          {otherProfiles.length === 0 ? (
            <p className="px-2.5 py-1 text-xs text-muted">Tidak ada profil lain.</p>
          ) : (
            <form action={switchProfileAction}>
              <button type="submit" className="menu-item">
                <Icon name="users" size={14} className="opacity-70" />
                Ganti profil
                <span className="ml-auto shrink-0 text-2xs text-muted">
                  {otherProfiles.length + 1}
                </span>
              </button>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { cx } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import {
  bottomNavItems,
  defaultCollapsedGroups,
  groupIdForPath,
  isNavActive,
  navGroupsFor,
  type NavGroup,
} from "@/config/app-nav";
import { logoutAction } from "@/lib/data/actions";
import { openCommandPalette } from "./command-palette";
import { WorkspaceSwitcher } from "./workspace-switcher";

const STORAGE_KEY = "airevo:nav-collapsed";

/* --------------------------------------------------------------------------
 * Status lipatan grup disimpan di localStorage.
 *
 * Dibaca lewat `useSyncExternalStore`, bukan efek, karena localStorage adalah
 * sistem eksternal: cara ini menghindari render berantai dan tetap aman saat
 * hidrasi (server memakai snapshot kosong).
 * ------------------------------------------------------------------------ */

const listeners = new Set<() => void>();

function readCollapsed(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeCollapsed(value: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // localStorage bisa diblokir; abaikan
  }
  listeners.forEach((listener) => listener());
}

function subscribeCollapsed(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function serverSnapshot() {
  return "";
}

function useCollapsedGroups(activeGroupId: string | null): [Record<string, boolean>, (id: string) => void] {
  const raw = useSyncExternalStore(subscribeCollapsed, readCollapsed, serverSnapshot);

  /**
   * Status lipatan.
   *
   * Saat pertama kali dibuka (`raw` kosong), semua grup terlipat kecuali yang
   * memuat halaman aktif. Setelah pengguna mengubahnya, pilihan itu yang dipakai.
   */
  const collapsed = useMemo(() => {
    if (!raw) return defaultCollapsedGroups(activeGroupId);
    try {
      return JSON.parse(raw) as Record<string, boolean>;
    } catch {
      return defaultCollapsedGroups(activeGroupId);
    }
  }, [raw, activeGroupId]);

  const toggle = useCallback(
    (id: string) => {
      const current = (() => {
        try {
          const parsed = JSON.parse(readCollapsed() || "null") as Record<
            string,
            boolean
          > | null;
          return parsed ?? defaultCollapsedGroups(activeGroupId);
        } catch {
          return defaultCollapsedGroups(activeGroupId);
        }
      })();
      writeCollapsed(JSON.stringify({ ...current, [id]: !current[id] }));
    },
    [activeGroupId],
  );

  return [collapsed, toggle];
}

const roleLabel: Record<string, string> = {
  owner: "Pemilik",
  adult: "Dewasa",
  teen: "Remaja",
  child: "Anak",
  viewer: "Pengamat",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

/**
 * Sidebar aplikasi.
 *
 * Perbaikan dibanding versi sebelumnya:
 * - ikon per menu agar terbaca cepat
 * - grup bisa dilipat, status tersimpan di localStorage
 * - pencarian cepat (⌘K) di atas, karena 19 halaman terlalu banyak untuk dipindai
 * - penanda aktif memakai batang kiri, bukan blok penuh, agar tidak ramai
 * - menu pengguna bisa dibuka, tidak lagi tombol "Keluar" telanjang
 */
export function AppSidebar({
  householdName,
  userName,
  role,
  profileInitial,
  profileColor,
  activeWorkspaceId,
  workspaces,
  otherProfiles,
}: {
  householdName: string;
  userName: string;
  role: string;
  profileInitial: string;
  profileColor: string;
  activeWorkspaceId: string;
  workspaces: {
    id: string;
    name: string;
    type: "personal" | "shared";
    color: string;
    memberCount: number;
  }[];
  otherProfiles: { id: string; name: string; initial: string; color: string }[];
}) {
  const pathname = usePathname();

  const groups = useMemo(() => navGroupsFor(role), [role]);
  const activeGroupId = useMemo(() => groupIdForPath(pathname, role), [pathname, role]);
  const [collapsed, toggleGroup] = useCollapsedGroups(activeGroupId);

  // Drawer dan menu pengguna menyimpan path saat dibuka, sehingga otomatis
  // tertutup ketika pathname berubah — tanpa perlu efek.
  const [drawerAt, setDrawerAt] = useState<string | null>(null);
  const [userMenuAt, setUserMenuAt] = useState<string | null>(null);
  const mobileOpen = drawerAt === pathname;
  const userOpen = userMenuAt === pathname;

  // Cegah scroll di belakang drawer (hanya menyentuh DOM, bukan state).
  useEffect(() => {
    if (!mobileOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileOpen]);

  function renderGroup(group: NavGroup) {
    // Grup yang memuat halaman aktif selalu terbuka.
    const isCollapsed = Boolean(collapsed[group.id]) && activeGroupId !== group.id;
    const isActiveGroup = activeGroupId === group.id;

    return (
      <div key={group.id}>
        <button
          type="button"
          onClick={() => toggleGroup(group.id)}
          aria-expanded={!isCollapsed}
          className="group/head flex w-full items-center gap-1.5 rounded-[7px] px-2.5 py-1.5 text-left transition-colors hover:bg-paper-deep/70"
        >
          <span
            className={cx(
              "flex-1 text-2xs font-bold uppercase tracking-[0.14em] transition-colors",
              isActiveGroup
                ? "text-ink"
                : "text-muted group-hover/head:text-ink-soft",
            )}
          >
            {group.title}
          </span>

          {/*
            Saat terlipat, jumlah menu ditampilkan sebagai angka kecil supaya
            grup terasa "berisi" tanpa harus dibuka dulu.
          */}
          {isCollapsed ? (
            <span className="shrink-0 rounded-full bg-paper-deep/90 px-1.5 text-2xs font-bold leading-[15px] text-muted">
              {group.items.length}
            </span>
          ) : null}

          <Icon
            name="chevron-down"
            size={11}
            className={cx(
              "shrink-0 text-muted/70 transition-transform duration-200",
              isCollapsed && "-rotate-90",
            )}
          />
        </button>

        {isCollapsed ? null : (
          <ul className="mt-0.5 space-y-px">
            {group.items.map((item) => {
              const active = isNavActive(pathname, item);
              return (
                <li key={item.href} className="relative">
                  {active ? (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-full bg-tomato"
                    />
                  ) : null}
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "group/item flex items-center gap-2.5 rounded-[8px] py-[6px] pl-3 pr-2 text-base transition-colors",
                      active
                        ? "bg-card font-bold text-ink shadow-[0_1px_2px_rgba(35,32,29,0.06)]"
                        : "font-medium text-ink-soft hover:bg-paper-deep/60 hover:text-ink",
                    )}
                  >
                    <Icon
                      name={item.icon}
                      size={15}
                      className={cx(
                        "shrink-0 transition-colors",
                        active
                          ? "text-tomato"
                          : "text-muted/80 group-hover/item:text-ink-soft",
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                    {item.badge ? (
                      <span className="ml-auto rounded-full bg-tomato/15 px-1.5 text-2xs font-bold text-tomato-ink tnum">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  const searchButton = (
    <button
      type="button"
      onClick={openCommandPalette}
      className="flex w-full items-center gap-2 rounded-[9px] border border-line-strong bg-card px-2.5 py-[7px] text-left transition-colors hover:border-ink/30 hover:bg-paper"
    >
      <Icon name="search" size={14} className="shrink-0 text-muted" />
      <span className="flex-1 text-base font-medium text-muted">Cari…</span>
      <kbd className="shrink-0 rounded border border-line-strong bg-paper-deep px-1 py-0.5 text-2xs font-bold leading-none text-muted">
        ⌘K
      </kbd>
    </button>
  );

  const userMenu = (
    <div className="relative">
      <button
        type="button"
        onClick={() => setUserMenuAt(userOpen ? null : pathname)}
        aria-expanded={userOpen}
        className="flex w-full items-center gap-2 rounded-[9px] px-2 py-1.5 text-left transition-colors hover:bg-paper-deep/70"
      >
        <span
          aria-hidden="true"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line-strong bg-butter text-2xs font-black text-ink"
        >
          {initials(userName)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-bold leading-tight">
            {userName}
          </span>
          <span className="block text-xs leading-tight text-muted">
            {roleLabel[role] ?? role}
          </span>
        </span>
        <Icon
          name="chevron-down"
          size={12}
          className={cx(
            "shrink-0 text-muted transition-transform",
            userOpen && "rotate-180",
          )}
        />
      </button>

      {userOpen ? (
        <div className="animate-rise surface absolute bottom-full left-0 right-0 z-20 mb-1.5 p-1.5">
          <Link href="/keluarga/pengaturan" className="menu-item">
            <Icon name="settings" size={14} className="opacity-70" />
            Pengaturan
          </Link>
          {role === "owner" ? (
            <Link href="/admin/pesanan" className="menu-item">
              <Icon name="package" size={14} className="opacity-70" />
              Pesanan
            </Link>
          ) : null}
          <Link href="/aplikasi" className="menu-item">
            <Icon name="grid" size={14} className="opacity-70" />
            Semua aplikasi
          </Link>
          <div className="my-1 h-px bg-line" />
          <form action={logoutAction}>
            <button type="submit" className="menu-item" data-danger="true">
              <Icon name="logout" size={14} />
              Keluar
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen w-[15.5rem] shrink-0 flex-col overflow-hidden border-r border-line bg-paper-deep/45 lg:flex">
        {/*
          `relative z-40` penting: dropdown pemilih ruang harus menutupi daftar
          menu di bawahnya. Tanpa konteks stacking di sini, menu yang datang
          belakangan di DOM akan menembus dropdown.
        */}
        <div className="relative z-40 shrink-0 px-3 pb-2.5 pt-4">
          <Link href="/keluarga" className="mb-2.5 flex items-center gap-2 px-1">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[7px] border border-ink bg-butter text-2xs font-black shadow-[2px_2px_0_0_var(--color-ink)]">
              K
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold leading-tight">
                {householdName}
              </span>
              <span className="block text-2xs leading-tight text-muted">
                Aplikasi Keluarga
              </span>
            </span>
          </Link>

          <WorkspaceSwitcher
            profileName={userName}
            profileInitial={profileInitial}
            profileColor={profileColor}
            activeWorkspaceId={activeWorkspaceId}
            workspaces={workspaces}
            otherProfiles={otherProfiles}
          />

          <div className="mt-2">{searchButton}</div>
        </div>

        <nav
          aria-label="Navigasi aplikasi"
          className="scroll-thin min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-2"
        >
          {groups.map(renderGroup)}
        </nav>

        {/* Menu pengguna juga perlu konteks stacking sendiri. */}
        <div className="relative z-40 shrink-0 border-t border-line px-2 py-1.5">
          {userMenu}
        </div>
      </aside>

      {/* Top bar mobile */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-line bg-paper/95 px-3 backdrop-blur lg:hidden">
        <Link href="/keluarga" className="flex min-w-0 items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] border border-ink bg-butter text-xs font-black">
            K
          </span>
          <span className="truncate text-sm font-bold">{householdName}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={openCommandPalette}
            aria-label="Cari halaman"
            className="grid h-9 w-9 place-items-center rounded-full border border-line-strong bg-card text-ink-soft"
          >
            <Icon name="search" size={16} />
          </button>
          <button
            type="button"
            onClick={() => setDrawerAt(pathname)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label="Buka menu"
            className="grid h-9 w-9 place-items-center rounded-full border border-line-strong bg-card text-ink"
          >
            <Icon name="menu" size={17} />
          </button>
        </div>
      </div>

      {/* Drawer mobile */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="animate-fade absolute inset-0 bg-scrim/55 backdrop-blur-[2px]"
            onClick={() => setDrawerAt(null)}
          />
          <div
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Menu aplikasi"
            className="animate-rise absolute inset-y-0 left-0 flex w-[17rem] max-w-[85vw] flex-col bg-paper-deep"
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-3 py-3">
              <span className="truncate text-sm font-bold">{householdName}</span>
              <button
                type="button"
                onClick={() => setDrawerAt(null)}
                aria-label="Tutup menu"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line-strong bg-card text-ink"
              >
                <Icon name="close" size={15} />
              </button>
            </div>

            <div className="relative z-40 shrink-0 px-3 py-2.5">
              <WorkspaceSwitcher
                profileName={userName}
                profileInitial={profileInitial}
                profileColor={profileColor}
                activeWorkspaceId={activeWorkspaceId}
                workspaces={workspaces}
                otherProfiles={otherProfiles}
              />
              <div className="mt-2">{searchButton}</div>
            </div>

            <nav
              aria-label="Navigasi aplikasi"
              className="scroll-thin min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3"
            >
              {groups.map(renderGroup)}
            </nav>

            <div className="relative z-40 shrink-0 border-t border-line px-2 py-2">{userMenu}</div>
          </div>
        </div>
      ) : null}

      {/* Bottom nav mobile */}
      <nav
        aria-label="Navigasi cepat"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {bottomNavItems.map((item) => {
          const active = isNavActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "flex flex-col items-center gap-1 py-2 text-2xs font-semibold transition-colors",
                active ? "text-ink" : "text-muted",
              )}
            >
              <Icon
                name={item.icon}
                size={18}
                className={active ? "text-tomato" : "text-muted"}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}



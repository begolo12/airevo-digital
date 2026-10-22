"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cx } from "@/components/ui";
import { Icon, type IconName } from "@/components/ui/icon";
import { flatNav, type NavItem } from "@/config/app-nav";

const OPEN_EVENT = "airevo:open-command";

/** Membuka command palette dari komponen lain (mis. tombol di sidebar). */
export function openCommandPalette() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OPEN_EVENT));
  }
}

type Entry = {
  id: string;
  label: string;
  hint?: string;
  href: string;
  icon: IconName;
  group: string;
  keywords: string[];
};

function buildEntries(role: string): Entry[] {
  const nav = flatNav(role).map<Entry>((item: NavItem) => ({
    id: `nav-${item.href}`,
    label: item.label,
    href: item.href,
    icon: item.icon,
    group: "Navigasi",
    keywords: item.keywords ?? [],
  }));

  const shortcuts: Entry[] = [
    {
      id: "act-catat",
      label: "Catat transaksi baru",
      hint: "Buka form transaksi",
      href: "/keluarga/keuangan/transaksi",
      icon: "plus",
      group: "Aksi cepat",
      keywords: ["tambah", "baru", "pengeluaran", "pemasukan"],
    },
    {
      id: "act-bayar",
      label: "Lihat tagihan jatuh tempo",
      hint: "Tagihan yang perlu dibayar",
      href: "/keluarga/keuangan/tagihan",
      icon: "calendar",
      group: "Aksi cepat",
      keywords: ["bayar", "listrik", "internet", "tempo"],
    },
    {
      id: "act-belanja",
      label: "Buka daftar belanja",
      href: "/keluarga/belanja",
      icon: "cart",
      group: "Aksi cepat",
      keywords: ["belanja", "pasar"],
    },
  ];

  return [...shortcuts, ...nav];
}

function score(entry: Entry, query: string): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  const label = entry.label.toLowerCase();

  if (label === q) return 100;
  if (label.startsWith(q)) return 80;
  if (label.includes(q)) return 60;
  if (entry.group.toLowerCase().includes(q)) return 40;
  if (entry.keywords.some((keyword) => keyword.includes(q))) return 30;
  if (entry.hint?.toLowerCase().includes(q)) return 20;
  return 0;
}

/**
 * Command palette (⌘K / Ctrl+K).
 *
 * Memberi satu pintu untuk semua halaman tanpa harus menghafal struktur menu.
 * Pencarian mencocokkan label, nama grup, dan kata kunci bahasa sehari-hari
 * ("listrik" menemukan Tagihan).
 */
/**
 * Tujuan pintasan `g` + huruf.
 *
 * Dua ketukan, bukan satu, karena satu huruf akan bentrok dengan pengetikan
 * biasa di kolom isian.
 */
const GO_TO: Record<string, string> = {
  d: "/keluarga",
  t: "/keluarga/keuangan/transaksi",
  a: "/keluarga/keuangan/anggaran",
  b: "/keluarga/keuangan/tagihan",
  u: "/keluarga/keuangan/utang",
  r: "/keluarga/rencana",
  k: "/keluarga/kalender",
  g: "/keluarga/tugas",
  n: "/keluarga/belanja",
  o: "/keluarga/dokumen",
  l: "/keluarga/laporan",
  p: "/keluarga/pengaturan",
};

export function CommandPalette({ role }: { role: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const router = useRouter();

  const entries = useMemo(() => buildEntries(role), [role]);

  const results = useMemo(() => {
    return entries
      .map((entry) => ({ entry, value: score(entry, query.trim()) }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .map((item) => item.entry);
  }, [entries, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setHighlight(0);
  }, []);

  /*
   * Pintasan global.
   *
   * Dua kelompok:
   *
   * - `⌘K` / `Ctrl+K` — buka palette.
   * - `g` lalu huruf — lompat ke halaman utama (ala Gmail/GitHub). Dua ketukan
   *   karena satu huruf saja akan bentrok dengan pengetikan di kolom isian.
   *
   * Semua pintasan diabaikan saat fokus berada di kolom isian, kecuali `⌘K`
   * yang justru paling dibutuhkan di sana.
   */
  useEffect(() => {
    // Penanda "g" baru saja ditekan, menunggu huruf kedua.
    let pendingG = false;
    let pendingTimer: number | undefined;

    function isTyping(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable
      );
    }

    function onKeyDown(event: KeyboardEvent) {
      const isPaletteKey =
        (event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey);
      if (isPaletteKey) {
        event.preventDefault();
        setOpen((current) => !current);
        return;
      }

      if (event.key === "Escape" && open) {
        event.preventDefault();
        close();
        return;
      }

      // Jangan bajak pengetikan biasa.
      if (isTyping(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const key = event.key.toLowerCase();

      if (pendingG) {
        const destination = GO_TO[key];
        pendingG = false;
        if (pendingTimer) window.clearTimeout(pendingTimer);

        if (destination) {
          event.preventDefault();
          router.push(destination);
        }
        return;
      }

      if (key === "g") {
        pendingG = true;
        // Setelah 1,2 detik tanpa huruf kedua, batalkan.
        pendingTimer = window.setTimeout(() => {
          pendingG = false;
        }, 1200);
        return;
      }

      // `/` memfokuskan pencarian di halaman yang punya kolom cari.
      if (key === "/") {
        const search = document.querySelector<HTMLInputElement>(
          'input[name="q"], input[type="search"]',
        );
        if (search) {
          event.preventDefault();
          search.focus();
        }
        return;
      }

      // `?` membuka daftar pintasan.
      if (event.key === "?") {
        event.preventDefault();
        setOpen(true);
      }
    }

    function onOpenEvent() {
      setOpen(true);
    }

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_EVENT, onOpenEvent);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_EVENT, onOpenEvent);
      if (pendingTimer) window.clearTimeout(pendingTimer);
    };
  }, [open, close, router]);

  useEffect(() => {
    if (open) {
      // Fokus setelah paint agar animasi tidak terputus.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Jaga item terpilih tetap terlihat.
  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${highlight}"]`,
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  function go(entry: Entry) {
    close();
    router.push(entry.href);
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((current) => (current + 1) % Math.max(results.length, 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight(
        (current) => (current - 1 + results.length) % Math.max(results.length, 1),
      );
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const entry = results[highlight];
      if (entry) go(entry);
    }
  }

  if (!open) return null;

  // Kelompokkan hasil sesuai urutan grup.
  const grouped = results.reduce<Record<string, Entry[]>>((acc, entry) => {
    acc[entry.group] = acc[entry.group] ?? [];
    acc[entry.group].push(entry);
    return acc;
  }, {});

  let runningIndex = -1;

  return (
    <div
      className="animate-fade fixed inset-0 z-[95] flex items-start justify-center bg-scrim/55 px-4 pt-[12vh] backdrop-blur-[2px]"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pencarian cepat"
        onClick={(event) => event.stopPropagation()}
        className="animate-rise surface w-full max-w-lg overflow-hidden p-0"
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <Icon name="search" size={16} className="shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              // Reset pilihan di handler, bukan di efek.
              setHighlight(0);
            }}
            onKeyDown={onInputKeyDown}
            placeholder="Cari halaman atau aksi…"
            aria-label="Cari halaman atau aksi"
            className="h-6 w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted/80"
          />
          <kbd className="hidden shrink-0 rounded border border-line-strong bg-paper-deep px-1.5 py-0.5 text-2xs font-bold text-muted sm:block">
            ESC
          </kbd>
        </div>

        <ul ref={listRef} role="listbox" className="max-h-[52vh] overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-muted">
              Tidak ada yang cocok dengan “{query}”.
            </li>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <li key={group}>
                <p className="label-eyebrow px-2.5 pb-1 pt-2">{group}</p>
                <ul>
                  {items.map((entry) => {
                    runningIndex += 1;
                    const index = runningIndex;
                    const active = index === highlight;
                    return (
                      <li key={entry.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          data-index={index}
                          data-highlighted={active ? "true" : undefined}
                          onMouseEnter={() => setHighlight(index)}
                          onClick={() => go(entry)}
                          className={cx("menu-item", active && "bg-paper-deep text-ink")}
                        >
                          <Icon
                            name={entry.icon}
                            size={15}
                            className="shrink-0 opacity-70"
                          />
                          <span className="truncate">{entry.label}</span>
                          {entry.hint ? (
                            <span className="ml-auto shrink-0 truncate pl-2 text-xs font-medium text-muted">
                              {entry.hint}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))
          )}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-line bg-paper-deep/40 px-4 py-2 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-line-strong bg-card px-1 py-0.5 font-bold">↑↓</kbd>
            pilih
            <kbd className="ml-1.5 rounded border border-line-strong bg-card px-1 py-0.5 font-bold">↵</kbd>
            buka
            {/*
              Petunjuk pintasan ditampilkan di sini supaya pengguna menemukannya
              tanpa harus tahu lebih dulu — pintasan yang tidak diketahui sama
              saja tidak ada.
            */}
            <kbd className="ml-1.5 rounded border border-line-strong bg-card px-1 py-0.5 font-bold">
              g
            </kbd>
            lalu huruf
          </span>
          <span>{results.length} hasil</span>
        </div>
      </div>
    </div>
  );
}
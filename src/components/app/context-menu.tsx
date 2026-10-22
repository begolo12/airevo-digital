"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import type { ActionResult } from "@/lib/data/types";
import { Icon } from "@/components/ui/icon";

type ServerAction = (formData: FormData) => Promise<ActionResult | void>;

export type ContextMenuItem =
  | {
      kind: "action";
      label: string;
      action: ServerAction;
      fields?: Record<string, string | number | undefined>;
      danger?: boolean;
      /** Teks konfirmasi. Bila diisi, dialog in-app muncul lebih dulu. */
      confirm?: string;
      confirmDescription?: string;
      icon?: ReactNode;
      /**
       * Aksi pembalik yang ditawarkan di toast setelah aksi utama berhasil.
       *
       * Menu klik-kanan dipakai untuk aksi yang jarang dan berisiko — justru
       * di situ kesalahan klik paling mahal. Tanpa jalur kembali, satu salah
       * pilih memaksa mencatat ulang dari awal.
       */
      undoAction?: ServerAction;
      undoLabel?: string;
    }
  | { kind: "link"; label: string; href: string; icon?: ReactNode }
  | { kind: "copy"; label: string; value: string; message?: string; icon?: ReactNode }
  | { kind: "separator" }
  | { kind: "label"; text: string };

const VIEWPORT_MARGIN = 8;

type ContextMenuProps = {
  items: ContextMenuItem[];
  children: ReactNode;
  /**
   * Elemen yang dirender. **Komponen ini yang merender elemennya sendiri**,
   * bukan membungkus anak, karena `<tr>` tidak boleh berada di dalam `<div>`
   * dan `cloneElement` tidak aman untuk elemen yang datang dari server component.
   */
  as?: "tr" | "li" | "div";
  className?: string;
  disabled?: boolean;
};

/**
 * Menu klik-kanan milik aplikasi.
 *
 * Contoh:
 *   <ContextMenu as="tr" items={[...]} className="row-interactive">
 *     <td>…</td>
 *   </ContextMenu>
 *
 * Menu dirender lewat portal ke `document.body` supaya tidak terpotong
 * `overflow: hidden` pada tabel atau kartu.
 */
export function ContextMenu({
  items,
  children,
  as = "div",
  className,
  disabled,
}: ContextMenuProps) {
  const [open, setOpen] = useState(false);
  const [point, setPoint] = useState({ x: 0, y: 0 });
  const [highlight, setHighlight] = useState(-1);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();

  // Portal hanya bisa dirender di klien; tidak perlu state tambahan.
  const canPortal = typeof document !== "undefined";

  const actionable = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.kind !== "separator" && item.kind !== "label");

  const close = useCallback(() => {
    setOpen(false);
    setHighlight(-1);
  }, []);

  const onContextMenu = useCallback(
    (event: React.MouseEvent) => {
      if (disabled || items.length === 0) return;
      event.preventDefault();
      setPoint({ x: event.clientX, y: event.clientY });
      setOpen(true);
      setHighlight(-1);
    },
    [disabled, items.length],
  );

  // Jaga menu tetap di dalam viewport.
  useLayoutEffect(() => {
    if (!open) return;
    const node = menuRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - VIEWPORT_MARGIN;
    const maxY = window.innerHeight - rect.height - VIEWPORT_MARGIN;

    setPoint((current) => ({
      x: Math.min(Math.max(current.x, VIEWPORT_MARGIN), Math.max(maxX, VIEWPORT_MARGIN)),
      y: Math.min(Math.max(current.y, VIEWPORT_MARGIN), Math.max(maxY, VIEWPORT_MARGIN)),
    }));
  }, [open]);

  async function run(item: ContextMenuItem) {
    if (item.kind === "separator" || item.kind === "label") return;

    if (item.kind === "copy") {
      try {
        await navigator.clipboard.writeText(item.value);
        toast.success(item.message ?? "Disalin ke clipboard", item.value);
      } catch {
        toast.error("Gagal menyalin", "Browser menolak akses clipboard.");
      }
      close();
      return;
    }

    if (item.kind === "link") {
      close();
      router.push(item.href);
      return;
    }

    close();
    if (item.confirm) {
      const ok = await confirm({
        title: item.confirm,
        description: item.confirmDescription,
        tone: item.danger ? "danger" : "default",
        confirmLabel: item.danger ? "Hapus" : "Lanjutkan",
      });
      if (!ok) return;
    }

    const formData = new FormData();
    for (const [key, value] of Object.entries(item.fields ?? {})) {
      if (value !== undefined) formData.append(key, String(value));
    }

    startTransition(async () => {
      try {
        const result = await item.action(formData);
        if (result && typeof result === "object" && "ok" in result) {
          if (result.ok) {
            /*
             * Aksi pembalik ditawarkan di toast, bukan langsung dijalankan.
             *
             * Hanya ditawarkan bila aksi utama benar-benar berhasil — kalau
             * gagal, tidak ada yang perlu dibatalkan dan tombol "Urungkan"
             * hanya akan membingungkan.
             */
            const undo = item.undoAction;
            if (undo) {
              toast.toast({
                title: result.message ?? "Tersimpan",
                tone: "success",
                duration: 6000,
                action: {
                  label: item.undoLabel ?? "Urungkan",
                  onClick: () => {
                    startTransition(async () => {
                      const undoData = new FormData();
                      for (const [key, value] of Object.entries(item.fields ?? {})) {
                        if (value !== undefined) undoData.append(key, String(value));
                      }

                      const undone = await undo(undoData);
                      if (undone && typeof undone === "object" && "ok" in undone) {
                        if (undone.ok) {
                          toast.success(undone.message ?? "Dibatalkan");
                        } else {
                          toast.error(undone.message ?? "Gagal membatalkan");
                        }
                      }
                      router.refresh();
                    });
                  },
                },
              });
            } else {
              toast.success(result.message ?? "Tersimpan");
            }
          } else {
            toast.error(result.message ?? "Gagal diproses");
          }
        }
        router.refresh();
      } catch {
        toast.error("Gagal memproses", "Coba lagi sebentar lagi.");
      }
    });
  }

  // Keyboard dan klik di luar hanya aktif saat menu terbuka.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) close();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (actionable.length === 0) return;
        const step = event.key === "ArrowDown" ? 1 : -1;
        setHighlight((current) => {
          const next = current + step;
          if (next < 0) return actionable.length - 1;
          if (next >= actionable.length) return 0;
          return next;
        });
      }
      if (event.key === "Enter" && highlight >= 0) {
        event.preventDefault();
        const target = actionable[highlight];
        if (target) void run(target.item);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, close, highlight, actionable.length]);

  const Tag = as;

  return (
    <>
      <Tag onContextMenu={onContextMenu} className={className}>
        {children}
      </Tag>

      {open && canPortal
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label="Menu konteks"
              style={{ left: point.x, top: point.y }}
              className="animate-rise surface fixed z-[85] min-w-[13rem] max-w-[17rem] p-1.5"
            >
              {items.map((item, index) => {
                if (item.kind === "separator") {
                  return <div key={`sep-${index}`} className="my-1 h-px bg-line" />;
                }
                if (item.kind === "label") {
                  return (
                    <p
                      key={`label-${index}`}
                      className="label-eyebrow truncate px-2.5 py-1.5"
                    >
                      {item.text}
                    </p>
                  );
                }

                const position = actionable.findIndex((entry) => entry.index === index);
                const isHighlighted = position === highlight;

                return (
                  <button
                    key={`item-${index}`}
                    type="button"
                    role="menuitem"
                    data-danger={
                      item.kind === "action" && item.danger ? "true" : undefined
                    }
                    data-highlighted={isHighlighted ? "true" : undefined}
                    onMouseEnter={() => setHighlight(position)}
                    onClick={() => void run(item)}
                    className="menu-item"
                  >
                    <span
                      aria-hidden="true"
                      className="grid h-4 w-4 shrink-0 place-items-center opacity-70"
                    >
                      {item.icon ?? (
                        <DefaultGlyph
                          kind={item.kind}
                          danger={item.kind === "action" && item.danger}
                        />
                      )}
                    </span>
                    <span className="truncate">{item.label}</span>
                    {item.kind === "copy" ? (
                      <span className="ml-auto text-2xs font-semibold uppercase tracking-wide opacity-50">
                        salin
                      </span>
                    ) : null}
                  </button>
                );
              })}

              {pending ? (
                <p className="mt-1 border-t border-line px-2.5 pt-1.5 text-xs text-muted">
                  Memproses…
                </p>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/**
 * Ikon bawaan untuk baris menu yang tidak punya ikon sendiri.
 *
 * Semua lewat `<Icon>` agar ukuran dan ketebalan garisnya sama dengan ikon di
 * tempat lain — sebelumnya ditulis sebagai SVG inline terpisah.
 */
function DefaultGlyph({ kind, danger }: { kind: string; danger?: boolean }) {
  if (danger) return <Icon name="trash" size={13} strokeWidth={1.9} />;
  if (kind === "link") return <Icon name="external" size={13} strokeWidth={1.9} />;
  if (kind === "copy") return <Icon name="copy" size={13} strokeWidth={1.9} />;
  return <Icon name="info" size={13} strokeWidth={1.9} />;
}
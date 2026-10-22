"use client";

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { cx } from "./index";
import { Icon } from "@/components/ui/icon";

/**
 * Dialog modal milik aplikasi.
 *
 * Kenapa bukan `<dialog>` bawaan: `showModal()` harus dipanggil lewat ref
 * setelah mount, tidak bisa dikendalikan langsung oleh prop React, dan
 * animasi masuk/keluar jadi canggung. Implementasi manual di sini memberi
 * kendali penuh sambil tetap memenuhi syarat aksesibilitas:
 *
 * - `role="dialog"` + `aria-modal` + judul terhubung lewat `aria-labelledby`
 * - fokus dipindah ke isian pertama saat terbuka
 * - Tab berputar di dalam dialog (tidak bocor ke halaman di belakang)
 * - Esc menutup, klik latar menutup
 * - fokus dikembalikan ke elemen pemicu saat tertutup
 * - scroll halaman dikunci selama terbuka
 *
 * Dirender lewat portal ke `document.body` supaya tidak terpotong oleh
 * `overflow-hidden` atau konteks stacking kartu induk.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
} as const;

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  exitAnimation,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof SIZES;
  /**
   * Animasi keluar khusus.
   *
   * `receipt` membuat panel menyusut dan meluncur ke bawah seperti struk keluar
   * printer — dipakai saat transaksi tersimpan, supaya pengguna melihat bahwa
   * datanya "masuk" ke daftar, bukan sekadar dialog menghilang.
   */
  exitAnimation?: "receipt";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const close = useCallback(() => onClose(), [onClose]);

  // Fokus awal, kunci scroll, dan pemulihan fokus.
  useEffect(() => {
    if (!open) return;

    previouslyFocused.current =
      typeof document !== "undefined"
        ? (document.activeElement as HTMLElement | null)
        : null;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Beri jeda satu frame supaya panel sudah terpasang sebelum difokus.
    const timer = window.setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    }, 20);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  // Esc untuk menutup, Tab untuk berputar di dalam dialog.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      // Fokus bisa berada di luar panel (mis. setelah klik latar); tarik masuk.
      if (!panel.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, close]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="animate-fade fixed inset-0 z-[80] flex items-end justify-center bg-scrim/55 px-0 pb-0 backdrop-blur-[2px] sm:items-center sm:px-4 sm:pb-0"
      onMouseDown={(event) => {
        // Hanya klik di latar yang menutup; klik di dalam panel tidak.
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? "dialog-desc" : undefined}
        className={cx(
          "surface flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[18px] sm:rounded-[16px]",
          exitAnimation === "receipt" ? "animate-receipt" : "animate-rise",
          SIZES[size],
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 id="dialog-title" className="text-base leading-snug">
              {title}
            </h2>
            {description ? (
              <p id="dialog-desc" className="mt-1 text-base leading-relaxed text-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Tutup"
            className="-mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-paper-deep hover:text-ink"
          >
            <Icon name="close" size={15} strokeWidth={2.2} />
          </button>
        </div>

        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {footer ? (
          <div className="shrink-0 border-t border-line bg-paper-deep/30 px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

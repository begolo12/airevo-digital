"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { cx } from "./index";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};

type ConfirmApi = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmApi | null>(null);

type Pending = ConfirmOptions & { resolve: (value: boolean) => void };

/**
 * Dialog konfirmasi milik aplikasi.
 *
 * Menggantikan `window.confirm` supaya tidak ada lagi dialog browser yang
 * memutus alur dan tidak bisa digayakan. Dipakai lewat `useConfirm()`:
 *
 *   if (await confirm({ title: "Hapus?" })) { ... }
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const confirm = useCallback<ConfirmApi>(
    (options) =>
      new Promise<boolean>((resolve) => {
        previouslyFocused.current =
          typeof document !== "undefined"
            ? (document.activeElement as HTMLElement | null)
            : null;
        setPending({ ...options, resolve });
      }),
    [],
  );

  const settle = useCallback(
    (value: boolean) => {
      setPending((current) => {
        current?.resolve(value);
        return null;
      });
      // Kembalikan fokus ke elemen pemicu.
      requestAnimationFrame(() => previouslyFocused.current?.focus?.());
    },
    [],
  );

  useEffect(() => {
    if (!pending) return;
    confirmRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        settle(false);
      }
      if (event.key === "Enter") {
        event.preventDefault();
        settle(true);
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [pending, settle]);

  const tone = pending?.tone ?? "default";
  const isDanger = tone === "danger";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {pending ? (
        <div
          className="animate-fade fixed inset-0 z-[90] flex items-end justify-center bg-scrim/55 px-4 pb-4 backdrop-blur-[2px] sm:items-center sm:pb-0"
          onClick={() => settle(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby={pending.description ? "confirm-desc" : undefined}
            onClick={(event) => event.stopPropagation()}
            className="animate-rise surface w-full max-w-sm p-5"
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={cx(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black",
                  isDanger ? "bg-tomato/15 text-tomato-ink" : "bg-butter text-ink",
                )}
              >
                {isDanger ? "!" : "?"}
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="confirm-title" className="text-base leading-snug">
                  {pending.title}
                </h2>
                {pending.description ? (
                  <p id="confirm-desc" className="mt-1.5 text-base leading-relaxed text-muted">
                    {pending.description}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => settle(false)}
                className="inline-flex h-9 items-center justify-center rounded-full border border-line-strong bg-card px-4 text-base font-semibold text-ink transition-colors hover:bg-paper-deep"
              >
                {pending.cancelLabel ?? "Batal"}
              </button>
              <button
                ref={confirmRef}
                type="button"
                onClick={() => settle(true)}
                className={cx(
                  "inline-flex h-9 items-center justify-center rounded-full border px-4 text-base font-bold transition-colors",
                  // `bg-tomato-deep` dipakai sebagai latar, bukan `bg-tomato`:
                  // teks putih di atas #e2563c hanya 3.73:1 (gagal WCAG AA),
                  // sedangkan di atas #c2402a mencapai 5.17:1.
                  isDanger
                    ? "border-tomato-deep bg-tomato-deep text-white hover:border-tomato-ink hover:bg-tomato-ink"
                    : "border-emphasis bg-emphasis text-on-emphasis hover:bg-emphasis-hover",
                )}
              >
                {pending.confirmLabel ?? "Lanjutkan"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmApi {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm harus dipakai di dalam ConfirmProvider");
  }
  return context;
}

/** Versi sinkron untuk komponen yang hanya butuh boolean cepat. */
export function useConfirmSync() {
  const confirm = useConfirm();
  return useMemo(
    () => async (options: ConfirmOptions) => confirm(options),
    [confirm],
  );
}

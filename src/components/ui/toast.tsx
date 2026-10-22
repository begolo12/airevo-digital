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
import { Icon } from "@/components/ui/icon";

export type ToastTone = "success" | "error" | "info";

export type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Milidetik. Default 4000; error tampil lebih lama. */
  duration?: number;
  action?: { label: string; onClick: () => void };
};

type Toast = ToastInput & { id: number; tone: ToastTone };

type ToastApi = {
  toast: (input: ToastInput) => number;
  success: (title: string, description?: string) => number;
  error: (title: string, description?: string) => number;
  info: (title: string, description?: string) => number;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const MAX_VISIBLE = 4;

const toneStyles: Record<ToastTone, { wrap: string; icon: string; glyph: string }> = {
  success: {
    wrap: "border-mint-deep bg-mint/45",
    icon: "bg-positive text-white",
    glyph: "✓",
  },
  error: {
    wrap: "border-tomato/45 bg-tomato/12",
    icon: "bg-danger text-white",
    glyph: "!",
  },
  info: {
    wrap: "border-line-strong bg-card",
    icon: "bg-emphasis text-on-emphasis",
    glyph: "i",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      counter.current += 1;
      const id = counter.current;
      const tone = input.tone ?? "info";
      const entry: Toast = { ...input, tone, id };

      setToasts((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), entry]);

      const duration = input.duration ?? (tone === "error" ? 7000 : 4000);
      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        );
      }
      return id;
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      toast,
      success: (title, description) => toast({ title, description, tone: "success" }),
      error: (title, description) => toast({ title, description, tone: "error" }),
      info: (title, description) => toast({ title, description, tone: "info" }),
      dismiss,
    }),
    [toast, dismiss],
  );

  // Bersihkan timer saat provider dilepas.
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((timer) => clearTimeout(timer));
      map.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[80] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:left-auto sm:right-6 sm:items-end sm:px-0"
      >
        {toasts.map((item) => {
          const styles = toneStyles[item.tone];
          return (
            <div
              key={item.id}
              role={item.tone === "error" ? "alert" : "status"}
              className={cx(
                "animate-toast pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[12px] border px-3.5 py-3 shadow-[var(--shadow-lift)]",
                styles.wrap,
              )}
            >
              <span
                aria-hidden="true"
                className={cx(
                  "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-black",
                  styles.icon,
                )}
              >
                {styles.glyph}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold leading-snug text-ink">
                  {item.title}
                </p>
                {item.description ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
                    {item.description}
                  </p>
                ) : null}
                {item.action ? (
                  <button
                    type="button"
                    onClick={() => {
                      item.action?.onClick();
                      dismiss(item.id);
                    }}
                    className="mt-1.5 text-xs font-bold text-ink underline decoration-line-strong underline-offset-2 hover:decoration-tomato"
                  >
                    {item.action.label}
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Tutup notifikasi"
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-paper-deep hover:text-ink"
              >
                <Icon name="close" size={11} strokeWidth={2.6} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast harus dipakai di dalam ToastProvider");
  }
  return context;
}

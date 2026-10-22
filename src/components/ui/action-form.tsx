"use client";

import { useActionState, useEffect, useTransition } from "react";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/data/types";
import { useConfirm } from "./confirm";
import { useToast } from "./toast";

type ServerAction = (formData: FormData) => Promise<ActionResult | void>;

/**
 * Indikator proses pada tombol.
 *
 * Satu-satunya SVG inline yang tersisa, dan memang sengaja: ia butuh dua lapis
 * (cincin redup + busur berputar) yang tidak bisa diungkapkan oleh `<Icon>`
 * satu jalur. Semua ikon lain sudah lewat komponen agar ukuran dan ketebalan
 * garisnya seragam.
 */
function Spinner() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="animate-spin"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function SubmitButton({
  children,
  className,
  variant = "primary",
  disabled,
  pendingLabel,
}: {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "accent" | "soft" | "danger";
  disabled?: boolean;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full border font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 h-9 px-4 text-base";
  const styles = {
    primary: "bg-emphasis text-on-emphasis border-emphasis hover:bg-emphasis-hover",
    accent: "bg-tomato text-white border-tomato-deep hover:bg-tomato-deep",
    soft: "bg-card text-ink border-line-strong hover:bg-paper-deep",
    danger: "bg-transparent text-danger border-transparent hover:bg-tomato/10",
  } as const;

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`${base} ${styles[variant]} ${className ?? ""}`}
    >
      {pending ? (
        <>
          <Spinner />
          {pendingLabel ?? "Menyimpan…"}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function ActionForm({
  action,
  children,
  submitLabel,
  submitVariant = "primary",
  className,
  resetOnSuccess = false,
  footer,
  onSuccess,
}: {
  action: ServerAction;
  children: ReactNode;
  submitLabel: string;
  submitVariant?: "primary" | "accent" | "soft" | "danger";
  className?: string;
  resetOnSuccess?: boolean;
  footer?: ReactNode;
  /**
   * Dipanggil sekali setelah aksi berhasil.
   *
   * Dipakai dialog untuk menutup dirinya sendiri setelah menyimpan, sehingga
   * pengguna tidak perlu menutup manual.
   */
  onSuccess?: () => void;
}) {
  const toast = useToast();
  const [state, formAction] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) => {
      return (await action(formData)) ?? null;
    },
    null,
  );

  /*
   * Notifikasi muncul sekali per hasil, bukan setiap render.
   *
   * `onSuccess` dipanggil lebih dulu agar pemanggil bisa menahan dialog
   * (mis. animasi struk). Toast muncul setelahnya supaya tidak bertumpuk
   * dengan dialog yang masih menutup.
   */
  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      onSuccess?.();
      toast.success(state.message ?? "Tersimpan");
    } else {
      toast.error(state.message ?? "Gagal disimpan");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const fieldErrors = state && !state.ok ? Object.entries(state.fieldErrors ?? {}) : [];

  return (
    <form
      action={formAction}
      className={className}
      key={resetOnSuccess && state?.ok ? "reset" : undefined}
    >
      {/* Ringkasan error tetap di dalam form agar dekat dengan isian yang salah. */}
      {state && !state.ok ? (
        <div
          role="alert"
          className="mb-4 rounded-[10px] border border-tomato/40 bg-tomato/10 px-3 py-2 text-sm text-tomato-text"
        >
          <p className="font-semibold">{state.message ?? "Gagal disimpan."}</p>
          {fieldErrors.length > 0 ? (
            <ul className="mt-1 list-inside list-disc text-xs">
              {fieldErrors.map(([field, message]) => (
                <li key={field}>{message}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {children}

      <div className="mt-4 flex items-center gap-2 sm:col-span-full">
        <SubmitButton variant={submitVariant}>{submitLabel}</SubmitButton>
        {footer}
      </div>
    </form>
  );
}

/**
 * Tombol aksi untuk server action yang membaca id dari FormData.
 *
 * `fields` dikirim sebagai FormData — jangan mengirim closure dari server.
 *
 * Tidak memakai `<form>` karena konfirmasi perlu menahan pengiriman lebih dulu.
 * Dengan `onClick` + `useTransition`, tidak ada risiko submit ganda dan status
 * pending bisa ditampilkan dengan benar.
 */
export function ActionButton({
  action,
  label,
  fields = {},
  variant = "soft",
  confirmText,
  confirmDescription,
  confirmLabel,
  className,
  icon,
  undoAction,
  undoLabel = "Urungkan",
}: {
  action: ServerAction;
  label: string;
  fields?: Record<string, string | number | undefined>;
  variant?: "primary" | "accent" | "soft" | "danger";
  confirmText?: string;
  confirmDescription?: string;
  confirmLabel?: string;
  className?: string;
  icon?: ReactNode;
  /**
   * Aksi pembalik yang ditawarkan di toast setelah aksi utama berhasil.
   *
   * Pengguna sering menekan tombol pada baris yang salah. Tanpa jalur kembali,
   * satu salah klik memaksa mencatat ulang. Tombol "Urungkan" muncul 6 detik —
   * cukup untuk menyadari kesalahan, tidak cukup untuk jadi gangguan menetap.
   */
  undoAction?: ServerAction;
  undoLabel?: string;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const styles = {
    primary: "bg-emphasis text-on-emphasis border-emphasis hover:bg-emphasis-hover",
    accent: "bg-tomato text-white border-tomato-deep hover:bg-tomato-deep",
    soft: "bg-card text-ink border-line-strong hover:bg-paper-deep",
    danger: "bg-transparent text-danger border-transparent hover:bg-tomato/10",
  } as const;

  async function handleClick() {
    if (pending) return;

    if (confirmText) {
      const ok = await confirm({
        title: confirmText,
        description: confirmDescription,
        tone: variant === "danger" ? "danger" : "default",
        confirmLabel: confirmLabel ?? (variant === "danger" ? "Hapus" : "Lanjutkan"),
      });
      if (!ok) return;
    }

    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) formData.append(key, String(value));
    }

    startTransition(async () => {
      try {
        const result = await action(formData);
        if (result && typeof result === "object" && "ok" in result) {
          if (result.ok) {
            if (undoAction) {
              toast.toast({
                title: result.message ?? "Selesai",
                tone: "success",
                duration: 6000,
                action: {
                  label: undoLabel,
                  onClick: () => {
                    startTransition(async () => {
                      const undoResult = await undoAction(formData);
                      if (undoResult && "ok" in undoResult && undoResult.ok) {
                        toast.success(undoResult.message ?? "Dibatalkan");
                        router.refresh();
                      } else if (undoResult && "message" in undoResult) {
                        toast.error(undoResult.message ?? "Gagal membatalkan");
                      }
                    });
                  },
                },
              });
            } else {
              toast.success(result.message ?? "Selesai");
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

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-full border px-4 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]} ${className ?? ""}`}
    >
      {pending ? (
        <>
          <Spinner />
          Memproses…
        </>
      ) : (
        <>
          {icon}
          {label}
        </>
      )}
    </button>
  );
}

/**
 * Form inline untuk server action yang mengembalikan ActionResult.
 *
 * Hanya memunculkan notifikasi saat gagal. Untuk aksi yang hasilnya langsung
 * terlihat di layar (centang belanja, ubah status tugas), notifikasi sukses
 * justru mengganggu.
 */
export function InlineForm({
  action,
  children,
  className,
}: {
  action: ServerAction;
  children: ReactNode;
  className?: string;
}) {
  const toast = useToast();
  const [state, formAction] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) => {
      return (await action(formData)) ?? null;
    },
    null,
  );

  useEffect(() => {
    if (!state) return;
    if (!state.ok) {
      toast.error(state.message ?? "Gagal disimpan");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className={className}>
      {children}
    </form>
  );
}

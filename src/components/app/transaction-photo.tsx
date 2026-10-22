"use client";

import { useRef, useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { cx } from "@/components/ui";
import {
  attachTransactionPhoto,
  detachTransactionPhoto,
} from "@/lib/data/actions";

/**
 * Melampirkan foto struk ke transaksi.
 *
 * Alur sama dengan lampiran dokumen: minta izin unggah, kirim berkas langsung
 * ke Object Storage lewat presigned URL, lalu catat kuncinya.
 *
 * Foto struk lebih sering difoto daripada dipindai, jadi kamera ponsel
 * diaktifkan lewat `capture` pada perangkat yang mendukung.
 */

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TransactionPhoto({
  transactionId,
  attachmentKey,
  attachmentName,
}: {
  transactionId: string;
  attachmentKey?: string;
  attachmentName?: string;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  async function upload(file: File) {
    if (!ALLOWED.includes(file.type as (typeof ALLOWED)[number])) {
      toast.error("Jenis berkas tidak didukung", "Gunakan JPG, PNG, WEBP, atau PDF.");
      return;
    }

    if (file.size > MAX_BYTES) {
      toast.error("Berkas terlalu besar", `Maksimal ${humanSize(MAX_BYTES)}.`);
      return;
    }

    setProgress(0);

    try {
      const ticketResponse = await fetch("/api/dokumen", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "transaksi",
          id: transactionId,
          fileName: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });

      const ticket = await ticketResponse.json();

      if (!ticketResponse.ok || !ticket.ok) {
        throw new Error(ticket.message ?? "Gagal menyiapkan unggahan.");
      }

      await new Promise<void>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("PUT", ticket.uploadUrl);
        request.setRequestHeader("content-type", file.type);

        request.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        });

        request.addEventListener("load", () => {
          if (request.status >= 200 && request.status < 300) resolve();
          else reject(new Error(`Unggahan ditolak (${request.status}).`));
        });
        request.addEventListener("error", () =>
          reject(new Error("Koneksi terputus saat mengunggah.")),
        );

        request.send(file);
      });

      const formData = new FormData();
      formData.set("id", transactionId);
      formData.set("key", ticket.key);
      formData.set("fileName", file.name);

      const result = await attachTransactionPhoto(formData);
      if (!result.ok) throw new Error(result.message);

      toast.success("Foto terlampir", file.name);
      startTransition(() => window.location.reload());
    } catch (error) {
      toast.error(
        "Unggahan gagal",
        error instanceof Error ? error.message : "Coba lagi.",
      );
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove() {
    const formData = new FormData();
    formData.set("id", transactionId);

    startTransition(async () => {
      const result = await detachTransactionPhoto(formData);
      if (result.ok) {
        toast.success("Lampiran dilepas");
        window.location.reload();
      } else {
        toast.error("Gagal melepas", result.message);
      }
    });
  }

  /* ------------------------------- ada lampiran ------------------------------ */

  if (attachmentKey) {
    return (
      <div className="flex items-center gap-1.5">
        <a
          href={`/api/dokumen?key=${encodeURIComponent(attachmentKey)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-full bg-mint/40 px-2 py-0.5 text-2xs font-semibold text-ink hover:bg-mint/60"
          title={attachmentName ?? "Lihat lampiran"}
        >
          <Icon name="paperclip" size={10} />
          <span className="max-w-[90px] truncate">{attachmentName ?? "struk"}</span>
        </a>
        <button
          type="button"
          disabled={pending}
          onClick={remove}
          aria-label="Lepas lampiran"
          className="rounded-full px-1 text-2xs font-semibold text-muted hover:text-danger disabled:opacity-50"
        >
          ×
        </button>
      </div>
    );
  }

  /* -------------------------------- belum ada ------------------------------- */

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED.join(",")}
        aria-label="Pilih foto struk untuk transaksi ini"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />

      {progress === null ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cx(
            "inline-flex items-center gap-1 rounded-full border border-dashed border-line-strong px-2 py-0.5 text-2xs font-semibold text-muted transition-colors",
            "hover:border-ink hover:text-ink",
          )}
          title="Lampirkan foto struk"
        >
          <Icon name="paperclip" size={10} />
          Struk
        </button>
      ) : (
        <span className="inline-flex items-center gap-1 text-2xs font-semibold text-muted">
          <span className="tnum">{progress}%</span>
        </span>
      )}
    </>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import { attachDocumentFile, detachDocumentFile } from "@/lib/data/actions";
import { useToast } from "@/components/ui/toast";
import { cx } from "@/components/ui";

/**
 * Melampirkan berkas ke sebuah dokumen.
 *
 * ## Alur
 *
 * 1. Minta izin unggah ke `/api/dokumen` (server memeriksa sesi dan kepemilikan
 *    dokumen, lalu menandatangani URL).
 * 2. Kirim berkas **langsung** ke Object Storage lewat presigned URL — tidak
 *    melewati server Next.js, sehingga berkas 8 MB tidak memakan memori fungsi.
 * 3. Catat kunci objeknya lewat server action.
 *
 * ## Kenapa ada progres
 *
 * `XMLHttpRequest` dipakai, bukan `fetch`, karena hanya XHR yang memberi event
 * `progress`. Tanpa itu pengguna tidak tahu apakah unggahan 8 MB masih berjalan
 * atau macet.
 */

const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentUploader({
  documentId,
  fileName,
  fileSize,
  hasFile,
}: {
  documentId: string;
  fileName?: string;
  fileSize?: number;
  hasFile: boolean;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();

  async function upload(file: File) {
    if (!ALLOWED.includes(file.type as (typeof ALLOWED)[number])) {
      toast.error("Jenis berkas tidak didukung", "Gunakan PDF, JPG, PNG, atau WEBP.");
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
          documentId,
          fileName: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });

      const ticket = await ticketResponse.json();

      if (!ticketResponse.ok || !ticket.ok) {
        throw new Error(ticket.message ?? "Gagal menyiapkan unggahan.");
      }

      // Unggah langsung ke bucket, dengan progres.
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
        request.addEventListener("abort", () =>
          reject(new Error("Unggahan dibatalkan.")),
        );

        request.send(file);
      });

      const formData = new FormData();
      formData.set("id", documentId);
      formData.set("key", ticket.key);
      formData.set("fileName", file.name);
      formData.set("fileSize", String(file.size));

      const result = await attachDocumentFile(formData);

      if (!result.ok) throw new Error(result.message);

      toast.success("Berkas terpasang", file.name);
      startTransition(() => {
        // Segarkan data server agar tautan unduh muncul.
        window.location.reload();
      });
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
    formData.set("id", documentId);

    startTransition(async () => {
      const result = await detachDocumentFile(formData);
      if (result.ok) {
        toast.success("Berkas dilepas");
        window.location.reload();
      } else {
        toast.error("Gagal melepas", result.message);
      }
    });
  }

  /* --------------------------------- ada berkas -------------------------------- */

  if (hasFile) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/40 px-2.5 py-1 font-semibold text-ink">
          <span aria-hidden="true">📎</span>
          <span className="max-w-[180px] truncate">{fileName ?? "Berkas"}</span>
          {fileSize ? <span className="text-muted">{humanSize(fileSize)}</span> : null}
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={remove}
          className="rounded-full border border-line-strong px-2.5 py-1 font-semibold text-muted transition-colors hover:border-tomato hover:text-danger disabled:opacity-50"
        >
          {pending ? "Melepas…" : "Lepas"}
        </button>
      </div>
    );
  }

  /* -------------------------------- belum ada -------------------------------- */

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED.join(",")}
        aria-label="Pilih berkas dokumen untuk dilampirkan"
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
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) void upload(file);
          }}
          className={cx(
            "flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed px-3 py-2.5 text-xs font-semibold transition-colors",
            dragging
              ? "border-ink bg-butter/40 text-ink"
              : "border-line-strong text-muted hover:border-ink hover:text-ink",
          )}
        >
          <span aria-hidden="true">⬆</span>
          Lampirkan berkas
          <span className="font-normal text-muted">· PDF/JPG/PNG · maks 10 MB</span>
        </button>
      ) : (
        <div
          className="rounded-[10px] border border-line-strong px-3 py-2.5"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-between text-xs font-semibold">
            <span>Mengunggah…</span>
            <span className="tnum">{progress}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper-deep">
            <div
              className="h-full rounded-full bg-mint-deep transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

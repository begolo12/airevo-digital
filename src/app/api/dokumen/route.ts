import { NextResponse } from "next/server";
import { requireViewer } from "@/lib/session";
import { getStore } from "@/lib/data/store";
import {
  createUploadTicket,
  isStorageConfigured,
  keyBelongsToWorkspace,
  createDownloadUrl,
  MAX_UPLOAD_BYTES,
} from "@/lib/storage/neon-storage";

/**
 * Izin unggah berkas (dokumen dan lampiran transaksi).
 *
 * Mengembalikan presigned URL supaya browser mengunggah langsung ke Object
 * Storage, bukan melewati server — berkas 8 MB tidak memakan memori fungsi.
 *
 * ## Keamanan
 *
 * - Sesi wajib aktif (`requireViewer`).
 * - Entitas yang dirujuk harus milik ruang yang sedang aktif.
 * - Kunci objek selalu diawali `workspaceId/`, jadi ruang lain tidak bisa
 *   menimpa atau membaca berkas ruang ini.
 * - Jenis berkas dan ukuran diperiksa di sini **dan** di klien. Pemeriksaan
 *   klien hanya kenyamanan; yang mengikat adalah yang di server.
 */

/** Jenis entitas yang boleh punya lampiran. */
type AttachmentKind = "dokumen" | "transaksi";

const KIND_LABEL: Record<AttachmentKind, string> = {
  dokumen: "Dokumen",
  transaksi: "Transaksi",
};

export async function POST(request: Request) {
  const viewer = await requireViewer();

  if (!isStorageConfigured()) {
    return NextResponse.json(
      { ok: false, message: "Penyimpanan berkas belum dikonfigurasi." },
      { status: 503 },
    );
  }

  let payload: {
    kind?: string;
    id?: string;
    /** Nama lama, dipertahankan agar klien dokumen tidak perlu diubah. */
    documentId?: string;
    fileName?: string;
    contentType?: string;
    size?: number;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Permintaan tidak valid." }, { status: 400 });
  }

  const kind = (payload.kind ?? "dokumen") as AttachmentKind;
  const id = String(payload.id ?? payload.documentId ?? "");
  const contentType = String(payload.contentType ?? "");
  const fileName = String(payload.fileName ?? "");
  const size = Number(payload.size ?? 0);

  if (kind !== "dokumen" && kind !== "transaksi") {
    return NextResponse.json({ ok: false, message: "Jenis lampiran tidak dikenal." }, { status: 400 });
  }

  const store = getStore();
  const owns =
    kind === "dokumen"
      ? store.documents.some(
          (item) => item.id === id && item.workspaceId === viewer.workspaceId,
        )
      : store.transactions.some(
          (item) => item.id === id && item.workspaceId === viewer.workspaceId,
        );

  if (!owns) {
    return NextResponse.json(
      {
        ok: false,
        message: `${KIND_LABEL[kind]} tidak ditemukan di ruang ini.`,
      },
      { status: 404 },
    );
  }

  if (size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { ok: false, message: "Berkas melebihi 10 MB." },
      { status: 413 },
    );
  }

  try {
    const ticket = await createUploadTicket({
      workspaceId: viewer.workspaceId,
      documentId: id,
      fileName,
      contentType,
    });

    return NextResponse.json({ ok: true, ...ticket });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Gagal menyiapkan unggahan.",
      },
      { status: 400 },
    );
  }
}

/** Tautan unduh sementara untuk berkas yang tersimpan. */
export async function GET(request: Request) {
  const viewer = await requireViewer();

  if (!isStorageConfigured()) {
    return NextResponse.json(
      { ok: false, message: "Penyimpanan berkas belum dikonfigurasi." },
      { status: 503 },
    );
  }

  const key = new URL(request.url).searchParams.get("key") ?? "";

  if (!keyBelongsToWorkspace(key, viewer.workspaceId)) {
    return NextResponse.json({ ok: false, message: "Akses ditolak." }, { status: 403 });
  }

  try {
    const url = await createDownloadUrl(key);
    return NextResponse.json({ ok: true, url });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Berkas tidak ditemukan." },
      { status: 404 },
    );
  }
}

import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Object Storage Neon (kompatibel S3).
 *
 * Menyimpan berkas dokumen keluarga — KTP, akta, polis asuransi, ijazah.
 * Sebelumnya dokumen hanya mencatat nama berkas tanpa tempat menyimpannya.
 *
 * ## Kenapa presigned URL, bukan unggah lewat server
 *
 * Berkas dokumen bisa berukuran beberapa MB. Meneruskannya lewat server Next.js
 * berarti memakai memori dan waktu fungsi untuk menyalin byte yang tidak pernah
 * dibaca aplikasi. Dengan presigned URL, browser mengunggah langsung ke storage
 * dan server hanya menandatangani izinnya.
 *
 * ## Penamaan objek
 *
 * Kunci selalu diawali `workspaceId/` sehingga berkas satu ruang tidak pernah
 * bercampur dengan ruang lain — lapisan pertahanan yang sama dengan data.
 */

const endpoint = process.env.AWS_ENDPOINT_URL_S3;
const region = process.env.AWS_REGION ?? "ap-southeast-1";
const bucket = process.env.NEON_OBJECT_STORAGE_BUCKET ?? "assets";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

export function isStorageConfigured(): boolean {
  return Boolean(endpoint && accessKeyId && secretAccessKey);
}

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!isStorageConfigured()) {
    throw new Error("Object storage belum dikonfigurasi (AWS_ENDPOINT_URL_S3 dan kredensial).");
  }
  if (!client) {
    client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId: accessKeyId as string,
        secretAccessKey: secretAccessKey as string,
      },
      // Neon memakai endpoint kustom, jadi path-style diperlukan.
      forcePathStyle: true,
    });
  }
  return client;
}

/** Membatasi jenis berkas yang boleh diunggah. */
const ALLOWED_TYPES = new Map<string, string>([
  ["application/pdf", "pdf"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type UploadTicket = {
  uploadUrl: string;
  key: string;
  /** Kedaluwarsa dalam detik. */
  expiresIn: number;
};

/**
 * Membuat izin unggah sekali pakai.
 *
 * `contentType` dibatasi ke daftar putih agar bucket tidak bisa dipakai
 * menyimpan berkas sembarang (mis. HTML yang bisa dieksekusi).
 */
export async function createUploadTicket(input: {
  workspaceId: string;
  documentId: string;
  fileName: string;
  contentType: string;
}): Promise<UploadTicket> {
  const extension = ALLOWED_TYPES.get(input.contentType);
  if (!extension) {
    throw new Error("Jenis berkas tidak didukung. Gunakan PDF, JPG, PNG, atau WEBP.");
  }

  // Nama asli tidak dipakai di kunci: menghindari karakter aneh dan tabrakan.
  const key = `${input.workspaceId}/${input.documentId}.${extension}`;
  const expiresIn = 300;

  const uploadUrl = await getSignedUrl(
    getClient(),
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: input.contentType,
    }),
    { expiresIn },
  );

  return { uploadUrl, key, expiresIn };
}

/** Membuat tautan unduh sementara untuk sebuah objek. */
export async function createDownloadUrl(key: string, expiresIn = 300): Promise<string> {
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn },
  );
}

/** Menghapus objek. Tidak melempar bila objeknya sudah tidak ada. */
export async function deleteObject(key: string): Promise<void> {
  try {
    await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch {
    // Objek yang sudah hilang bukan kegagalan bagi pemanggil.
  }
}

/**
 * Memastikan kunci objek memang milik ruang yang mengaksesnya.
 *
 * Tanpa ini, siapa pun yang mengetahui kunci berkas ruang lain bisa meminta
 * tautan unduhnya.
 */
export function keyBelongsToWorkspace(key: string, workspaceId: string): boolean {
  return key.startsWith(`${workspaceId}/`) && !key.includes("..");
}

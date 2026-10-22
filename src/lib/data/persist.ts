import "server-only";

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Persistensi lokal berbasis berkas JSON.
 *
 * Dipakai agar data bertahan saat dev server restart, tanpa perlu Postgres.
 *
 * ## Peringatan produksi
 *
 * Pada platform serverless (Vercel), filesystem bersifat **read-only** dan
 * sementara. Setiap penulisan akan gagal. Sebelumnya kegagalan itu hanya
 * dicatat sebagai peringatan lalu diabaikan, sehingga aplikasi tampak
 * berjalan normal sementara **data pengguna hilang setiap kali instance
 * didaur ulang**.
 *
 * Sekarang kegagalan dicatat sebagai keadaan yang bisa diperiksa
 * (`getPersistenceState()`) dan dilaporkan apa adanya oleh `/api/health`.
 * Aplikasi tidak berpura-pura sehat saat penyimpanannya mati.
 */

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

const enabled = process.env.AIREVO_PERSIST !== "0";

/** Vercel menandai dirinya lewat variabel ini. */
const isServerless = Boolean(process.env.VERCEL);

export type PersistenceState = {
  /** Penyimpanan dimatikan lewat `AIREVO_PERSIST=0`. */
  disabled: boolean;
  /** Penulisan pernah gagal. */
  degraded: boolean;
  /** Alasan kegagalan terakhir, bila ada. */
  reason?: string;
  /** Berjalan di platform tanpa filesystem tulis. */
  serverless: boolean;
};

const globalState = globalThis as unknown as {
  __airevoPersistence?: PersistenceState;
};

function state(): PersistenceState {
  if (!globalState.__airevoPersistence) {
    globalState.__airevoPersistence = {
      disabled: !enabled,
      degraded: false,
      serverless: isServerless,
    };
  }
  return globalState.__airevoPersistence;
}

/** Keadaan penyimpanan, untuk health check dan diagnosis. */
export function getPersistenceState(): PersistenceState {
  return { ...state() };
}

/** Tandai penyimpanan bermasalah dan laporkan sekali saja. */
function markDegraded(reason: string) {
  const current = state();
  if (current.degraded) return;
  current.degraded = true;
  current.reason = reason;

  const advice = isServerless
    ? "Platform ini tidak menyediakan filesystem tulis. Isi DATABASE_URL agar data bertahan."
    : "Periksa izin tulis pada folder .data.";

  console.error(
    `[store] PENYIMPANAN GAGAL — perubahan hanya tersimpan di memori dan akan hilang saat server restart. ${advice} Penyebab: ${reason}`,
  );
}

export function readPersisted<T>(): T | null {
  if (!enabled) return null;
  try {
    const raw = readFileSync(DATA_FILE, "utf8");
    if (!raw.trim()) return null;
    return JSON.parse(raw) as T;
  } catch {
    // Berkas belum ada pada instalasi baru — bukan keadaan rusak.
    return null;
  }
}

/**
 * Menulis seluruh store ke berkas.
 *
 * Mengembalikan `true` bila berhasil. Pemanggil tidak wajib memeriksa, tetapi
 * kegagalan tidak lagi hilang diam-diam: ia tercatat di `getPersistenceState()`
 * dan muncul di health check.
 */
export function writePersisted(value: unknown): boolean {
  if (!enabled) return false;

  const current = state();
  // Setelah gagal, jangan mencoba lagi setiap mutasi — cukup sekali per proses
  // agar log tidak banjir, tetapi keadaan tetap tercatat sebagai rusak.
  if (current.degraded) return false;

  try {
    mkdirSync(DATA_DIR, { recursive: true });
    // Tulis ke berkas sementara lalu rename, agar tidak korup bila proses mati.
    const tmp = `${DATA_FILE}.tmp`;
    writeFileSync(tmp, JSON.stringify(value, null, 2), "utf8");
    renameSync(tmp, DATA_FILE);
    return true;
  } catch (error) {
    markDegraded(error instanceof Error ? error.message : String(error));
    return false;
  }
}

export function clearPersisted(): void {
  if (!enabled) return;
  try {
    writeFileSync(DATA_FILE, "", "utf8");
  } catch {
    // abaikan — reset data contoh tetap berlaku di memori
  }
}

/**
 * Memeriksa apakah penyimpanan benar-benar bisa ditulis.
 *
 * Menulis berkas uji kecil, bukan hanya memeriksa variabel environment.
 * Dipakai health check agar tidak melaporkan "ok" saat penyimpanan mati.
 */
export function verifyPersistence(): { ok: boolean; reason?: string } {
  if (!enabled) {
    return { ok: false, reason: "Penyimpanan dimatikan (AIREVO_PERSIST=0)." };
  }

  const probe = path.join(DATA_DIR, ".write-probe");

  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(probe, String(Date.now()), "utf8");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

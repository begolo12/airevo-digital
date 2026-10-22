import "server-only";

import { eq, inArray, sql } from "drizzle-orm";
import { db } from "./index";
import { appState, workspaceRecords } from "./records";
import type { Store } from "@/lib/data/types";

/**
 * Jembatan antara store aplikasi dan Postgres.
 *
 * ## Bentuk penyimpanan
 *
 * Dua tempat:
 *
 * 1. `app_state` — keadaan tunggal yang selalu dibaca utuh: rumah tangga,
 *    akun pengguna, profil, workspace, keanggotaan, pesanan, lisensi.
 * 2. `workspace_records` — koleksi yang bertambah banyak (transaksi, akun,
 *    tujuan, dst.), satu baris per entitas dengan `workspace_id` sebagai kolom.
 *
 * ## Kenapa simpan per-baris, bukan satu dokumen besar
 *
 * Menyimpan seluruh store sebagai satu dokumen berarti setiap perubahan menulis
 * ulang semuanya, dan dua permintaan bersamaan saling menimpa. Dengan satu baris
 * per entitas, dua pengguna yang menyunting entitas berbeda tidak bertabrakan.
 *
 * ## Cara kerja simpan
 *
 * `getStore()` memuat seluruh data ke memori sekali saat server mulai.
 * `saveStore()` membandingkan isi memori dengan salinan terakhir yang diketahui,
 * lalu hanya menulis baris yang benar-benar berubah — plus menghapus baris yang
 * hilang. Pembandingan memakai hash per baris agar tidak perlu menulis ulang
 * ratusan baris setiap kali satu transaksi ditambahkan.
 */

/** Koleksi yang disimpan per baris di `workspace_records`. */
export const RECORD_COLLECTIONS = [
  "accounts",
  "categories",
  "transactions",
  "recurringRules",
  "budgets",
  "bills",
  "billPayments",
  "goals",
  "contributions",
  "events",
  "chores",
  "shopping",
  "debts",
  "assets",
  "insurances",
  "documents",
  "healthRecords",
  "educationRecords",
] as const;

type RecordCollection = (typeof RECORD_COLLECTIONS)[number];

/** Kunci `app_state` untuk keadaan tunggal. */
const STATE_KEYS = [
  "household",
  "users",
  "profiles",
  "workspaces",
  "workspaceMembers",
  "orders",
  "licenses",
  "messages",
] as const;

type StateKey = (typeof STATE_KEYS)[number];

/** Hash isi sebuah rekaman, untuk mendeteksi perubahan tanpa membandingkan objek penuh. */
function fingerprint(value: unknown): string {
  const text = JSON.stringify(value);
  // FNV-1a 32-bit: cukup untuk mendeteksi perubahan, jauh lebih murah daripada SHA.
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${text.length}:${hash.toString(16)}`;
}

/** Salinan terakhir yang sudah ada di database, dipakai untuk menghitung selisih. */
const known = new Map<string, string>();

function recordKey(collection: string, id: string): string {
  return `${collection}\u0000${id}`;
}

export function isDatabaseEnabled(): boolean {
  return db !== null;
}

/**
 * Memuat seluruh data dari Postgres ke dalam bentuk `Store`.
 *
 * Mengembalikan `null` bila database belum dikonfigurasi atau masih kosong,
 * sehingga pemanggil bisa memakai data contoh.
 */
export async function loadStore(): Promise<Partial<Store> | null> {
  if (!db) return null;

  const [stateRows, recordRows] = await Promise.all([
    db.select().from(appState),
    db.select().from(workspaceRecords),
  ]);

  if (stateRows.length === 0 && recordRows.length === 0) return null;

  const state = new Map(stateRows.map((row) => [row.key, row.value]));
  const result: Record<string, unknown> = {};

  for (const key of STATE_KEYS) {
    if (state.has(key)) result[key] = state.get(key);
  }

  // Koleksi per baris dirakit kembali menjadi array.
  for (const collection of RECORD_COLLECTIONS) {
    result[collection] = [];
  }

  for (const row of recordRows) {
    const bucket = result[row.collection];
    if (Array.isArray(bucket)) {
      bucket.push(row.data);
      const data = row.data as { id?: string };
      if (data.id) {
        known.set(recordKey(row.collection, data.id), fingerprint(row.data));
      }
    }
  }

  return result as Partial<Store>;
}

/**
 * Menyimpan perubahan dari memori ke Postgres.
 *
 * Hanya baris yang berubah yang ditulis. Baris yang hilang dari memori dihapus
 * dari database, sehingga penghapusan benar-benar berlaku.
 */
export async function persistStore(store: Store): Promise<void> {
  // Ditangkap ke variabel lokal: TypeScript tidak mempertahankan penyempitan
  // tipe `db` di dalam closure async di bawah.
  const database = db;
  if (!database) return;

  const writes: Array<() => Promise<unknown>> = [];

  /* ----------------------------- keadaan tunggal ---------------------------- */

  for (const key of STATE_KEYS) {
    const value = (store as unknown as Record<string, unknown>)[key];
    if (value === undefined) continue;

    const hash = fingerprint(value);
    if (known.get(`state\u0000${key}`) === hash) continue;

    writes.push(async () => {
      await database
        .insert(appState)
        .values({ key, value: value as object, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: appState.key,
          set: { value: value as object, updatedAt: new Date() },
        });
    });
    known.set(`state\u0000${key}`, hash);
  }

  /* --------------------------- koleksi per baris --------------------------- */

  for (const collection of RECORD_COLLECTIONS) {
    const rows = ((store as unknown as Record<string, unknown>)[collection] ??
      []) as Array<{ id?: string; workspaceId?: string }>;

    const present = new Set<string>();

    for (const row of rows) {
      if (!row.id) continue;
      present.add(row.id);

      const hash = fingerprint(row);
      const key = recordKey(collection, row.id);
      if (known.get(key) === hash) continue;

      const payload = {
        collection,
        id: row.id,
        workspaceId: row.workspaceId ?? null,
        data: row as object,
        updatedAt: new Date(),
      };

      writes.push(async () => {
        await database
          .insert(workspaceRecords)
          .values(payload)
          .onConflictDoUpdate({
            target: [workspaceRecords.collection, workspaceRecords.id],
            set: { data: payload.data, workspaceId: payload.workspaceId, updatedAt: new Date() },
          });
      });
      known.set(key, hash);
    }

    // Hapus baris yang sudah tidak ada di memori.
    const stored = await database
      .select({ id: workspaceRecords.id })
      .from(workspaceRecords)
      .where(eq(workspaceRecords.collection, collection));

    const removed = stored.map((row) => row.id).filter((id) => !present.has(id));

    if (removed.length > 0) {
      writes.push(async () => {
        await database
          .delete(workspaceRecords)
          .where(
            sql`${workspaceRecords.collection} = ${collection} and ${inArray(workspaceRecords.id, removed)}`,
          );
      });
      for (const id of removed) known.delete(recordKey(collection, id));
    }
  }

  await Promise.all(writes.map((run) => run()));
}

/** Mengosongkan penanda agar penyimpanan berikutnya menulis ulang semuanya. */
export function forgetKnownState(): void {
  known.clear();
}

/** Koleksi yang dipakai saat menyiapkan data contoh. */
export type { RecordCollection, StateKey };

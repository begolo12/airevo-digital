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
  /*
   * Pesanan, lisensi, dan pesan kontak ikut per baris.
   *
   * Sebelumnya ketiganya disimpan sebagai satu array di `app_state`. Dengan
   * lebih dari satu instance (Vercel), dua permintaan bersamaan memegang
   * salinan array masing-masing dan yang menulis terakhir menimpa yang lain —
   * pesanan dan pesan hilang tanpa error. Satu baris per entitas membuat
   * penambahan tidak saling menimpa.
   */
  "orders",
  "licenses",
  "messages",
] as const;

type RecordCollection = (typeof RECORD_COLLECTIONS)[number];

/** Kunci `app_state` untuk keadaan tunggal. */
const STATE_KEYS = [
  "household",
  "users",
  "profiles",
  "workspaces",
  "workspaceMembers",
] as const;

/**
 * Koleksi yang dulu tinggal di `app_state`.
 *
 * Dibaca sekali untuk memindahkan data lama ke penyimpanan per baris; setelah
 * dipindahkan, baris `app_state`-nya dihapus.
 */
const LEGACY_STATE_COLLECTIONS = ["orders", "licenses", "messages"] as const;

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

/**
 * Id yang diketahui ada di database per koleksi.
 *
 * Tanpa ini, setiap penyimpanan harus menjalankan satu SELECT per koleksi (18
 * kueri) hanya untuk mencari baris yang hilang. Di Neon serverless, 18 round
 * trip berarti pengguna menunggu belasan detik setelah menekan tombol simpan.
 */
const knownIds = new Map<string, Set<string>>();

/**
 * Apakah `known` sudah disamakan dengan isi database di modul ini.
 *
 * Next.js menjalankan `instrumentation.ts` dan route handler dalam salinan modul
 * yang berbeda, sehingga peta di atas bisa kosong meski `loadStore()` sudah
 * jalan. Tanpa penyelarasan ulang, penyimpanan pertama di tiap instance
 * menulis ulang seluruh koleksi.
 */
let knownSynced = false;

async function syncKnownFromDatabase(database: NonNullable<typeof db>): Promise<void> {
  if (knownSynced) return;
  knownSynced = true;

  const [stateRows, recordRows] = await Promise.all([
    database.select({ key: appState.key, value: appState.value }).from(appState),
    database
      .select({
        collection: workspaceRecords.collection,
        id: workspaceRecords.id,
        data: workspaceRecords.data,
      })
      .from(workspaceRecords),
  ]);

  for (const row of stateRows) {
    known.set(`state\u0000${row.key}`, fingerprint(row.value));
  }

  for (const row of recordRows) {
    known.set(recordKey(row.collection, row.id), fingerprint(row.data));
    let ids = knownIds.get(row.collection);
    if (!ids) {
      ids = new Set();
      knownIds.set(row.collection, ids);
    }
    ids.add(row.id);
  }
}

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
    if (state.has(key)) {
      result[key] = state.get(key);
      // Tanpa ini, penyimpanan pertama setelah instance baru selalu menulis
      // ulang seluruh keadaan tunggal meski isinya tidak berubah.
      known.set(`state\u0000${key}`, fingerprint(state.get(key)));
    }
  }

  // Koleksi per baris dirakit kembali menjadi array.
  for (const collection of RECORD_COLLECTIONS) {
    result[collection] = [];
    knownIds.set(collection, new Set());
  }

  for (const row of recordRows) {
    const bucket = result[row.collection];
    if (Array.isArray(bucket)) {
      bucket.push(row.data);
      const data = row.data as { id?: string };
      if (data.id) {
        known.set(recordKey(row.collection, data.id), fingerprint(row.data));
        knownIds.get(row.collection)?.add(data.id);
      }
    }
  }

  /*
   * Pindahkan koleksi lama dari `app_state` ke baris sendiri.
   *
   * Hanya berjalan bila belum ada satu pun baris untuk koleksi itu, jadi
   * penghapusan yang disengaja tidak dihidupkan lagi dari nilai lama. Setelah
   * baris tertulis, baris `app_state`-nya dihapus supaya tidak ada dua sumber
   * kebenaran.
   */
  const migration: Array<() => Promise<unknown>> = [];

  for (const key of LEGACY_STATE_COLLECTIONS) {
    const bucket = result[key];
    if (!Array.isArray(bucket) || bucket.length > 0) continue;

    const legacy = state.get(key);
    if (!Array.isArray(legacy) || legacy.length === 0) continue;

    result[key] = legacy;
    const ids = knownIds.get(key) ?? new Set<string>();

    for (const item of legacy as Array<{ id?: string; workspaceId?: string }>) {
      if (!item.id) continue;
      known.set(recordKey(key, item.id), fingerprint(item));
      ids.add(item.id);

      migration.push(async () => {
        await db!
          .insert(workspaceRecords)
          .values({
            collection: key,
            id: item.id as string,
            workspaceId: item.workspaceId ?? null,
            data: item as object,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [workspaceRecords.collection, workspaceRecords.id],
            set: { data: item as object, workspaceId: item.workspaceId ?? null },
          });
      });
    }

    knownIds.set(key, ids);
    migration.push(async () => {
      await db!.delete(appState).where(eq(appState.key, key));
    });
  }

  if (migration.length > 0) {
    await Promise.all(migration.map((run) => run()));
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

  await syncKnownFromDatabase(database);

  const writes: Array<() => Promise<unknown>> = [];
  const now = new Date();

  /* ----------------------------- keadaan tunggal ---------------------------- */

  const stateRows: Array<{ key: string; value: object; updatedAt: Date }> = [];

  for (const key of STATE_KEYS) {
    const value = (store as unknown as Record<string, unknown>)[key];
    if (value === undefined) continue;

    const hash = fingerprint(value);
    if (known.get(`state\u0000${key}`) === hash) continue;

    stateRows.push({ key, value: value as object, updatedAt: now });
    known.set(`state\u0000${key}`, hash);
  }

  if (stateRows.length > 0) {
    writes.push(() =>
      database
        .insert(appState)
        .values(stateRows)
        .onConflictDoUpdate({
          target: appState.key,
          set: { value: sql`excluded.value`, updatedAt: sql`excluded.updated_at` },
        }),
    );
  }

  /* --------------------------- koleksi per baris --------------------------- */

  for (const collection of RECORD_COLLECTIONS) {
    const rows = ((store as unknown as Record<string, unknown>)[collection] ??
      []) as Array<{ id?: string; workspaceId?: string }>;

    const present = new Set<string>();
    const changed: Array<{
      collection: string;
      id: string;
      workspaceId: string | null;
      data: object;
      updatedAt: Date;
    }> = [];

    for (const row of rows) {
      if (!row.id) continue;
      present.add(row.id);

      const hash = fingerprint(row);
      const key = recordKey(collection, row.id);
      if (known.get(key) === hash) continue;

      changed.push({
        collection,
        id: row.id,
        workspaceId: row.workspaceId ?? null,
        data: row as object,
        updatedAt: now,
      });
      known.set(key, hash);
    }

    if (changed.length > 0) {
      writes.push(() =>
        database
          .insert(workspaceRecords)
          .values(changed)
          .onConflictDoUpdate({
            target: [workspaceRecords.collection, workspaceRecords.id],
            set: {
              data: sql`excluded.data`,
              workspaceId: sql`excluded.workspace_id`,
              updatedAt: sql`excluded.updated_at`,
            },
          }),
      );
    }

    /*
     * Baris yang hilang dihitung dari daftar id di memori, bukan dari SELECT
     * per koleksi. Sebelumnya setiap penyimpanan menjalankan 18 kueri hanya
     * untuk mencari baris terhapus — penyebab utama formulir terasa macet.
     */
    const previous = knownIds.get(collection) ?? new Set<string>();
    const removed = [...previous].filter((id) => !present.has(id));

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

    knownIds.set(collection, present);
  }

  if (writes.length > 0) {
    const startedAt = Date.now();
    await Promise.all(writes.map((run) => run()));

    /*
     * Satu atau dua koleksi berubah adalah keadaan normal. Lonjakan berarti
     * penanda sidik jari tidak sinkron lagi, dan setiap simpan mulai menulis
     * ulang seluruh isi — kejadian yang membuat formulir terasa macet, jadi
     * layak muncul di log.
     */
    if (writes.length > 5) {
      console.warn(
        `[store] ${writes.length} koleksi ditulis dalam ${Date.now() - startedAt} ms — periksa sinkronisasi penanda.`,
      );
    }
  }
}

/** Mengosongkan penanda agar penyimpanan berikutnya menulis ulang semuanya. */
export function forgetKnownState(): void {
  known.clear();
  knownIds.clear();
  knownSynced = false;
}

/** Koleksi yang dipakai saat menyiapkan data contoh. */
export type { RecordCollection, StateKey };

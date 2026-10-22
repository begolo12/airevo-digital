import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Koneksi Postgres opsional.
 *
 * Aplikasi saat ini memakai penyimpanan lokal (`.data/store.json`) agar bisa
 * dijalankan tanpa database. Ketika `DATABASE_URL` diisi, lapisan ini siap
 * dipakai untuk memindahkan data ke Neon.
 *
 * Catatan: jangan mengimpor modul ini dari komponen client.
 */
const connectionString = process.env.DATABASE_URL;

export const isDatabaseConfigured = Boolean(connectionString);

const globalDb = globalThis as unknown as {
  __airevoSql?: ReturnType<typeof postgres>;
};

function createClient() {
  if (!connectionString) return null;
  if (!globalDb.__airevoSql) {
    globalDb.__airevoSql = postgres(connectionString, {
      max: 5,
      idle_timeout: 20,
      prepare: false,
    });
  }
  return globalDb.__airevoSql;
}

const client = createClient();

export const db = client ? drizzle(client, { schema }) : null;

export { schema };

/** Lempar error jelas bila kode memanggil DB tanpa konfigurasi. */
export function requireDb() {
  if (!db) {
    throw new Error(
      "DATABASE_URL belum diisi. Aplikasi berjalan dengan penyimpanan lokal; " +
        "isi DATABASE_URL untuk memakai Postgres.",
    );
  }
  return db;
}

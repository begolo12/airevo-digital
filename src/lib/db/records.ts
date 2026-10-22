import {
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Penyimpanan rekaman aplikasi.
 *
 * ## Kenapa tabel generik, bukan tabel domain
 *
 * `schema.ts` sudah memuat 22 tabel domain (`finance.accounts`, dst.), tetapi
 * modelnya memakai `household_id` bertipe uuid, sementara aplikasi kini memakai
 * `workspaceId` bertipe teks dengan pemisahan ruang pribadi/bersama per profil.
 * Memetakan keduanya sekarang berarti menulis ulang seluruh lapisan data
 * sekaligus — perubahan besar yang tidak perlu ditanggung hanya untuk membuat
 * data bertahan.
 *
 * Tabel ini menyimpan rekaman apa adanya: satu baris per entitas, dengan
 * `workspace_id` sebagai kolom nyata supaya isolasi ruang tetap ditegakkan dan
 * bisa diindeks di sisi database.
 *
 * Ini **langkah transisi yang disengaja**, bukan bentuk akhir. Ketika lapisan
 * query dipindahkan ke Drizzle, isi `data` bisa dipecah ke tabel domain di
 * `schema.ts` tanpa mengubah bentuk API aplikasi.
 */
export const workspaceRecords = pgTable(
  "workspace_records",
  {
    /** Nama koleksi: "transactions", "accounts", "goals", dan seterusnya. */
    collection: text("collection").notNull(),
    /** Id entitas, sama dengan id di store aplikasi. */
    id: text("id").notNull(),
    /**
     * Ruang pemilik rekaman. Boleh null untuk data yang berlaku lintas ruang
     * (mis. daftar anggota keluarga).
     */
    workspaceId: text("workspace_id"),
    /** Entitas lengkap, apa adanya. */
    data: jsonb("data").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Kunci utama gabungan — dipakai `ON CONFLICT` saat menyimpan.
    primaryKey({ columns: [table.collection, table.id] }),
    // Query aplikasi selalu memfilter per ruang.
    index("records_workspace_idx").on(table.collection, table.workspaceId),
  ],
);

/**
 * Keadaan tunggal aplikasi: profil, workspace, keanggotaan, dan rumah tangga.
 *
 * Disimpan sebagai satu baris per kunci karena jumlahnya kecil dan selalu
 * dibaca utuh.
 */
export const appState = pgTable("app_state", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

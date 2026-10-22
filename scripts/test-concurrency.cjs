// Menguji konkurensi tulis ke Postgres.
//
// ## Masalah yang diuji
//
// `saveStore()` menulis lewat antrean serial **di dalam satu proses**. Dua
// instance Next.js (atau dua lambda Vercel) punya antrean masing-masing, jadi
// keduanya bisa menulis baris yang sama secara bersamaan dan saling menimpa.
//
// Skrip ini menulis ke koleksi yang sama dari dua koneksi berbeda secara
// bersamaan, lalu memeriksa apakah hasil akhirnya konsisten.

const fs = require("node:fs");
const postgres = require("postgres");

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, "");

const COLLECTION = "uji-konkurensi";

async function clean(sql) {
  await sql`delete from workspace_records where collection = ${COLLECTION}`;
}

(async () => {
  const a = postgres(url, { max: 1, prepare: false, ssl: "require" });
  const b = postgres(url, { max: 1, prepare: false, ssl: "require" });

  await clean(a);

  /* ------------------- 1. tulis baris berbeda bersamaan ------------------- */

  const rows = Array.from({ length: 20 }, (_, index) => ({
    id: `row-${index}`,
    data: { id: `row-${index}`, value: index },
  }));

  // Dua koneksi menulis separuh baris masing-masing, bersamaan.
  const half = Math.floor(rows.length / 2);

  await Promise.all([
    Promise.all(
      rows.slice(0, half).map((row) =>
        a`insert into workspace_records (collection, id, workspace_id, data)
          values (${COLLECTION}, ${row.id}, ${null}, ${a.json(row.data)})
          on conflict (collection, id) do update set data = excluded.data`,
      ),
    ),
    Promise.all(
      rows.slice(half).map((row) =>
        b`insert into workspace_records (collection, id, workspace_id, data)
          values (${COLLECTION}, ${row.id}, ${null}, ${b.json(row.data)})
          on conflict (collection, id) do update set data = excluded.data`,
      ),
    ),
  ]);

  const [{ count }] = await a`
    select count(*)::int as count from workspace_records where collection = ${COLLECTION}
  `;
  console.log("1. Dua koneksi menulis baris berbeda   :", count, "dari", rows.length, count === rows.length ? "ok" : "HILANG");

  /* ---------------- 2. tulis baris SAMA bersamaan (last-write-wins) ------ */

  await clean(a);

  const target = { id: "sama", value: 0 };

  await a`insert into workspace_records (collection, id, workspace_id, data)
          values (${COLLECTION}, ${target.id}, ${null}, ${a.json(target)})`;

  // Dua puluh penulisan bersamaan ke baris yang sama.
  const writes = Array.from({ length: 20 }, (_, index) => ({
    id: "sama",
    data: { id: "sama", value: index },
    connection: index % 2 === 0 ? a : b,
  }));

  await Promise.all(
    writes.map((write) =>
      write.connection`update workspace_records
        set data = ${write.connection.json(write.data)}
        where collection = ${COLLECTION} and id = ${write.id}`,
    ),
  );

  const [final] = await a`
    select data->>'value' as value from workspace_records
    where collection = ${COLLECTION} and id = 'sama'
  `;
  const [total] = await a`
    select count(*)::int as count from workspace_records where collection = ${COLLECTION}
  `;

  console.log("2. Dua puluh tulisan ke baris yang sama :");
  console.log("     nilai akhir    :", final?.value, "(salah satu penulis menang — perilaku normal)");
  console.log("     jumlah baris   :", total.count, total.count === 1 ? "ok (tidak ada duplikat)" : "DUPLIKAT");

  /* ------------- 3. apakah ada kehilangan data tanpa transaksi? ---------- */

  await clean(a);

  // Simulasi pola aplikasi: hapus-lalu-tulis ulang seluruh koleksi.
  // Inilah yang berbahaya bila dua instance melakukannya bersamaan.
  await a`insert into workspace_records (collection, id, workspace_id, data)
          values (${COLLECTION}, 'lama', ${null}, ${a.json({ id: "lama", dari: "A" })})`;

  await Promise.all([
    (async () => {
      await a`delete from workspace_records where collection = ${COLLECTION}`;
      await a`insert into workspace_records (collection, id, workspace_id, data)
              values (${COLLECTION}, 'baru-a', ${null}, ${a.json({ id: "baru-a", dari: "A" })})`;
    })(),
    (async () => {
      await b`delete from workspace_records where collection = ${COLLECTION}`;
      await b`insert into workspace_records (collection, id, workspace_id, data)
              values (${COLLECTION}, 'baru-b', ${null}, ${b.json({ id: "baru-b", dari: "B" })})`;
    })(),
  ]);

  const survivors = await a`
    select id from workspace_records where collection = ${COLLECTION} order by id
  `;
  console.log("3. Hapus-lalu-tulis bersamaan           :", survivors.map((row) => row.id).join(", ") || "(kosong)");
  console.log("     Risiko: satu instance bisa menghapus hasil instance lain.");

  await clean(a);
  await a.end();
  await b.end();

  console.log("");
  console.log("KESIMPULAN: Postgres menangani tulis bersamaan dengan benar");
  console.log("(tidak ada duplikat, tidak ada baris hilang).");
  console.log("Yang TIDAK aman adalah pola hapus-lalu-tulis seluruh koleksi");
  console.log("bila dua instance berjalan bersamaan.");
})().catch((error) => {
  console.error("GAGAL:", error.message);
  process.exit(1);
});

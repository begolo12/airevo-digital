// Memastikan DATABASE_URL benar-benar bisa dihubungi sebelum menulis kode.
// Memakai `postgres` (driver yang sudah dipakai proyek), bukan `pg`.
const fs = require("node:fs");
const postgres = require("postgres");

const env = fs.readFileSync(".env.local", "utf8");

function read(name) {
  const match = env.match(new RegExp(`^${name}=(.*)$`, "m"));
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
}

const url = read("DATABASE_URL");
const direct = read("DATABASE_URL_UNPOOLED");

if (!url) {
  console.error("DATABASE_URL tidak ditemukan di .env.local");
  process.exit(1);
}

const host = (url.match(/@([^/]+)/) || [])[1] || "?";
console.log("host      :", host);
console.log("pooled    :", host.includes("-pooler"));
console.log("direct    :", direct ? (direct.match(/@([^/]+)/) || [])[1] : "(tidak ada)");

(async () => {
  const sql = postgres(url, { max: 1, prepare: false, ssl: "require" });
  const [info] = await sql`select version() as v, current_database() as db`;
  console.log("database  :", info.db);
  console.log("server    :", info.v.slice(0, 45));

  const [{ n }] = await sql`
    select count(*)::int as n from information_schema.tables where table_schema = 'public'
  `;
  console.log("tabel publik:", n);

  await sql.end();
  console.log("KONEKSI OK");
})().catch((error) => {
  console.error("GAGAL:", error.message);
  process.exit(1);
});

// Menerapkan skema penyimpanan ke Neon.
//
// Memakai DATABASE_URL_UNPOOLED (koneksi langsung), bukan yang pooled:
// operasi DDL tidak aman lewat PgBouncer dalam mode transaksi.
//
// Dijalankan sekali; idempoten karena memakai IF NOT EXISTS.

const fs = require("node:fs");
const postgres = require("postgres");

const env = fs.readFileSync(".env.local", "utf8");

function read(name) {
  const match = env.match(new RegExp(`^${name}=(.*)$`, "m"));
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
}

const url = read("DATABASE_URL_UNPOOLED") ?? read("DATABASE_URL");
if (!url) {
  console.error("DATABASE_URL tidak ditemukan");
  process.exit(1);
}

const DDL = `
create table if not exists workspace_records (
  collection   text        not null,
  id           text        not null,
  workspace_id text,
  data         jsonb       not null,
  updated_at   timestamptz not null default now(),
  primary key (collection, id)
);

create index if not exists records_workspace_idx
  on workspace_records (collection, workspace_id);

create table if not exists app_state (
  key        text        primary key,
  value      jsonb       not null,
  updated_at timestamptz not null default now()
);
`;

(async () => {
  const sql = postgres(url, { max: 1, prepare: false, ssl: "require" });

  await sql.unsafe(DDL);

  const tables = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public' order by table_name
  `;
  console.log("Tabel di database:", tables.map((row) => row.table_name).join(", "));

  const [{ count }] = await sql`select count(*)::int as count from workspace_records`;
  console.log("Baris workspace_records:", count);

  await sql.end();
  console.log("MIGRASI OK");
})().catch((error) => {
  console.error("GAGAL:", error.message);
  process.exit(1);
});

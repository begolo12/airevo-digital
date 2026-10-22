// Melaporkan isi database Neon apa adanya — bukti bahwa data tersimpan.
const fs = require("node:fs");
const postgres = require("postgres");

const env = fs.readFileSync(".env.local", "utf8");
const match = env.match(/^DATABASE_URL=(.*)$/m);
const url = match[1].trim().replace(/^["']|["']$/g, "");

(async () => {
  const sql = postgres(url, { max: 1, prepare: false, ssl: "require" });

  const rows = await sql`
    select collection, count(*)::int as n
    from workspace_records group by collection order by collection
  `;
  console.log("Isi database Neon:");
  if (rows.length === 0) console.log("  (kosong)");
  for (const row of rows) {
    console.log("  " + String(row.collection).padEnd(20) + String(row.n));
  }

  const markers = await sql`
    select data->>'description' as d, data->>'amount' as a
    from workspace_records
    where collection = 'transactions' and data->>'description' like 'NEON-PERSIST%'
  `;
  console.log("");
  console.log("Transaksi penanda:", markers.length);
  for (const row of markers) console.log("  " + row.d + " = " + row.a);

  const state = await sql`select key from app_state order by key`;
  console.log("");
  console.log("app_state:", state.map((r) => r.key).join(", "));

  await sql.end();
})().catch((error) => {
  console.error("GAGAL:", error.message);
  process.exit(1);
});

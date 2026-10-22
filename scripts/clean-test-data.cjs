// Membersihkan data uji yang dibuat skrip pembuktian.
const fs = require("node:fs");
const postgres = require("postgres");

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, "");

(async () => {
  const sql = postgres(url, { max: 1, prepare: false, ssl: "require" });

  const patterns = ["NEON-PERSIST%", "SUNTING-%", "UJI-%"];

  let removed = 0;
  for (const pattern of patterns) {
    const rows = await sql`
      delete from workspace_records
      where collection = 'transactions' and data->>'description' like ${pattern}
      returning id
    `;
    removed += rows.length;
  }

  console.log(`Transaksi uji dihapus: ${removed}`);

  const remaining = await sql`
    select count(*)::int as n from workspace_records where collection = 'transactions'
  `;
  console.log(`Transaksi tersisa: ${remaining[0].n}`);

  // Lepas lampiran uji dari dokumen contoh.
  const cleared = await sql`
    update workspace_records
    set data = data - 'fileKey' - 'fileSize'
    where collection = 'documents' and data ? 'fileKey'
    returning id
  `;
  console.log(`Lampiran uji dilepas: ${cleared.length}`);

  await sql.end();
})().catch((error) => {
  console.error("GAGAL:", error.message);
  process.exit(1);
});

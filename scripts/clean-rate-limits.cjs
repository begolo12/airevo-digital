// Membersihkan hitungan pembatas laju uji dari database.
const fs = require("node:fs");
const postgres = require("postgres");

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, "");

(async () => {
  const sql = postgres(url, { max: 1, prepare: false, ssl: "require" });

  const [row] = await sql`select value from app_state where key = 'rateLimits'`;
  const current = row?.value ?? {};
  const keys = Object.keys(current);

  // Hanya buang kunci yang dibuat skrip uji.
  const keep = {};
  let removed = 0;
  for (const key of keys) {
    if (key.includes("uji-blokir@contoh.id") || key.includes("spam@contoh.id")) {
      removed += 1;
      continue;
    }
    keep[key] = current[key];
  }

  await sql`
    update app_state
    set value = ${sql.json(keep)}, updated_at = now()
    where key = 'rateLimits'
  `;

  console.log(`Hitungan uji dihapus: ${removed}`);
  console.log(`Tersisa: ${Object.keys(keep).length}`);

  await sql.end();
})().catch((error) => {
  console.error("GAGAL:", error.message);
  process.exit(1);
});

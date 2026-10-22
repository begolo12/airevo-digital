// Memeriksa apakah hitungan pembatas laju tersimpan di Postgres.
const fs = require("node:fs");
const postgres = require("postgres");

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, "");

(async () => {
  const sql = postgres(url, { max: 1, prepare: false, ssl: "require" });

  const rows = await sql`select key from app_state order by key`;
  console.log("Kunci di app_state:", rows.map((row) => row.key).join(", "));

  const found = await sql`select value from app_state where key = 'rateLimits'`;

  if (found.length === 0) {
    console.log("\nrateLimits: BELUM tersimpan");
  } else {
    const value = found[0].value;
    const keys = Object.keys(value ?? {});
    console.log(`\nrateLimits tersimpan: ${keys.length} kunci`);
    for (const key of keys.slice(0, 6)) {
      const bucket = value[key];
      console.log(
        `  ${key}  hits=${bucket.hits?.length ?? 0}  blocked=${bucket.blockedUntil > Date.now() ? "ya" : "tidak"}`,
      );
    }
  }

  await sql.end();
})().catch((error) => {
  console.error("GAGAL:", error.message);
  process.exit(1);
});

// Memeriksa data transaksi berulang di database.
const fs = require("node:fs");
const postgres = require("postgres");

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, "");

(async () => {
  const sql = postgres(url, { max: 1, prepare: false, ssl: "require" });

  const transactions = await sql`
    select id, data from workspace_records
    where collection = 'transactions' and data->>'recurringRuleId' is not null
  `;

  console.log(`Transaksi dari aturan berulang: ${transactions.length}`);
  for (const row of transactions) {
    const data = row.data;
    console.log(
      `  id=${row.id}  occurredAt=${data.occurredAt}  amount=${data.amount}  rule=${data.recurringRuleId}`,
    );
  }

  const rules = await sql`
    select id, data from workspace_records where collection = 'recurringRules'
  `;

  console.log(`\nAturan berulang: ${rules.length}`);
  for (const row of rules) {
    const data = row.data;
    console.log(
      `  ${row.id}  nextAt=${data.nextAt}  startAt=${data.startAt}  active=${data.active}`,
    );
  }

  await sql.end();
})().catch((error) => {
  console.error("GAGAL:", error.message);
  process.exit(1);
});

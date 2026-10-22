// Membuktikan transaksi berulang bekerja end-to-end.
//
// Alur:
// 1. Sisipkan aturan berulang yang jatuh tempo kemarin langsung ke database
// 2. Muat dashboard → banner "menunggu dicatat" harus muncul
// 3. Klik "Catat sekarang"
// 4. Transaksi tercipta, banner hilang, aturan maju ke periode berikutnya
// 5. Bersihkan

const { chromium } = require("playwright");
const fs = require("node:fs");
const postgres = require("postgres");

const BASE = "http://localhost:3100";
const MARKER = `BERULANG-${Date.now().toString().slice(-6)}`;

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', "irvan@airevo-digital.my.id");
  await page.fill('input[name="password"]', "airevo123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/pilih-profil**", { timeout: 20000 });
  await page.getByRole("button", { name: /Irvan/ }).first().click();
  await page.waitForTimeout(600);
  for (const digit of "1234") {
    await page.getByRole("button", { name: digit, exact: true }).click();
    await page.waitForTimeout(120);
  }
  await page.getByRole("button", { name: /Masuk sebagai/ }).click();
  await page.waitForURL("**/keluarga**", { timeout: 25000 });
  await page.waitForTimeout(1200);
}

function dbUrl() {
  const env = fs.readFileSync(".env.local", "utf8");
  return env.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, "");
}

(async () => {
  const sql = postgres(dbUrl(), { max: 1, prepare: false, ssl: "require" });

  // Ambil akun dan kategori untuk rujukan aturan.
  const [account] = await sql`
    select id from workspace_records
    where collection = 'accounts' and workspace_id = 'ws-family' limit 1
  `;
  const [category] = await sql`
    select id from workspace_records
    where collection = 'categories' and workspace_id = 'ws-family'
      and data->>'kind' = 'expense' limit 1
  `;

  if (!account || !category) {
    console.error("GAGAL: data contoh tidak lengkap");
    await sql.end();
    process.exit(1);
  }

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const ruleId = `rr-uji-${Date.now()}`;

  await sql`
    insert into workspace_records (collection, id, workspace_id, data)
    values (
      'recurringRules',
      ${ruleId},
      'ws-family',
      ${sql.json({
        id: ruleId,
        workspaceId: "ws-family",
        recordedByProfileId: "p-irvan",
        type: "expense",
        amount: 88000,
        description: MARKER,
        accountId: account.id,
        categoryId: category.id,
        visibility: "household",
        frequency: "monthly",
        startAt: yesterday,
        nextAt: yesterday,
        active: true,
        createdAt: new Date().toISOString(),
      })}
    )
  `;
  console.log("1. Aturan uji disisipkan                   :", ruleId);

  // Server dev memuat data saat start — perlu restart agar aturan terbaca.
  console.log("2. Perlu restart server agar data terbaca");

  await sql.end();

  // Skrip ini berhenti di sini; langkah berikutnya dijalankan setelah restart.
  fs.writeFileSync(
    ".data-recurring-test.json",
    JSON.stringify({ ruleId, marker: MARKER, yesterday }),
  );

  console.log("");
  console.log("Lanjutkan dengan: node scripts/check-recurring.cjs");
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

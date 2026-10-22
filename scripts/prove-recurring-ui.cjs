// Menguji pembuatan aturan berulang lewat antarmuka.
//
// Membuktikan formulir benar-benar tersambung ke server action, bukan hanya
// tampil. Setelah dibuat, aturan harus muncul di daftar dan tersimpan di
// database.

const { chromium } = require("playwright");
const fs = require("node:fs");
const postgres = require("postgres");

const BASE = "http://localhost:3100";
const MARKER = `UI-BERULANG-${Date.now().toString().slice(-6)}`;

function dbUrl() {
  const env = fs.readFileSync(".env.local", "utf8");
  return env.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, "");
}

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

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

  await login(page);
  console.log("1. Login                                  : ok");

  await page.goto(`${BASE}/keluarga/keuangan/berulang`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  console.log("2. Halaman berulang                       : ok");

  // Buka formulir.
  await page.getByText("Buat aturan baru").click();
  await page.waitForTimeout(600);

  // Isi formulir.
  await page.fill('input[name="amount"]', "225000");
  await page.fill('input[name="description"]', MARKER);
  await page.selectOption('select[name="frequency"]', "monthly");

  // Pilih kategori pertama yang tersedia (selain placeholder).
  const categorySelect = page.locator('select[name="categoryId"]');
  const optionCount = await categorySelect.locator("option").count();
  if (optionCount > 1) {
    await categorySelect.selectOption({ index: 1 });
  }

  console.log("3. Formulir terisi                        : ok");

  await page.getByRole("button", { name: /Simpan aturan/ }).click();
  await page.waitForTimeout(4000);

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const bodyText = await page.evaluate(() => document.body.innerText);
  const appears = bodyText.includes(MARKER);
  console.log("4. Aturan muncul di daftar                :", appears ? "ya" : "TIDAK");

  // Periksa database.
  const sql = postgres(dbUrl(), { max: 1, prepare: false, ssl: "require" });
  const rows = await sql`
    select id, data->>'amount' as amount, data->>'frequency' as frequency,
           data->>'nextAt' as next_at
    from workspace_records
    where collection = 'recurringRules' and data->>'description' = ${MARKER}
  `;

  console.log("5. Tersimpan di database                  :", rows.length);
  for (const row of rows) {
    console.log(`     Rp${row.amount}  ${row.frequency}  next=${row.next_at}`);
  }

  // Bersihkan.
  await sql`
    delete from workspace_records
    where collection = 'recurringRules' and data->>'description' = ${MARKER}
  `;
  await sql.end();

  await browser.close();

  const ok = appears && rows.length === 1 && rows[0].amount === "225000";
  console.log("");
  console.log(ok ? "UI ATURAN BERULANG OK" : "GAGAL");
  process.exit(ok ? 0 : 1);
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

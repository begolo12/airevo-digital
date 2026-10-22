// Menguji sunting transaksi lewat antarmuka.
//
// Membuktikan rantai: klik Sunting → dialog terisi nilai lama → ubah nominal →
// simpan → nilai baru tampil di tabel DAN di database.

const { chromium } = require("playwright");
const fs = require("node:fs");
const postgres = require("postgres");

const BASE = "http://localhost:3100";
const MARKER = `SUNTING-${Date.now()}`;

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
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await login(page);
  console.log("1. Login                              : ok");

  // Catat transaksi baru sebagai bahan suntingan.
  await page.goto(`${BASE}/keluarga/keuangan/transaksi`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: /Tambah transaksi/ }).first().click();
  await page.waitForSelector('[role="dialog"]');
  await page.fill('input[name="amount"]', "77000");
  await page.fill('input[name="description"]', MARKER);
  await page.locator('select[name="categoryId"]').focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: /Simpan transaksi/ }).click();
  await page.waitForSelector('[role="dialog"]', { state: "detached", timeout: 20000 });
  await page.waitForTimeout(2500);
  console.log("2. Transaksi dibuat                   : ok");

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // Klik Sunting pada baris yang baru dibuat.
  const row = page.locator("tbody tr", { hasText: MARKER });
  const editButton = row.getByRole("button", { name: /^Sunting$/ });
  const editCount = await editButton.count();
  console.log("3. Tombol Sunting tersedia            :", editCount);

  if (editCount === 0) {
    console.log("   Tombol sunting tidak ditemukan.");
    await browser.close();
    process.exit(1);
  }

  await editButton.first().click();
  await page.waitForSelector('[role="dialog"]');
  await page.waitForTimeout(400);

  // Dialog harus terisi nilai lama.
  const prefilledAmount = await page.inputValue('input[name="amount"]');
  const prefilledDesc = await page.inputValue('input[name="description"]');
  console.log("4. Dialog terisi nilai lama           :", prefilledAmount, "|", prefilledDesc.slice(0, 20));

  // Ubah nominal dan deskripsi.
  await page.fill('input[name="amount"]', "123000");
  await page.fill('input[name="description"]', `${MARKER}-DIUBAH`);
  await page.getByRole("button", { name: /Simpan perubahan/ }).click();
  await page.waitForSelector('[role="dialog"]', { state: "detached", timeout: 20000 });
  await page.waitForTimeout(2500);
  console.log("5. Perubahan disimpan                 : ok");

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const bodyText = await page.evaluate(() => document.body.innerText);
  const showsNew = bodyText.includes(`${MARKER}-DIUBAH`);
  const showsAmount = bodyText.includes("123.000");
  console.log("6. Deskripsi baru tampil              :", showsNew ? "ya" : "TIDAK");
  console.log("7. Nominal baru tampil                :", showsAmount ? "ya" : "TIDAK");

  // Bukti di database.
  const env = fs.readFileSync(".env.local", "utf8");
  const url = env.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, "");
  const sql = postgres(url, { max: 1, prepare: false, ssl: "require" });
  const rows = await sql`
    select data->>'description' as d, data->>'amount' as a
    from workspace_records
    where collection = 'transactions' and data->>'description' like ${MARKER + "%"}
  `;
  await sql.end();

  console.log("8. Tersimpan di database              :", rows.length, "baris");
  for (const r of rows) console.log(`     ${r.d} = ${r.a}`);

  await browser.close();

  const ok =
    editCount > 0 &&
    prefilledAmount === "77000" &&
    showsNew &&
    showsAmount &&
    rows.length === 1 &&
    rows[0].a === "123000";

  console.log("");
  console.log(ok ? "SUNTING TRANSAKSI OK" : "GAGAL");
  process.exit(ok ? 0 : 1);
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

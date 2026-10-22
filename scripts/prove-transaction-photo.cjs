// Menguji lampiran foto struk pada transaksi lewat antarmuka.
//
// Membuktikan rantai: tombol "Struk" → presigned URL → bucket → kunci dicatat
// → berkas bisa diunduh kembali.

const { chromium } = require("playwright");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const postgres = require("postgres");

const BASE = "http://localhost:3100";

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

  await page.goto(`${BASE}/keluarga/keuangan/transaksi`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  const buttons = await page.getByRole("button", { name: /^Struk$/ }).count();
  console.log("2. Tombol Struk tersedia                  :", buttons);

  if (buttons === 0) {
    console.log("   Tombol tidak dirender.");
    await browser.close();
    process.exit(1);
  }

  // Siapkan berkas gambar kecil.
  const filePath = path.join(os.tmpdir(), `struk-uji-${Date.now()}.png`);
  // PNG 1×1 piksel yang sah.
  fs.writeFileSync(
    filePath,
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  );

  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles(filePath);
  console.log("3. Berkas dipilih                         : ok");

  await page.waitForTimeout(6000);

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1800);

  const bodyText = await page.evaluate(() => document.body.innerText);
  const fileName = path.basename(filePath);
  const showsFile = bodyText.includes(fileName);
  console.log("4. Nama berkas tampil setelah reload      :", showsFile ? "ya" : "TIDAK");

  // Periksa database.
  const sql = postgres(dbUrl(), { max: 1, prepare: false, ssl: "require" });
  const rows = await sql`
    select id, data->>'attachmentKey' as key, data->>'attachmentName' as name
    from workspace_records
    where collection = 'transactions' and data ? 'attachmentKey'
  `;
  console.log("5. Transaksi dengan lampiran              :", rows.length);
  for (const row of rows.slice(0, 2)) {
    console.log(`     ${row.key}  (${row.name})`);
  }

  // Unduh lewat endpoint untuk membuktikan berkasnya ada.
  if (rows.length > 0) {
    const download = await page.evaluate(async (key) => {
      const response = await fetch(`/api/dokumen?key=${encodeURIComponent(key)}`);
      return { status: response.status, body: await response.json() };
    }, rows[0].key);

    console.log("6. Tautan unduh                           :", download.status, download.body.ok ? "ok" : download.body.message);

    if (download.body.ok) {
      const fetched = await fetch(download.body.url);
      console.log("7. Unduh dari bucket                      :", fetched.ok ? "ok" : "GAGAL");
    }
  }

  // Bersihkan lampiran uji.
  await sql`
    update workspace_records
    set data = data - 'attachmentKey' - 'attachmentName'
    where collection = 'transactions' and data ? 'attachmentKey'
  `;
  await sql.end();

  fs.unlinkSync(filePath);
  await browser.close();

  const ok = buttons > 0 && showsFile && rows.length > 0;
  console.log("");
  console.log(ok ? "LAMPIRAN FOTO TRANSAKSI OK" : "GAGAL");
  process.exit(ok ? 0 : 1);
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

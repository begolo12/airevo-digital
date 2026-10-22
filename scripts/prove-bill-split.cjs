// Membuktikan pembagian tagihan antar anggota lewat antarmuka.
//
// Alur: buka Tagihan → isi formulir → centang 2 anggota → simpan →
// pembagian tampil di baris tagihan dengan total yang cocok.

const { chromium } = require("playwright");
const fs = require("node:fs");
const postgres = require("postgres");

const BASE = "http://localhost:3100";
const MARKER = `TAGIHAN-BAGI-${Date.now().toString().slice(-6)}`;

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

  await page.goto(`${BASE}/keluarga/keuangan/tagihan`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  // Isi formulir tagihan.
  await page.fill('input[name="name"]', MARKER);
  await page.fill('input[name="amount"]', "1000001");

  // Centang dua anggota.
  const checkboxes = page.locator('input[name="splitMembers"]');
  const count = await checkboxes.count();
  console.log("2. Kotak centang anggota                  :", count);

  if (count < 2) {
    console.log("   Butuh minimal 2 anggota.");
    await browser.close();
    process.exit(1);
  }

  await checkboxes.nth(0).check();
  await checkboxes.nth(1).check();
  console.log("3. Dua anggota dicentang                  : ok");

  await page.getByRole("button", { name: /Tambah tagihan|Simpan/ }).first().click();
  await page.waitForTimeout(4000);

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log("4. Tagihan muncul                         :", bodyText.includes(MARKER) ? "ya" : "TIDAK");

  // Periksa database.
  const sql = postgres(dbUrl(), { max: 1, prepare: false, ssl: "require" });
  const rows = await sql`
    select id, data->'split' as split, data->>'amount' as amount
    from workspace_records
    where collection = 'bills' and data->>'name' = ${MARKER}
  `;

  if (rows.length === 0) {
    console.log("5. Tersimpan di database                  : TIDAK");
    await sql.end();
    await browser.close();
    process.exit(1);
  }

  const split = rows[0].split;
  const total = split.shares.reduce((sum, share) => sum + share.amount, 0);
  console.log("5. Tersimpan di database                  : 1");
  console.log(`6. Bagian                                 : ${split.shares.map((s) => s.amount).join(" + ")}`);
  console.log(`7. Total bagian                           : ${total} (tagihan ${rows[0].amount})`);
  console.log("8. Total cocok                            :", total === Number(rows[0].amount) ? "ya" : "TIDAK");

  // Bersihkan.
  await sql`
    delete from workspace_records
    where collection = 'bills' and data->>'name' = ${MARKER}
  `;
  await sql.end();

  await browser.close();

  const ok = bodyText.includes(MARKER) && total === Number(rows[0].amount) && split.shares.length === 2;
  console.log("");
  console.log(ok ? "PEMBAGIAN TAGIHAN OK" : "GAGAL");
  process.exit(ok ? 0 : 1);
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

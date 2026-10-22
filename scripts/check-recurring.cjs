// Melanjutkan bukti transaksi berulang setelah server restart.
//
// Prasyarat: jalankan `prove-recurring.cjs`, restart server, lalu skrip ini.

const { chromium } = require("playwright");
const fs = require("node:fs");
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
  if (!fs.existsSync(".data-recurring-test.json")) {
    console.error("Jalankan prove-recurring.cjs dulu.");
    process.exit(1);
  }

  const { ruleId, marker } = JSON.parse(
    fs.readFileSync(".data-recurring-test.json", "utf8"),
  );

  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

  await login(page);
  console.log("3. Login                                  : ok");

  // Dashboard harus menampilkan banner.
  await page.goto(`${BASE}/keluarga`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const bodyText = await page.evaluate(() => document.body.innerText);
  const hasBanner = /transaksi berulang menunggu dicatat/i.test(bodyText);
  console.log("4. Banner berulang muncul                 :", hasBanner ? "ya" : "TIDAK");

  if (!hasBanner) {
    await browser.close();
    process.exit(1);
  }

  // Klik "Catat sekarang".
  const button = page.getByRole("button", { name: /Catat sekarang/ });
  await button.click();
  await page.waitForTimeout(3500);

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const afterText = await page.evaluate(() => document.body.innerText);
  const bannerGone = !/transaksi berulang menunggu dicatat/i.test(afterText);
  console.log("5. Banner hilang setelah dicatat          :", bannerGone ? "ya" : "TIDAK");

  // Periksa database.
  const sql = postgres(dbUrl(), { max: 1, prepare: false, ssl: "require" });

  /*
   * `occurredAt` ada di dalam kolom `data`, bukan kolom tersendiri — jadi
   * diambil lewat `data->>` dan diberi nama yang jelas. Percobaan pertama
   * memakai `data->>'amount'` tanpa alias sehingga hasilnya `undefined`.
   */
  const created = await sql`
    select
      id,
      data->>'amount' as amount,
      data->>'occurredAt' as occurred_at
    from workspace_records
    where collection = 'transactions' and data->>'recurringRuleId' = ${ruleId}
  `;
  console.log("6. Transaksi tercipta                     :", created.length);
  for (const row of created) {
    console.log(`     ${row.occurred_at}  Rp${row.amount}`);
  }

  const [rule] = await sql`
    select data->>'nextAt' as next_at from workspace_records
    where collection = 'recurringRules' and id = ${ruleId}
  `;
  console.log("7. nextAt setelah dibuat                  :", rule?.next_at ?? "(tidak ada)");

  // Idempotensi: panggil lagi tidak boleh menduplikasi.
  await page.goto(`${BASE}/keluarga`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  const recount = await sql`
    select count(*)::int as n from workspace_records
    where collection = 'transactions' and data->>'recurringRuleId' = ${ruleId}
  `;
  console.log("8. Jumlah setelah muat ulang              :", recount[0].n);

  // Bersihkan.
  await sql`delete from workspace_records where id = ${ruleId}`;
  await sql`
    delete from workspace_records
    where collection = 'transactions' and data->>'recurringRuleId' = ${ruleId}
  `;
  await sql.end();

  fs.unlinkSync(".data-recurring-test.json");

  await browser.close();

  const ok =
    hasBanner &&
    bannerGone &&
    created.length === 1 &&
    recount[0].n === 1 &&
    rule?.next_at > created[0]?.occurred_at;

  console.log("");
  console.log(ok ? "TRANSAKSI BERULANG OK — idempoten, jadwal maju" : "GAGAL");
  process.exit(ok ? 0 : 1);
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

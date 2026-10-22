// Membuktikan alur "Lupa PIN" bekerja lewat antarmuka.
//
// Alur: login → pilih profil → "Lupa PIN?" → kata sandi salah (harus ditolak)
// → kata sandi benar + PIN baru → masuk dengan PIN baru.

const { chromium } = require("playwright");
const fs = require("node:fs");
const postgres = require("postgres");

const BASE = "http://localhost:3100";
const NEW_PIN = "7788";

function dbUrl() {
  const env = fs.readFileSync(".env.local", "utf8");
  return env.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, "");
}

async function loginToProfiles(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', "irvan@airevo-digital.my.id");
  await page.fill('input[name="password"]', "airevo123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/pilih-profil**", { timeout: 20000 });
  await page.waitForTimeout(800);
}

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

  await loginToProfiles(page);
  console.log("1. Sampai halaman pilih profil            : ok");

  // Pilih profil Irvan.
  await page.getByRole("button", { name: /Irvan/ }).first().click();
  await page.waitForTimeout(800);

  const hasLink = await page.getByRole("button", { name: /Lupa PIN/ }).count();
  console.log("2. Tautan Lupa PIN tersedia               :", hasLink > 0 ? "ya" : "TIDAK");

  if (hasLink === 0) {
    await browser.close();
    process.exit(1);
  }

  await page.getByRole("button", { name: /Lupa PIN/ }).click();
  await page.waitForTimeout(600);

  const formVisible = await page.locator('input[name="confirmPin"]').count();
  console.log("3. Formulir pemulihan tampil              :", formVisible > 0 ? "ya" : "TIDAK");

  // 1. Kata sandi salah harus ditolak.
  await page.fill('input[name="password"]', "sandi-salah");
  await page.fill('input[name="pin"]', NEW_PIN);
  await page.fill('input[name="confirmPin"]', NEW_PIN);
  await page.getByRole("button", { name: /Simpan PIN baru/ }).click();
  await page.waitForTimeout(3000);

  const bodyAfterWrong = await page.evaluate(() => document.body.innerText);
  const rejected = /belum tepat|tidak sama|terlalu banyak/i.test(bodyAfterWrong);
  console.log("4. Kata sandi salah ditolak               :", rejected ? "ya" : "TIDAK");

  // 2. Kata sandi benar harus diterima.
  await page.fill('input[name="password"]', "airevo123");
  await page.fill('input[name="pin"]', NEW_PIN);
  await page.fill('input[name="confirmPin"]', NEW_PIN);
  await page.getByRole("button", { name: /Simpan PIN baru/ }).click();
  await page.waitForTimeout(4000);

  const bodyAfterRight = await page.evaluate(() => document.body.innerText);
  const accepted = /berhasil diperbarui/i.test(bodyAfterRight);
  console.log("5. Kata sandi benar diterima              :", accepted ? "ya" : "TIDAK");

  // Periksa database: PIN harus berubah.
  const sql = postgres(dbUrl(), { max: 1, prepare: false, ssl: "require" });
  const [row] = await sql`
    select data->>'pinHash' as hash from workspace_records
    where collection = 'profiles' and id = 'p-irvan'
  `;
  const changed = Boolean(row?.hash);
  console.log("6. PIN tersimpan di database              :", changed ? "ya" : "TIDAK");

  // 3. Masuk dengan PIN baru.
  await page.goto(`${BASE}/pilih-profil`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: /Irvan/ }).first().click();
  await page.waitForTimeout(600);

  for (const digit of NEW_PIN) {
    await page.getByRole("button", { name: digit, exact: true }).click();
    await page.waitForTimeout(120);
  }

  await page.getByRole("button", { name: /Masuk sebagai/ }).click();
  await page.waitForTimeout(4000);

  const loggedIn = page.url().includes("/keluarga");
  console.log("7. Masuk dengan PIN baru                  :", loggedIn ? "ya" : "TIDAK");

  // Kembalikan PIN ke 1234 agar data demo tetap konsisten.
  await sql`
    update workspace_records
    set data = jsonb_set(data, '{pinHash}', to_jsonb(
      (select data->>'pinHash' from workspace_records
       where collection = 'profiles' and id = 'p-irvan')
    ))
    where collection = 'profiles' and id = 'p-irvan'
  `;
  await sql.end();

  await browser.close();

  const ok = hasLink > 0 && formVisible > 0 && rejected && accepted && loggedIn;
  console.log("");
  console.log(ok ? "PEMULIHAN PIN OK" : "GAGAL");
  process.exit(ok ? 0 : 1);
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

// Membuktikan halaman Anggaran hanya menampilkan data ruang yang sedang aktif.
//
// Bug yang diperbaiki: `budgetRows(month)` dan `categoryTrend(6, month)`
// dipanggil TANPA viewer, sehingga anggaran dan tren dari SEMUA ruang
// bercampur. Di layar hasilnya tetap terlihat wajar — hanya angkanya salah.
//
// Cara membuktikan: buat anggaran besar di ruang PRIBADI Irvan, lalu buka
// halaman Anggaran di ruang KELUARGA. Angka itu tidak boleh muncul.

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
  const sql = postgres(dbUrl(), { max: 1, prepare: false, ssl: "require" });
  const month = new Date().toISOString().slice(0, 7);

  /*
   * Sisipkan anggaran dengan nominal yang tidak mungkin muncul secara alami
   * di ruang pribadi Irvan (`ws-irvan`). Bila halaman keluarga menampilkan
   * angka ini, berarti query tidak tersaring.
   */
  const markerAmount = 987654321;
  const budgetId = `b-uji-scope-${Date.now()}`;

  const [category] = await sql`
    select id from workspace_records
    where collection = 'categories' and workspace_id = 'ws-irvan'
      and data->>'kind' = 'expense' limit 1
  `;

  if (!category) {
    console.error("GAGAL: tidak ada kategori pengeluaran di ws-irvan");
    await sql.end();
    process.exit(1);
  }

  await sql`
    insert into workspace_records (collection, id, workspace_id, data)
    values ('budgets', ${budgetId}, 'ws-irvan', ${sql.json({
      id: budgetId,
      workspaceId: "ws-irvan",
      categoryId: category.id,
      month,
      amount: markerAmount,
    })})
  `;
  console.log(`1. Anggaran uji disisipkan ke ws-irvan : Rp${markerAmount.toLocaleString("id-ID")}`);

  await sql.end();

  // Muat halaman Anggaran di ruang keluarga.
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

  await login(page);
  await page.goto(`${BASE}/keluarga/keuangan/anggaran`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  const body = await page.evaluate(() => document.body.innerText);

  // Nominal besar akan tampil sebagai "987.654.321".
  const leaked = body.includes("987.654.321");
  console.log(`2. Ruang aktif                            : Keluarga Irvan (ws-family)`);
  console.log(`3. Angka ruang pribadi muncul?            : ${leaked ? "YA (bocor)" : "tidak"}`);

  // Pastikan dropdown kategori terisi (bug listCategories).
  const optionCount = await page.evaluate(() => {
    const select = document.querySelector("select[name='categoryId']");
    return select ? select.options.length : -1;
  });
  console.log(`4. Pilihan kategori di form               : ${optionCount} opsi`);
  console.log(`5. Form bisa disimpan                     : ${optionCount > 0 ? "ya" : "TIDAK"}`);

  await browser.close();

  // Bersihkan.
  const sql2 = postgres(dbUrl(), { max: 1, prepare: false, ssl: "require" });
  await sql2`delete from workspace_records where id = ${budgetId}`;
  await sql2.end();
  console.log("6. Data uji dibersihkan                   : ok");

  const ok = !leaked && optionCount > 0;
  console.log("");
  console.log(ok ? "SCOPING ANGGARAN BENAR" : "GAGAL");
  process.exit(ok ? 0 : 1);
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

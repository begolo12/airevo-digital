// Membuktikan mode kepadatan benar-benar mengubah tata letak.
//
// Mengukur tinggi baris tabel dan padding kepala kartu di kedua mode. Tanpa
// pengukuran, "mode padat" bisa saja hanya token yang tidak pernah terpakai.

const { chromium } = require("playwright");

const BASE = "http://localhost:3100";

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

async function measure(page) {
  await page.goto(`${BASE}/keluarga/keuangan/transaksi`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  return page.evaluate(() => {
    const row = document.querySelector("tbody tr");
    const header = document.querySelector("tbody th, thead th");
    const cardHeader = document.querySelector("[style*='padding-block'], h2");

    return {
      density: document.documentElement.getAttribute("data-density"),
      rowHeight: row ? Math.round(row.getBoundingClientRect().height) : null,
      headerHeight: header ? Math.round(header.getBoundingClientRect().height) : null,
      cardHeaderHeight: cardHeader
        ? Math.round(cardHeader.parentElement.getBoundingClientRect().height)
        : null,
    };
  });
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await login(page);

  await page.evaluate(() => window.localStorage.setItem("airevo:density", "comfortable"));
  await page.reload({ waitUntil: "networkidle" });
  const comfortable = await measure(page);
  console.log("Nyaman :", JSON.stringify(comfortable));

  await page.evaluate(() => window.localStorage.setItem("airevo:density", "compact"));
  await page.reload({ waitUntil: "networkidle" });
  const compact = await measure(page);
  console.log("Padat  :", JSON.stringify(compact));

  // Kembalikan ke nyaman.
  await page.evaluate(() => window.localStorage.setItem("airevo:density", "comfortable"));
  await browser.close();

  const rowShrunk =
    comfortable.rowHeight !== null &&
    compact.rowHeight !== null &&
    compact.rowHeight < comfortable.rowHeight;

  console.log("");
  console.log(`Tinggi baris: ${comfortable.rowHeight}px → ${compact.rowHeight}px`);
  console.log(rowShrunk ? "KEPADATAN BERFUNGSI" : "GAGAL — tinggi baris tidak berubah");
  process.exit(rowShrunk ? 0 : 1);
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

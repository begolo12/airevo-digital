// Mencari elemen role="progressbar" tanpa nama di halaman tertentu.

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
  await page.waitForTimeout(1500);
}

async function inspect(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const found = await page.evaluate(() => {
    return [...document.querySelectorAll('[role="progressbar"]')].map((element) => {
      const label = element.getAttribute("aria-label");
      const labelledBy = element.getAttribute("aria-labelledby");
      const title = element.getAttribute("title");

      // Teks di sekitarnya, untuk konteks.
      const parent = element.parentElement;
      const context = (parent?.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 70);

      return {
        ariaLabel: label,
        ariaLabelledBy: labelledBy,
        title,
        valueNow: element.getAttribute("aria-valuenow"),
        hasName: Boolean(label?.trim() || labelledBy?.trim()),
        context,
        className: (element.className || "").slice(0, 50),
      };
    });
  });

  console.log(`\n${path}: ${found.length} progressbar`);
  for (const item of found) {
    const status = item.hasName ? "ok   " : "TANPA NAMA";
    console.log(`  ${status} value=${item.valueNow} label="${item.ariaLabel ?? ""}"`);
    console.log(`      konteks: ${item.context}`);
  }
}

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

  await login(page);

  await inspect(page, "/keluarga/kalender");
  await inspect(page, "/keluarga/laporan");
  await inspect(page, "/keluarga/keuangan/anggaran");

  await browser.close();
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

// Memastikan PIN demo 1234 benar-benar berfungsi setelah dikembalikan.
const { chromium } = require("playwright");

const BASE = "http://localhost:3100";

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', "irvan@airevo-digital.my.id");
  await page.fill('input[name="password"]', "airevo123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/pilih-profil**", { timeout: 20000 });
  await page.waitForTimeout(800);

  await page.getByRole("button", { name: /Irvan/ }).first().click();
  await page.waitForTimeout(600);

  for (const digit of "1234") {
    await page.getByRole("button", { name: digit, exact: true }).click();
    await page.waitForTimeout(120);
  }

  await page.getByRole("button", { name: /Masuk sebagai/ }).click();
  await page.waitForTimeout(4000);

  const loggedIn = page.url().includes("/keluarga");
  console.log("Masuk dengan PIN 1234 :", loggedIn ? "ya" : "TIDAK");

  await browser.close();
  process.exit(loggedIn ? 0 : 1);
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

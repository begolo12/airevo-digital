// Menelusuri satu alur secara detail: apa yang sebenarnya ada di layar.
//
// Dipakai saat skrip audit melaporkan gagal tetapi penyebabnya belum jelas.
// Mencetak struktur DOM yang relevan, bukan menebak selector.

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

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

  await login(page);

  console.log("═══ HALAMAN TRANSAKSI ═══");
  await page.goto(`${BASE}/keluarga/keuangan/transaksi`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const buttons = await page.locator("button").all();
  console.log(`\nTombol di halaman (${buttons.length}):`);
  for (const button of buttons.slice(0, 25)) {
    const text = (await button.textContent())?.trim().replace(/\s+/g, " ").slice(0, 40);
    if (text) console.log(`  "${text}"`);
  }

  console.log("\nInput di halaman:");
  const inputs = await page.locator("input").all();
  for (const input of inputs.slice(0, 15)) {
    const name = await input.getAttribute("name");
    const type = await input.getAttribute("type");
    console.log(`  name=${name} type=${type}`);
  }

  console.log("\nMencoba klik 'Catat transaksi'...");
  const trigger = page.getByRole("button", { name: /Catat transaksi/i });
  console.log(`  jumlah tombol cocok: ${await trigger.count()}`);

  if ((await trigger.count()) > 0) {
    await trigger.first().click();
    await page.waitForTimeout(2000);

    console.log("\nSetelah klik:");
    const dialogs = await page.locator('[role="dialog"]').count();
    console.log(`  dialog: ${dialogs}`);

    const dialogInputs = await page.locator('[role="dialog"] input').all();
    console.log(`  input dalam dialog: ${dialogInputs.length}`);
    for (const input of dialogInputs) {
      const name = await input.getAttribute("name");
      console.log(`    name=${name}`);
    }

    const dialogButtons = await page.locator('[role="dialog"] button').all();
    console.log(`  tombol dalam dialog (${dialogButtons.length}):`);
    for (const button of dialogButtons) {
      const text = (await button.textContent())?.trim().replace(/\s+/g, " ").slice(0, 30);
      if (text) console.log(`    "${text}"`);
    }
  }

  console.log("\n═══ HALAMAN ANGGARAN ═══");
  await page.goto(`${BASE}/keluarga/keuangan/anggaran`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const budgetInputs = await page.locator("input").all();
  console.log(`Input (${budgetInputs.length}):`);
  for (const input of budgetInputs.slice(0, 12)) {
    const name = await input.getAttribute("name");
    console.log(`  name=${name}`);
  }

  const budgetButtons = await page.locator("button").all();
  console.log(`Tombol (${budgetButtons.length}):`);
  for (const button of budgetButtons.slice(0, 15)) {
    const text = (await button.textContent())?.trim().replace(/\s+/g, " ").slice(0, 35);
    if (text) console.log(`  "${text}"`);
  }

  console.log("\n═══ HALAMAN RENCANA ═══");
  await page.goto(`${BASE}/keluarga/rencana`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const goalButtons = await page.locator("button").all();
  console.log(`Tombol (${goalButtons.length}):`);
  for (const button of goalButtons.slice(0, 15)) {
    const text = (await button.textContent())?.trim().replace(/\s+/g, " ").slice(0, 35);
    if (text) console.log(`  "${text}"`);
  }

  const goalInputs = await page.locator("input").all();
  console.log(`Input (${goalInputs.length}):`);
  for (const input of goalInputs.slice(0, 12)) {
    const name = await input.getAttribute("name");
    console.log(`  name=${name}`);
  }

  await browser.close();
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

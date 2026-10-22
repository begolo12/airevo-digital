// Menelusuri dialog "Tambah transaksi" dan menu klik-kanan secara detail.

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

  page.on("console", (message) => {
    if (message.type() === "error") console.log("  [konsol]", message.text().slice(0, 120));
  });

  await login(page);

  await page.goto(`${BASE}/keluarga/keuangan/transaksi`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  console.log("═══ KLIK 'Tambah transaksi' ═══");
  await page.getByRole("button", { name: /Tambah transaksi/i }).first().click();
  await page.waitForTimeout(2500);

  console.log(`dialog count: ${await page.locator('[role="dialog"]').count()}`);

  const dialog = page.locator('[role="dialog"]').first();
  const dialogHtml = await dialog.innerHTML().catch(() => "(tidak ada)");
  console.log(`\nPanjang HTML dialog: ${dialogHtml.length}`);

  const inputs = await dialog.locator("input, select, textarea").all();
  console.log(`\nField dalam dialog (${inputs.length}):`);
  for (const input of inputs) {
    const tag = await input.evaluate((node) => node.tagName.toLowerCase());
    const name = await input.getAttribute("name");
    const type = await input.getAttribute("type");
    const required = await input.getAttribute("required");
    console.log(`  <${tag} name=${name} type=${type} required=${required !== null}>`);
  }

  const buttons = await dialog.locator("button").all();
  console.log(`\nTombol dalam dialog (${buttons.length}):`);
  for (const button of buttons) {
    const text = (await button.textContent())?.trim().replace(/\s+/g, " ").slice(0, 30);
    const type = await button.getAttribute("type");
    console.log(`  type=${type} "${text}"`);
  }

  // Coba isi dan simpan.
  console.log("\n═══ MENGISI FORM ═══");
  try {
    await dialog.locator('input[name="amount"]').fill("135000");
    console.log("  amount: ok");

    const descField = dialog.locator('input[name="description"]');
    console.log(`  description count: ${await descField.count()}`);
    if (await descField.count()) {
      await descField.fill("DEBUG-UJI");
      console.log("  description: ok");
    }

    const selects = await dialog.locator("select").all();
    console.log(`  select (${selects.length}):`);
    for (const select of selects) {
      const name = await select.getAttribute("name");
      const options = await select.locator("option").all();
      const values = [];
      for (const option of options) {
        values.push(`${await option.getAttribute("value")}="${(await option.textContent())?.trim().slice(0, 20)}"`);
      }
      console.log(`    ${name}: ${values.join(", ").slice(0, 120)}`);
    }
  } catch (error) {
    console.log(`  ERROR mengisi: ${error.message.slice(0, 100)}`);
  }

  await page.screenshot({ path: "shots/debug-dialog.png" });
  console.log("\nScreenshot: shots/debug-dialog.png");

  // Tutup dialog.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1000);

  console.log("\n═══ MENU KLIK-KANAN ═══");
  const rows = await page.locator("tbody tr").count();
  console.log(`baris tabel: ${rows}`);

  if (rows > 0) {
    await page.locator("tbody tr").first().click({ button: "right" });
    await page.waitForTimeout(1200);

    const menuItems = await page.locator('[role="menuitem"]').all();
    console.log(`menu item (${menuItems.length}):`);
    for (const item of menuItems) {
      const text = (await item.textContent())?.trim().replace(/\s+/g, " ").slice(0, 30);
      console.log(`  "${text}"`);
    }

    await page.screenshot({ path: "shots/debug-menu.png" });
    console.log("Screenshot: shots/debug-menu.png");
  }

  await browser.close();
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

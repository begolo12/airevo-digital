// Menelusuri dua langkah yang masih gagal: batalkan transaksi dan atur anggaran.

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

  /* ───────────── BATALKAN TRANSAKSI ───────────── */
  console.log("═══ BATALKAN TRANSAKSI ═══");
  await page.goto(`${BASE}/keluarga/keuangan/transaksi`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);

  const rowCount = await page.locator("tbody tr").count();
  console.log(`  baris: ${rowCount}`);

  const row = page.locator("tbody tr").first();
  console.log(`  baris pertama terlihat: ${await row.isVisible()}`);

  await row.scrollIntoViewIfNeeded();
  await row.click({ button: "right" });
  await page.waitForTimeout(1500);

  const menuItems = await page.locator('[role="menuitem"]').count();
  console.log(`  menu item: ${menuItems}`);

  const voidItem = page.getByRole("menuitem", { name: /Batalkan transaksi/i });
  console.log(`  "Batalkan transaksi": ${await voidItem.count()}`);

  if ((await voidItem.count()) > 0) {
    await voidItem.first().click({ timeout: 8000 });
    await page.waitForTimeout(1200);
    console.log("  klik berhasil");

    const dialogs = await page.locator('[role="dialog"], [role="alertdialog"]').count();
    console.log(`  dialog konfirmasi: ${dialogs}`);

    const dialogButtons = await page.locator('[role="dialog"] button, [role="alertdialog"] button').all();
    for (const button of dialogButtons) {
      const text = (await button.textContent())?.trim().replace(/\s+/g, " ").slice(0, 30);
      if (text) console.log(`    "${text}"`);
    }
  }

  /* ───────────── ANGGARAN ───────────── */
  console.log("\n═══ ANGGARAN ═══");
  await page.goto(`${BASE}/keluarga/keuangan/anggaran`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);

  const selectInfo = await page.evaluate(() => {
    const form = document.querySelector("form:has(input[name='amount'])");
    if (!form) return { found: false };

    const category = form.querySelector("select[name='categoryId']");
    const amount = form.querySelector("input[name='amount']");

    return {
      found: true,
      category: category
        ? {
            options: [...category.options].map((option) => ({
              value: option.value,
              text: option.textContent?.trim().slice(0, 25),
            })),
            value: category.value,
            required: category.required,
          }
        : null,
      amount: amount ? { value: amount.value, min: amount.min, step: amount.step } : null,
    };
  });

  console.log(`  form: ${selectInfo.found}`);
  console.log(`  categoryId: ${JSON.stringify(selectInfo.category)}`);
  console.log(`  amount: ${JSON.stringify(selectInfo.amount)}`);

  await browser.close();
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

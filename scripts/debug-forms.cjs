// Menelusuri form tagihan, anggaran, dan tujuan.

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

async function inspect(page, path, label) {
  console.log(`\n═══ ${label} ═══`);
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const forms = await page.locator("form").all();
  console.log(`form: ${forms.length}`);

  for (const [index, form] of forms.entries()) {
    const fields = await form.locator("input, select, textarea").all();
    if (fields.length === 0) continue;

    console.log(`  form #${index} (${fields.length} field):`);
    for (const field of fields) {
      const tag = await field.evaluate((node) => node.tagName.toLowerCase());
      const name = await field.getAttribute("name");
      const type = await field.getAttribute("type");
      const required = await field.getAttribute("required");
      const value = await field.inputValue().catch(() => "");
      console.log(
        `    <${tag} name=${name} type=${type} required=${required !== null} value="${value}">`,
      );
    }

    const submit = await form.locator('button[type="submit"]').all();
    for (const button of submit) {
      const text = (await button.textContent())?.trim().replace(/\s+/g, " ").slice(0, 30);
      console.log(`    submit: "${text}"`);
    }
  }
}

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

  page.on("console", (message) => {
    if (message.type() === "error") console.log("  [konsol]", message.text().slice(0, 100));
  });

  await login(page);

  await inspect(page, "/keluarga/keuangan/tagihan", "TAGIHAN");
  await inspect(page, "/keluarga/keuangan/anggaran", "ANGGARAN");
  await inspect(page, "/keluarga/rencana", "RENCANA");

  await browser.close();
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

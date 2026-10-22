// Melaporkan field mana yang menghalangi submit, untuk setiap form.

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

/** Melaporkan field tidak valid pada semua form di halaman. */
async function reportValidity(page, label) {
  const result = await page.evaluate(() => {
    return [...document.querySelectorAll("form")].map((form, index) => {
      const invalid = [...form.elements]
        .filter((element) => element.name && element.checkValidity && !element.checkValidity())
        .map((element) => ({
          name: element.name,
          tag: element.tagName.toLowerCase(),
          value: element.value,
          message: element.validationMessage,
        }));

      const submit = form.querySelector('button[type="submit"]');
      return {
        index,
        fields: [...form.elements].filter((element) => element.name).length,
        submitLabel: submit ? submit.textContent?.trim().slice(0, 30) : null,
        valid: form.checkValidity(),
        invalid,
      };
    });
  });

  const interesting = result.filter((form) => form.fields > 2);
  console.log(`\n${label}: ${interesting.length} form berisi`);

  for (const form of interesting) {
    console.log(
      `  form #${form.index} (${form.fields} field) submit="${form.submitLabel}" valid=${form.valid}`,
    );
    for (const field of form.invalid) {
      console.log(`    TIDAK VALID <${field.tag} name=${field.name}> "${field.message}"`);
    }
  }
}

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

  await login(page);

  await page.goto(`${BASE}/keluarga/keuangan/tagihan`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.fill('input[name="name"]', "DEBUG-TAGIHAN");
  await page.fill('input[name="amount"]', "175000");
  await reportValidity(page, "TAGIHAN (setelah isi nama+nominal)");

  await page.goto(`${BASE}/keluarga/keuangan/anggaran`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.locator('input[name="amount"]').first().fill("1250000");
  await reportValidity(page, "ANGGARAN (setelah isi nominal)");

  await page.goto(`${BASE}/keluarga/rencana`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.fill('input[name="name"]', "DEBUG-TUJUAN");
  await page.fill('input[name="targetAmount"]', "5000000");
  await reportValidity(page, "TUJUAN (setelah isi nama+target)");

  // Transaksi: buka dialog.
  await page.goto(`${BASE}/keluarga/keuangan/transaksi`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: /Tambah transaksi/i }).first().click();
  await page.waitForTimeout(2000);
  const dialog = page.locator('[role="dialog"]').first();
  await dialog.locator('input[name="amount"]').fill("135000");
  await dialog.locator('input[name="description"]').fill("DEBUG-TRANSAKSI");
  await reportValidity(page, "TRANSAKSI (dialog, setelah isi nominal+deskripsi)");

  await browser.close();
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

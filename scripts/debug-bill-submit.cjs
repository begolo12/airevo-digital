// Menelusuri submit form tagihan langkah demi langkah.

const { chromium } = require("playwright");

const BASE = "http://localhost:3100";
const MARK = Date.now().toString().slice(-6);

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

  const posts = [];
  page.on("response", (response) => {
    if (response.request().method() === "POST") {
      posts.push(`${response.status()} ${response.url().replace(BASE, "").slice(0, 50)}`);
    }
  });
  page.on("console", (message) => {
    if (message.type() === "error") console.log("  [konsol]", message.text().slice(0, 100));
  });

  await login(page);

  await page.goto(`${BASE}/keluarga/keuangan/tagihan`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);

  const marker = `CEK-${MARK}`;

  console.log("═══ MENGISI FORM ═══");
  await page.fill('input[name="name"]', marker);
  await page.fill('input[name="amount"]', "1000001");
  console.log(`  nama: ${await page.inputValue('input[name="name"]')}`);
  console.log(`  nominal: ${await page.inputValue('input[name="amount"]')}`);

  // Centang dua anggota.
  const boxes = page.locator('input[name="splitMembers"]');
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  console.log(`  anggota dicentang: ${await boxes.nth(0).isChecked()}, ${await boxes.nth(1).isChecked()}`);

  // Status validitas form tagihan.
  const validity = await page.evaluate(() => {
    const form = [...document.querySelectorAll("form")].find((item) =>
      item.querySelector('input[name="splitMembers"]'),
    );
    if (!form) return null;

    const invalid = [...form.elements]
      .filter((element) => element.name && element.checkValidity && !element.checkValidity())
      .map((element) => ({ name: element.name, message: element.validationMessage }));

    const submit = form.querySelector('button[type="submit"]');

    return {
      valid: form.checkValidity(),
      invalid,
      submitText: submit?.textContent?.trim(),
      submitDisabled: submit?.disabled,
      submitVisible: submit ? submit.getBoundingClientRect().width > 0 : false,
    };
  });

  console.log("\n═══ STATUS FORM ═══");
  console.log(`  valid     : ${validity?.valid}`);
  console.log(`  tombol    : "${validity?.submitText}"`);
  console.log(`  nonaktif  : ${validity?.submitDisabled}`);
  console.log(`  terlihat  : ${validity?.submitVisible}`);
  for (const field of validity?.invalid ?? []) {
    console.log(`  TIDAK VALID: ${field.name} — ${field.message}`);
  }

  posts.length = 0;

  console.log("\n═══ KLIK SIMPAN ═══");
  const save = page.getByRole("button", { name: /^Tambah tagihan$/ });
  console.log(`  tombol ditemukan: ${await save.count()}`);
  await save.scrollIntoViewIfNeeded();
  await save.click();
  await page.waitForTimeout(5000);

  console.log(`  POST terkirim: ${posts.length}`);
  for (const post of posts) console.log(`    ${post}`);

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  const body = await page.evaluate(() => document.body.innerText);
  console.log(`\n  tersimpan: ${body.includes(marker) ? "ya" : "TIDAK"}`);

  await browser.close();
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

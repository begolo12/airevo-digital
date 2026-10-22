// Memantau apakah klik tombol benar-benar mengirim permintaan ke server.

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

  const requests = [];
  page.on("request", (request) => {
    if (request.method() === "POST") {
      requests.push(`${request.method()} ${request.url().replace(BASE, "")}`);
    }
  });

  page.on("response", async (response) => {
    if (response.request().method() === "POST") {
      console.log(`  RESPONS ${response.status()} ${response.url().replace(BASE, "").slice(0, 60)}`);
    }
  });

  await login(page);

  console.log("\n═══ ANGGARAN: isi lalu submit ═══");
  await page.goto(`${BASE}/keluarga/keuangan/anggaran`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  requests.length = 0;

  const amountField = page.locator('input[name="amount"]').first();
  await amountField.scrollIntoViewIfNeeded();
  await amountField.fill("1250000");

  // Verifikasi isian benar-benar masuk.
  console.log(`  nilai field: "${await amountField.inputValue()}"`);

  // Cek validitas form sebelum submit.
  const validity = await page.evaluate(() => {
    const form = document.querySelector("form:has(input[name='amount'])");
    if (!form) return { found: false };
    const fields = [...form.elements]
      .filter((element) => element.name)
      .map((element) => ({
        name: element.name,
        valid: element.checkValidity ? element.checkValidity() : null,
        message: element.validationMessage || "",
      }));
    return { found: true, valid: form.checkValidity(), fields };
  });

  console.log(`  form ditemukan: ${validity.found}`);
  console.log(`  form valid    : ${validity.valid}`);
  for (const field of validity.fields ?? []) {
    if (field.valid === false) {
      console.log(`    TIDAK VALID: ${field.name} — ${field.message}`);
    }
  }

  const submitBudget = page.getByRole("button", { name: /Simpan anggaran/i });
  await submitBudget.scrollIntoViewIfNeeded();
  await submitBudget.click();
  await page.waitForTimeout(4000);

  console.log(`  permintaan POST: ${requests.length}`);
  for (const request of requests) console.log(`    ${request.slice(0, 70)}`);

  // Cek toast.
  const body = await page.evaluate(() => document.body.innerText);
  const toastLike = body
    .split("\n")
    .filter((line) => /tersimpan|berhasil|gagal|gagal|tidak valid/i.test(line))
    .slice(0, 3);
  console.log(`  pesan: ${toastLike.length > 0 ? toastLike.join(" | ") : "(tidak ada)"}`);

  await browser.close();
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

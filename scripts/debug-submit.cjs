// Menjalankan submit tiap form dan melaporkan apa yang terjadi.

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

async function report(page, label, before) {
  const url = page.url();
  const body = await page.evaluate(() => document.body.innerText);

  // Cari pesan galat yang tampil.
  const alerts = await page.locator('[role="alert"]').all();
  const messages = [];
  for (const alert of alerts) {
    const text = (await alert.textContent())?.trim().replace(/\s+/g, " ");
    if (text) messages.push(text.slice(0, 80));
  }

  console.log(`  url    : ${url.replace(BASE, "")}`);
  console.log(`  alert  : ${messages.length > 0 ? messages.join(" | ") : "(tidak ada)"}`);
  console.log(`  berubah: ${before !== body.length ? `ya (${before} → ${body.length})` : "tidak"}`);
}

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

  await login(page);

  /* ─────────────── TAGIHAN ─────────────── */
  console.log("\n═══ TAGIHAN ═══");
  await page.goto(`${BASE}/keluarga/keuangan/tagihan`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const billName = `TAG-${MARK}`;
  let before = (await page.evaluate(() => document.body.innerText)).length;

  await page.fill('input[name="name"]', billName);
  await page.fill('input[name="amount"]', "175000");

  const submitBill = page.getByRole("button", { name: /Tambah tagihan/i });
  console.log(`  tombol "Tambah tagihan": ${await submitBill.count()}`);
  await submitBill.scrollIntoViewIfNeeded();
  await submitBill.click();
  await page.waitForTimeout(4000);

  await report(page, "tagihan", before);

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const afterBill = await page.evaluate(() => document.body.innerText);
  console.log(`  tersimpan: ${afterBill.includes(billName) ? "ya" : "TIDAK"}`);

  /* ─────────────── ANGGARAN ─────────────── */
  console.log("\n═══ ANGGARAN ═══");
  await page.goto(`${BASE}/keluarga/keuangan/anggaran`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  before = (await page.evaluate(() => document.body.innerText)).length;

  const amountField = page.locator('input[name="amount"]').first();
  console.log(`  field amount: ${await amountField.count()}`);
  await amountField.scrollIntoViewIfNeeded();
  await amountField.fill("1250000");

  const submitBudget = page.getByRole("button", { name: /Simpan anggaran/i });
  console.log(`  tombol "Simpan anggaran": ${await submitBudget.count()}`);
  await submitBudget.scrollIntoViewIfNeeded();
  await submitBudget.click();
  await page.waitForTimeout(4000);

  await report(page, "anggaran", before);

  /* ─────────────── TUJUAN ─────────────── */
  console.log("\n═══ TUJUAN ═══");
  await page.goto(`${BASE}/keluarga/rencana`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  before = (await page.evaluate(() => document.body.innerText)).length;

  const goalName = `GOAL-${MARK}`;
  await page.fill('input[name="name"]', goalName);
  await page.fill('input[name="targetAmount"]', "5000000");

  const submitGoal = page.getByRole("button", { name: /Buat tujuan/i });
  console.log(`  tombol "Buat tujuan": ${await submitGoal.count()}`);
  await submitGoal.scrollIntoViewIfNeeded();
  await submitGoal.click();
  await page.waitForTimeout(4000);

  await report(page, "tujuan", before);

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const afterGoal = await page.evaluate(() => document.body.innerText);
  console.log(`  tersimpan: ${afterGoal.includes(goalName) ? "ya" : "TIDAK"}`);

  await browser.close();
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

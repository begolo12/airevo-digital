// Membuktikan pintasan keyboard bekerja, dan tidak mengganggu pengetikan.

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
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await login(page);
  console.log("1. Login                                    : ok");

  /* ------------------------- g lalu huruf ------------------------- */

  const destinations = [
    { keys: "gt", path: "/keluarga/keuangan/transaksi", label: "g t → Transaksi" },
    { keys: "ga", path: "/keluarga/keuangan/anggaran", label: "g a → Anggaran" },
    { keys: "gr", path: "/keluarga/rencana", label: "g r → Rencana" },
    { keys: "gp", path: "/keluarga/pengaturan", label: "g p → Pengaturan" },
  ];

  let passed = 0;

  for (const destination of destinations) {
    await page.goto(`${BASE}/keluarga`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    // Pastikan fokus tidak di kolom isian.
    await page.evaluate(() => document.body.focus());

    await page.keyboard.press(destination.keys[0]);
    await page.waitForTimeout(120);
    await page.keyboard.press(destination.keys[1]);

    try {
      await page.waitForURL(`**${destination.path}`, { timeout: 8000 });
      console.log(`2. ${destination.label.padEnd(38)}: ok`);
      passed += 1;
    } catch {
      console.log(`2. ${destination.label.padEnd(38)}: GAGAL`);
    }
  }

  /* ------------------- tidak mengganggu pengetikan ------------------ */

  await page.goto(`${BASE}/keluarga/keuangan/transaksi`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  const search = page.locator('input[name="q"]');
  await search.click();
  await search.type("gajian", { delay: 60 });
  await page.waitForTimeout(400);

  const typedValue = await search.inputValue();
  const stillOnPage = page.url().includes("/transaksi");

  console.log(
    `3. Mengetik "gajian" di kolom cari           : ${typedValue === "gajian" ? "ok" : `GAGAL (${typedValue})`}`,
  );
  console.log(
    `4. Tidak terlempar ke halaman lain           : ${stillOnPage ? "ok" : "GAGAL"}`,
  );

  /* ------------------------- ⌘K masih bekerja ---------------------- */

  await page.evaluate(() => document.body.focus());
  await page.keyboard.press("Control+k");
  await page.waitForTimeout(500);

  const paletteOpen = await page.locator('input[placeholder*="Cari halaman"]').count();
  console.log(`5. Ctrl+K membuka palette                    : ${paletteOpen > 0 ? "ok" : "GAGAL"}`);

  await page.keyboard.press("Escape");
  await browser.close();

  const ok = passed === destinations.length && typedValue === "gajian" && stillOnPage && paletteOpen > 0;
  console.log("");
  console.log(ok ? "PINTASAN KEYBOARD OK" : "GAGAL");
  process.exit(ok ? 0 : 1);
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

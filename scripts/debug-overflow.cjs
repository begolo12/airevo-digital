// Mencari elemen yang menyebabkan luapan horizontal di /keluarga (mobile).

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
  await page.waitForTimeout(1500);
}

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();

  await login(page);

  const report = await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;

    const offenders = [];
    for (const element of document.querySelectorAll("*")) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0) continue;

      // Melewati tepi kanan dokumen.
      if (rect.right > docWidth + 1) {
        offenders.push({
          tag: element.tagName.toLowerCase(),
          className: (element.className || "").toString().slice(0, 70),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          text: (element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 45),
        });
      }
    }

    return { docWidth, scrollWidth, offenders: offenders.slice(0, 15) };
  });

  console.log(`lebar dokumen : ${report.docWidth}`);
  console.log(`lebar gulir   : ${report.scrollWidth}`);
  console.log(`luapan        : ${report.scrollWidth - report.docWidth}px\n`);

  if (report.offenders.length === 0) {
    console.log("Tidak ada elemen yang melewati tepi kanan.");
  } else {
    console.log(`Elemen melewati tepi (${report.offenders.length}):`);
    for (const item of report.offenders) {
      console.log(`  <${item.tag}> right=${item.right} w=${item.width}`);
      console.log(`     class: ${item.className}`);
      if (item.text) console.log(`     teks : ${item.text}`);
    }
  }

  await browser.close();
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

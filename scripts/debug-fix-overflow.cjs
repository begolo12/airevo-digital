// Menguji calon perbaikan luapan SEBELUM mengubah kode.
//
// Menyuntikkan CSS langsung di browser, lalu mengukur ulang. Cara ini
// memastikan perbaikan benar-benar bekerja — bukan menebak lalu berharap.

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

async function measure(page, label) {
  const result = await page.evaluate(() => ({
    doc: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  const overflow = result.scroll - result.doc;
  console.log(`  ${label.padEnd(42)} ${result.scroll}px (luapan ${overflow}px)`);
  return overflow;
}

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();

  await login(page);

  console.log("Mengukur luapan:\n");
  await measure(page, "sebelum perbaikan");

  // Calon 1: min-w-0 pada anak grid.
  await page.addStyleTag({
    content: `.grid > * { min-width: 0 !important; }`,
  });
  await page.waitForTimeout(500);
  await measure(page, "calon 1: grid > * { min-width: 0 }");

  // Calon 2: min-w-0 pada Card (rounded-[14px]).
  await page.addStyleTag({
    content: `div.rounded-\\[14px\\] { min-width: 0 !important; }`,
  });
  await page.waitForTimeout(500);
  await measure(page, "calon 2: + Card min-width 0");

  // Calon 3: izinkan teks membungkus di dalam kartu.
  await page.addStyleTag({
    content: `.grid .truncate { white-space: normal !important; }`,
  });
  await page.waitForTimeout(500);
  await measure(page, "calon 3: + teks membungkus");

  // Cari elemen dengan min-content besar di dalam grid, setelah perbaikan.
  const detail = await page.evaluate(() => {
    const grid = document.querySelector(".grid.items-start");
    if (!grid) return null;

    return [...grid.children].map((child) => {
      const clone = child.cloneNode(true);
      clone.style.cssText = "position:absolute;left:-99999px;width:min-content;max-width:none";
      document.body.appendChild(clone);
      const width = clone.getBoundingClientRect().width;
      document.body.removeChild(clone);
      return {
        width: Math.round(width),
        text: (child.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40),
      };
    });
  });

  console.log("\nAnak grid dan min-content-nya:");
  for (const item of detail ?? []) {
    console.log(`  ${item.width}px  ${item.text}`);
  }

  await browser.close();
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

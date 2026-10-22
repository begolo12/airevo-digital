// Mencari elemen yang memaksa lebar minimum besar (min-content).

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

  const analysis = await page.evaluate(() => {
    const results = [];

    /*
     * `scrollWidth` sebuah elemen yang di-clone dengan `width: min-content`
     * memberi tahu seberapa lebar ia HARUS minimal. Elemen dengan min-content
     * besar adalah yang memaksa induknya melebar.
     */
    for (const element of document.querySelectorAll("*")) {
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") continue;

      const clone = element.cloneNode(true);
      clone.style.cssText = `
        position: absolute;
        left: -99999px;
        top: 0;
        width: min-content;
        max-width: none;
      `;
      document.body.appendChild(clone);

      const minContentWidth = clone.getBoundingClientRect().width;
      document.body.removeChild(clone);

      if (minContentWidth > 400) {
        results.push({
          tag: element.tagName.toLowerCase(),
          className: (element.className || "").toString().slice(0, 60),
          minContentWidth: Math.round(minContentWidth),
          text: (element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60),
          whiteSpace: style.whiteSpace,
        });
      }
    }

    // Yang paling lebar lebih dulu.
    results.sort((a, b) => b.minContentWidth - a.minContentWidth);
    return results.slice(0, 12);
  });

  console.log(`Elemen dengan min-content > 400px (${analysis.length}):\n`);
  for (const item of analysis) {
    console.log(`  min-content=${item.minContentWidth}px  <${item.tag}>  ws=${item.whiteSpace}`);
    console.log(`    class: ${item.className}`);
    console.log(`    teks : ${item.text}`);
    console.log("");
  }

  await browser.close();
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

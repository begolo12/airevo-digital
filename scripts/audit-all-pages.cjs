// Audit akhir: memastikan setiap halaman termuat tanpa error, di kedua tema,
// di beberapa ukuran layar.
//
// Ini menangkap hal yang tidak terlihat oleh `tsc`, `lint`, atau unit test:
// halaman yang melempar saat dirender, luapan horizontal, dan gambar gagal.

const { chromium } = require("playwright");

const BASE = "http://localhost:3100";

const PAGES = [
  "/", "/aplikasi", "/aplikasi/keluarga", "/about", "/contact", "/work",
  "/legal/privacy", "/legal/terms", "/login",
  "/keluarga",
  "/keluarga/keuangan", "/keluarga/keuangan/transaksi",
  "/keluarga/keuangan/berulang", "/keluarga/keuangan/akun",
  "/keluarga/keuangan/kategori", "/keluarga/keuangan/anggaran",
  "/keluarga/keuangan/tagihan", "/keluarga/keuangan/utang", "/keluarga/keuangan/aset",
  "/keluarga/rencana", "/keluarga/kalender", "/keluarga/tugas", "/keluarga/belanja",
  "/keluarga/dokumen", "/keluarga/kesehatan", "/keluarga/pendidikan",
  "/keluarga/laporan", "/keluarga/pengaturan", "/keluarga/peta",
  "/admin/pesanan",
];

const PUBLIC_PAGES = new Set([
  "/", "/aplikasi", "/aplikasi/keluarga", "/about", "/contact", "/work",
  "/legal/privacy", "/legal/terms", "/login",
]);

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
  const problems = [];

  for (const viewport of [
    { width: 390, height: 844, name: "mobile" },
    { width: 768, height: 1024, name: "tablet" },
    { width: 1440, height: 900, name: "desktop" },
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();

    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text().slice(0, 120));
    });
    page.on("pageerror", (error) => consoleErrors.push(`pageerror: ${error.message.slice(0, 120)}`));

    await login(page);

    console.log(`\n=== ${viewport.name} (${viewport.width}px) ===`);

    for (const path of PAGES) {
      consoleErrors.length = 0;

      let status = 0;
      try {
        const response = await page.goto(`${BASE}${path}`, {
          waitUntil: "networkidle",
          timeout: 25000,
        });
        status = response ? response.status() : 0;
      } catch (error) {
        problems.push({ viewport: viewport.name, path, kind: "gagal dimuat", detail: error.message.slice(0, 80) });
        console.log(`  GAGAL  ${path}`);
        continue;
      }

      await page.waitForTimeout(250);

      const metrics = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
        // Halaman error Next.js punya tanda khas.
        isError:
          document.body.innerText.includes("Application error") ||
          document.body.innerText.includes("Unhandled Runtime Error"),
        brokenImages: [...document.images].filter((img) => img.complete && img.naturalWidth === 0).length,
        textLength: document.body.innerText.trim().length,
      }));

      const issues = [];
      if (status >= 400) issues.push(`status ${status}`);
      if (metrics.overflow) issues.push("luapan horizontal");
      if (metrics.isError) issues.push("halaman error");
      if (metrics.brokenImages > 0) issues.push(`${metrics.brokenImages} gambar rusak`);
      if (metrics.textLength < 40) issues.push("halaman hampir kosong");
      if (consoleErrors.length > 0) issues.push(`console: ${consoleErrors[0]}`);

      if (issues.length > 0) {
        problems.push({ viewport: viewport.name, path, kind: issues.join(" · ") });
        console.log(`  PERIKSA  ${path}  → ${issues.join(" · ")}`);
      } else {
        console.log(`  ok       ${path}`);
      }
    }

    await context.close();
  }

  await browser.close();

  console.log(`\n${"=".repeat(60)}`);
  if (problems.length === 0) {
    console.log("Semua halaman termuat bersih di 3 ukuran layar.");
  } else {
    console.log(`${problems.length} masalah:\n`);
    for (const item of problems) {
      console.log(`  [${item.viewport}] ${item.path} → ${item.kind}`);
    }
  }

  process.exit(problems.length === 0 ? 0 : 1);
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

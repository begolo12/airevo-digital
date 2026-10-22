// Audit aksesibilitas dengan axe-core di seluruh halaman, kedua tema.
//
// Menangkap hal yang tidak terlihat oleh pemeriksaan kontras manual: elemen
// tanpa nama aksesibel, peran ARIA yang salah, urutan heading yang melompat,
// dan kontrol formulir tanpa label.

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const BASE = "http://localhost:3100";

const PAGES = [
  "/",
  "/aplikasi",
  "/aplikasi/keluarga",
  "/about",
  "/contact",
  "/login",
  "/keluarga",
  "/keluarga/keuangan",
  "/keluarga/keuangan/transaksi",
  "/keluarga/keuangan/berulang",
  "/keluarga/keuangan/anggaran",
  "/keluarga/keuangan/tagihan",
  "/keluarga/keuangan/utang",
  "/keluarga/keuangan/aset",
  "/keluarga/rencana",
  "/keluarga/kalender",
  "/keluarga/tugas",
  "/keluarga/belanja",
  "/keluarga/dokumen",
  "/keluarga/kesehatan",
  "/keluarga/pendidikan",
  "/keluarga/laporan",
  "/keluarga/pengaturan",
];

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

const axeSource = fs.readFileSync(
  path.join("node_modules", "axe-core", "axe.min.js"),
  "utf8",
);

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await login(page);

  const allViolations = [];
  let totalChecked = 0;

  for (const mode of ["light", "dark"]) {
    await page.evaluate((value) => {
      window.localStorage.setItem("airevo:theme", value);
    }, mode);

    console.log(`\n=== Mode ${mode} ===`);

    for (const route of PAGES) {
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 25000 });
      await page.waitForTimeout(300);

      await page.addScriptTag({ content: axeSource });

      const result = await page.evaluate(async () => {
        return await window.axe.run(document, {
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
          },
        });
      });

      totalChecked += 1;

      const serious = result.violations.filter(
        (violation) => violation.impact === "serious" || violation.impact === "critical",
      );

      if (serious.length > 0) {
        console.log(`  PERIKSA  ${route}  (${serious.length})`);
        for (const violation of serious) {
          allViolations.push({
            mode,
            route,
            id: violation.id,
            impact: violation.impact,
            help: violation.help,
            nodes: violation.nodes.length,
            sample: violation.nodes[0]?.html?.slice(0, 100),
          });
        }
      } else {
        console.log(`  ok       ${route}`);
      }
    }
  }

  await browser.close();

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Halaman diperiksa: ${totalChecked}`);

  if (allViolations.length === 0) {
    console.log("Tidak ada pelanggaran aksesibilitas serius.");
    process.exit(0);
  }

  // Ringkas per jenis pelanggaran.
  const byId = new Map();
  for (const violation of allViolations) {
    if (!byId.has(violation.id)) {
      byId.set(violation.id, { ...violation, routes: new Set(), total: 0 });
    }
    const entry = byId.get(violation.id);
    entry.routes.add(violation.route);
    entry.total += violation.nodes;
  }

  console.log(`${byId.size} jenis pelanggaran:\n`);
  for (const [id, entry] of byId) {
    console.log(`  [${entry.impact}] ${id} — ${entry.help}`);
    console.log(`      ${entry.total} elemen di ${entry.routes.size} halaman`);
    console.log(`      contoh: ${entry.sample}`);
  }

  process.exit(1);
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

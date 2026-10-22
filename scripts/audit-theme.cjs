// Audit visual dua tema: memastikan tidak ada latar putih menyilaukan di mode
// gelap, dan kontras teks lulus WCAG AA di kedua mode.

const { chromium } = require("playwright");
const fs = require("node:fs");

const BASE = "http://localhost:3100";

const PAGES = [
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

/** Memeriksa latar yang terlalu terang dan teks yang terlalu redup. */
async function inspect(page) {
  return page.evaluate(() => {
    const issues = [];

    const parse = (value) => {
      const match = value.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
      if (!match) return null;
      return {
        r: Number(match[1]),
        g: Number(match[2]),
        b: Number(match[3]),
        a: match[4] === undefined ? 1 : Number(match[4]),
      };
    };

    const luminance = ({ r, g, b }) => {
      const channel = (value) => {
        const c = value / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };

    const contrast = (a, b) => {
      const la = luminance(a);
      const lb = luminance(b);
      const hi = Math.max(la, lb);
      const lo = Math.min(la, lb);
      return (hi + 0.05) / (lo + 0.05);
    };

    const isDark = document.documentElement.classList.contains("dark");
    const bodyBackground = parse(getComputedStyle(document.body).backgroundColor) ?? {
      r: 255, g: 255, b: 255, a: 1,
    };

    // 1. Latar terang di mode gelap = menyilaukan.
    if (isDark) {
      document.querySelectorAll("input, select, textarea, .surface, .note").forEach((element) => {
        const style = getComputedStyle(element);
        const background = parse(style.backgroundColor);
        if (!background || background.a < 0.5) return;
        if (luminance(background) > 0.5) {
          issues.push({
            kind: "latar terang di mode gelap",
            tag: element.tagName,
            cls: String(element.className).slice(0, 60),
            color: style.backgroundColor,
          });
        }
      });
    }

    // 2. Kontras teks.
    const seen = new Set();
    document.querySelectorAll("p, span, a, h1, h2, h3, h4, td, th, li, button, label").forEach((element) => {
      if (!element.textContent || !element.textContent.trim()) return;
      if (element.children.length > 0 && element.textContent.trim().length > 120) return;

      const style = getComputedStyle(element);
      const color = parse(style.color);
      if (!color || color.a < 0.5) return;

      // Cari latar efektif terdekat.
      let background = null;
      let node = element;
      while (node && !background) {
        const bg = parse(getComputedStyle(node).backgroundColor);
        if (bg && bg.a > 0.5) background = bg;
        node = node.parentElement;
      }
      if (!background) background = bodyBackground;

      const ratio = contrast(color, background);
      const size = parseFloat(style.fontSize);
      const weight = Number(style.fontWeight) || 400;
      const large = size >= 18.66 || (size >= 14 && weight >= 700);
      const threshold = large ? 3 : 4.5;

      if (ratio < threshold) {
        const key = `${style.color}|${getComputedStyle(element).backgroundColor}|${Math.round(size)}`;
        if (seen.has(key)) return;
        seen.add(key);
        issues.push({
          kind: "kontras rendah",
          text: element.textContent.trim().slice(0, 40),
          ratio: Number(ratio.toFixed(2)),
          threshold,
          size: Math.round(size),
          color: style.color,
        });
      }
    });

    return { isDark, issues };
  });
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await login(page);

  const report = {};

  for (const mode of ["light", "dark"]) {
    await page.evaluate((value) => {
      window.localStorage.setItem("airevo:theme", value);
    }, mode);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(800);

    console.log(`\n=== Mode ${mode} ===`);
    let total = 0;

    for (const path of PAGES) {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 25000 });
      await page.waitForTimeout(400);

      const { issues } = await inspect(page);
      const bright = issues.filter((i) => i.kind === "latar terang di mode gelap");
      const contrastIssues = issues.filter((i) => i.kind === "kontras rendah");

      total += issues.length;
      const flag = issues.length === 0 ? "  ok " : "PERIKSA";
      console.log(
        `${flag}  ${String(path).padEnd(34)} latar-terang=${bright.length} kontras=${contrastIssues.length}`,
      );

      if (issues.length > 0) {
        report[`${mode}:${path}`] = issues.slice(0, 6);
      }
    }

    console.log(`Total temuan mode ${mode}: ${total}`);
  }

  fs.writeFileSync("shots/theme-audit.json", JSON.stringify(report, null, 2));

  const totalIssues = Object.keys(report).length;
  console.log(`\nHalaman dengan temuan: ${totalIssues}`);
  await browser.close();
  process.exit(0);
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

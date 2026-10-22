// Membuktikan blokir login masih berlaku SETELAH server restart.
//
// Server dijalankan terpisah lebih dulu (bukan oleh skrip ini), karena
// menjalankan server dari dalam skrip tidak berhasil di lingkungan ini.
//
// Prasyarat: jalankan `scripts/block-login.cjs` untuk memicu blokir, restart
// server, lalu jalankan skrip ini.

const { chromium } = require("playwright");

const BASE = "http://localhost:3100";
const EMAIL = "uji-blokir@contoh.id";

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', "apa-saja");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  const body = await page.evaluate(() => document.body.innerText);
  const blocked = /terlalu banyak|tunggu|coba lagi/i.test(body);

  console.log("Login setelah restart dengan kata sandi salah:");
  console.log("  terkunci :", blocked ? "ya" : "TIDAK");

  if (blocked) {
    const message = body
      .split("\n")
      .find((line) => /terlalu banyak|tunggu|coba lagi/i.test(line));
    console.log("  pesan    :", message?.trim().slice(0, 90));
  }

  await browser.close();

  console.log("");
  console.log(
    blocked
      ? "PERSISTENSI PEMBATAS LAJU OK — blokir bertahan setelah restart"
      : "GAGAL — restart menghapus blokir",
  );
  process.exit(blocked ? 0 : 1);
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

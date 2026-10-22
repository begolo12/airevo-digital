// Membuktikan blokir login BERTAHAN setelah server restart.
//
// Sebelumnya hitungan ada di memori: restart menghapus blokir, dan penyerang
// hanya perlu menunggu instance didaur ulang. Skrip ini:
//
// 1. gagal login 5 kali → akun terkunci
// 2. restart server
// 3. coba login lagi → harus TETAP terkunci

const { chromium } = require("playwright");
const { execSync } = require("node:child_process");
const fs = require("node:fs");

const BASE = "http://localhost:3100";
const EMAIL = "uji-blokir@contoh.id";

function killServer() {
  try {
    execSync(
      'powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3100 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"',
      { stdio: "ignore" },
    );
  } catch {
    /* port mungkin sudah tertutup */
  }
}

async function waitForServer(timeoutMs = 60000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${BASE}/api/health`);
      if (response.ok) return true;
    } catch {
      /* belum siap */
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

async function attemptLogin(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);

  const body = await page.evaluate(() => document.body.innerText);
  return {
    blocked: /terlalu banyak|tunggu|coba lagi/i.test(body),
    url: page.url(),
  };
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Gagal login berulang sampai terkunci.
  console.log("1. Mencoba login gagal 6 kali…");
  let blocked = false;

  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const result = await attemptLogin(page, EMAIL, "sandi-salah");
    if (result.blocked) {
      console.log(`   terkunci pada percobaan ke-${attempt}`);
      blocked = true;
      break;
    }
  }

  if (!blocked) {
    console.log("   GAGAL: akun tidak terkunci setelah 6 percobaan");
    await browser.close();
    process.exit(1);
  }

  console.log("2. Membuktikan blokir bertahan setelah restart…");

  // 2. Restart server.
  killServer();
  await new Promise((resolve) => setTimeout(resolve, 3000));

  console.log("3. Menjalankan server baru…");
  execSync(
    'powershell -NoProfile -Command "Start-Process -FilePath pnpm -ArgumentList \'dev\',\'--port\',\'3100\' -WindowStyle Hidden"',
    { stdio: "ignore" },
  );

  const ready = await waitForServer();
  if (!ready) {
    console.log("   GAGAL: server tidak siap");
    await browser.close();
    process.exit(1);
  }
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 3. Coba login lagi dengan kata sandi BENAR — harus tetap terkunci.
  const browser2 = await chromium.launch();
  const page2 = await (await browser2.newContext()).newPage();
  const after = await attemptLogin(page2, EMAIL, "apa-saja");

  console.log("4. Status setelah restart                 :", after.blocked ? "MASIH TERKUNCI" : "terbuka (blokir hilang)");

  await browser2.close();
  await browser.close();

  console.log("");
  console.log(
    after.blocked
      ? "PERSISTENSI PEMBATAS LAJU OK — blokir bertahan setelah restart"
      : "GAGAL — restart menghapus blokir",
  );
  process.exit(after.blocked ? 0 : 1);
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

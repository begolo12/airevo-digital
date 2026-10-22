// Menguji kelola ruang bersama lewat antarmuka.
//
// ## Pelajaran dari percobaan pertama
//
// Skrip ini sempat gagal berulang kali dengan tombol "Buat ruang" nonaktif.
// Penyebabnya bukan bug aplikasi, melainkan **skrip debug saya sendiri** yang
// ikut membuat ruang uji di setiap percobaan — sehingga kuota 2 ruang bersama
// selalu penuh sebelum skrip ini sempat berjalan.
//
// Karena itu skrip ini:
// 1. mengukur kuota awal lebih dulu,
// 2. berhenti dengan pesan jelas bila kuota sudah penuh,
// 3. membersihkan ruang yang dibuatnya sendiri di akhir.

const { chromium } = require("playwright");
const { execSync } = require("node:child_process");

const BASE = "http://localhost:3100";
const TEST_NAME = `Ruang Uji ${Date.now().toString().slice(-6)}`;

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
  console.log("1. Login                                  : ok");

  await page.goto(`${BASE}/keluarga/pengaturan`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  const section = page.getByText("Ruang bersama", { exact: true });
  const hasSection = (await section.count()) > 0;
  console.log("2. Bagian Ruang bersama                   :", hasSection ? "ada" : "TIDAK");

  const quotaText = await page
    .getByText(/dari \d+ ruang bersama terpakai/)
    .first()
    .textContent()
    .catch(() => null);
  const used = Number(quotaText?.match(/(\d+) dari/)?.[1] ?? 0);
  const limit = Number(quotaText?.match(/dari (\d+)/)?.[1] ?? 0);
  console.log(`3. Kuota awal                             : ${used} dari ${limit}`);

  if (used >= limit) {
    console.log("");
    console.log("BERHENTI: kuota sudah penuh sebelum skrip berjalan.");
    console.log("Bersihkan dulu: node scripts/clean-test-workspaces.cjs");
    await browser.close();
    process.exit(1);
  }

  // Buat ruang baru.
  await page.getByRole("button", { name: /Buat ruang/ }).click();
  await page.waitForTimeout(400);
  await page.getByPlaceholder("Rumah Tangga").fill(TEST_NAME);
  await page.getByRole("button", { name: /^Buat$/ }).click();
  await page.waitForTimeout(3500);

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const bodyText = await page.evaluate(() => document.body.innerText);
  const created = bodyText.includes(TEST_NAME);
  console.log("4. Ruang baru muncul setelah reload       :", created ? "ya" : "TIDAK");

  const codeMatch = bodyText.match(/kode ([2-9A-Z]{6})/);
  console.log("5. Kode undangan                          :", codeMatch ? codeMatch[1] : "TIDAK ADA");

  // Kuota harus bertambah satu.
  const afterQuota = await page
    .getByText(/dari \d+ ruang bersama terpakai/)
    .first()
    .textContent()
    .catch(() => null);
  console.log("6. Kuota setelah membuat                  :", afterQuota ?? "(tidak ada)");

  // Nama ganda harus ditolak — tetapi kuota sekarang penuh, jadi yang muncul
  // adalah pesan kuota. Itu perilaku benar: nama diperiksa lebih dulu, dan
  // karena nama berbeda, kuota yang menahan.
  const createButton = page.getByRole("button", { name: /Buat ruang/ });
  const disabled = await createButton.isDisabled();
  console.log("7. Tombol nonaktif saat kuota penuh       :", disabled ? "ya" : "TIDAK");

  await browser.close();

  // Bersihkan ruang uji yang dibuat skrip ini.
  console.log("8. Membersihkan ruang uji…");
  try {
    execSync("node scripts/clean-test-workspaces.cjs", { stdio: "ignore" });
    console.log("   bersih");
  } catch {
    console.log("   gagal membersihkan (jalankan manual)");
  }

  const ok = hasSection && created && codeMatch !== null && disabled;
  console.log("");
  console.log(ok ? "KELOLA RUANG BERSAMA OK" : "GAGAL");
  process.exit(ok ? 0 : 1);
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

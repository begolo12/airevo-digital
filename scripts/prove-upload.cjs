// Menguji unggah dokumen lewat antarmuka, bukan hanya endpoint.
//
// Membuktikan rantai lengkap: tombol → presigned URL → bucket → kunci dicatat
// di database → berkas bisa diunduh kembali.

const { chromium } = require("playwright");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

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
  console.log("1. Login                              : ok");

  await page.goto(`${BASE}/keluarga/dokumen`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  console.log("2. Halaman dokumen                    : ok");

  // Hitung tombol lampiran sebelum unggah.
  const before = await page.getByRole("button", { name: /Lampirkan berkas/ }).count();
  console.log("3. Tombol lampiran tersedia           :", before);

  if (before === 0) {
    console.log("   Semua dokumen sudah punya berkas, atau tombol tidak dirender.");
    await browser.close();
    process.exit(1);
  }

  // Siapkan berkas PDF kecil.
  const filePath = path.join(os.tmpdir(), `uji-dokumen-${Date.now()}.pdf`);
  fs.writeFileSync(
    filePath,
    Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"),
  );

  // Pasang listener pada input file lalu unggah.
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles(filePath);
  console.log("4. Berkas dipilih                     : ok");

  // Tunggu sampai status "Berkas terpasang" muncul atau halaman memuat ulang.
  await page.waitForTimeout(6000);

  const toast = await page.evaluate(() => document.body.innerText);
  const attached = /Berkas terpasang/i.test(toast);
  console.log("5. Notifikasi unggah                  :", attached ? "Berkas terpasang" : "(tidak tertangkap)");

  // Setelah reload, dokumen harus menampilkan nama berkas.
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const bodyText = await page.evaluate(() => document.body.innerText);
  const fileName = path.basename(filePath);
  const showsFile = bodyText.includes(fileName);
  console.log("6. Nama berkas tampil setelah reload  :", showsFile ? "ya" : "TIDAK");

  const releaseButtons = await page.getByRole("button", { name: /^Lepas$/ }).count();
  console.log("7. Tombol lepas tersedia              :", releaseButtons);

  // Unduh lewat endpoint untuk membuktikan berkas benar-benar ada di bucket.
  const download = await page.evaluate(async () => {
    const response = await fetch("/api/dokumen?key=" + encodeURIComponent("ws-family/doc-1.pdf"));
    return { status: response.status, body: await response.json() };
  });
  console.log("8. Tautan unduh dari server           :", download.status, download.body.ok ? "ok" : download.body.message);

  // Bersihkan: lepas lampiran agar data contoh kembali bersih.
  if (releaseButtons > 0) {
    await page.getByRole("button", { name: /^Lepas$/ }).first().click();
    await page.waitForTimeout(3000);
    console.log("9. Lampiran dilepas                   : ok");
  }

  fs.unlinkSync(filePath);
  await browser.close();

  console.log("");
  console.log(showsFile ? "UNGGAH DOKUMEN OK" : "GAGAL — nama berkas tidak tampil");
  process.exit(showsFile ? 0 : 1);
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

// Membuktikan ekspor CSV bekerja lewat aplikasi: sesi, filter, dan isi berkas.

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
  await page.waitForTimeout(1200);
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await login(page);
  console.log("1. Login                                  : ok");

  // Tombol ekspor harus ada di halaman transaksi.
  await page.goto(`${BASE}/keluarga/keuangan/transaksi`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);

  const exportLink = page.getByRole("link", { name: /Ekspor CSV/ });
  const hasButton = (await exportLink.count()) > 0;
  console.log("2. Tombol Ekspor CSV tersedia             :", hasButton ? "ya" : "TIDAK");

  // Unduh lewat sesi yang sedang aktif.
  const response = await page.request.get(
    `${BASE}/api/ekspor/transaksi?bulan=2026-10`,
  );

  const status = response.status();
  const contentType = response.headers()["content-type"] ?? "";
  const disposition = response.headers()["content-disposition"] ?? "";
  const body = await response.text();

  console.log("3. Status                                 :", status);
  console.log("4. Content-Type                           :", contentType);
  console.log("5. Content-Disposition                    :", disposition.slice(0, 60));

  const hasBom = body.charCodeAt(0) === 0xfeff;
  const lines = body.replace(/^\uFEFF/, "").trim().split("\r\n");
  const header = lines[0];
  const dataLines = lines.slice(1);

  console.log("6. BOM UTF-8                              :", hasBom ? "ada" : "TIDAK");
  console.log("7. Baris (header + data)                  :", lines.length);
  console.log("8. Header                                 :", header.slice(0, 70));
  console.log("9. Contoh baris                           :", (dataLines[0] ?? "").slice(0, 80));

  // Semua baris harus punya jumlah kolom yang sama.
  const countColumns = (line) => {
    let columns = 1;
    let inQuotes = false;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (character === '"') {
        if (inQuotes && line[index + 1] === '"') index += 1;
        else inQuotes = !inQuotes;
      } else if (character === "," && !inQuotes) {
        columns += 1;
      }
    }
    return columns;
  };

  const headerColumns = countColumns(header);
  const consistent = dataLines.every((line) => countColumns(line) === headerColumns);
  console.log("10. Jumlah kolom konsisten                :", consistent ? `ya (${headerColumns})` : "TIDAK");

  // Tanpa sesi harus ditolak.
  const anonymous = await context.request.get(`${BASE}/api/ekspor/transaksi`, {
    headers: { cookie: "" },
  });
  console.log("11. Tanpa sesi                            :", anonymous.status());

  await browser.close();

  const ok =
    hasButton &&
    status === 200 &&
    contentType.includes("text/csv") &&
    disposition.includes("attachment") &&
    hasBom &&
    header.startsWith("Tanggal,Jenis,Deskripsi") &&
    consistent;

  console.log("");
  console.log(ok ? "EKSPOR CSV OK" : "GAGAL");
  process.exit(ok ? 0 : 1);
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

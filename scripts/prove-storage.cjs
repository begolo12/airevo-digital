// Membuktikan Object Storage Neon bekerja lewat endpoint aplikasi:
// login → minta izin unggah → unggah langsung ke bucket → minta tautan unduh
// → unduh dan bandingkan isinya.

const { chromium } = require("playwright");
const fs = require("node:fs");

const BASE = "http://localhost:3100";

const env = fs.readFileSync(".env.local", "utf8");
const read = (name) => {
  const match = env.match(new RegExp(`^${name}=(.*)$`, "m"));
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
};

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

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
  console.log("1. Login                              : ok");

  // Ambil id dokumen milik ruang aktif lewat halaman dokumen.
  await page.goto(`${BASE}/keluarga/dokumen`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const documentId = await page.evaluate(() => {
    const link = document.querySelector('a[href*="/dokumen/"]');
    return link ? link.getAttribute("href").split("/").pop() : null;
  });

  // Bila halaman tidak menautkan id, ambil dari store lewat API health tidak
  // tersedia — pakai id pertama dari seed sebagai cadangan.
  const targetId = documentId || "doc-1";
  console.log("2. Dokumen uji                        :", targetId);

  const ticket = await page.evaluate(async (id) => {
    const response = await fetch("/api/dokumen", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        documentId: id,
        fileName: "uji.pdf",
        contentType: "application/pdf",
        size: 1024,
      }),
    });
    return { status: response.status, body: await response.json() };
  }, targetId);

  if (!ticket.body.ok) {
    console.log("2b. Izin unggah                       : GAGAL —", ticket.body.message);
    await browser.close();
    process.exit(1);
  }
  console.log("3. Izin unggah diterima               :", ticket.body.key);

  // Unggah langsung ke bucket memakai presigned URL.
  const content = Buffer.from(`Uji dokumen ${new Date().toISOString()}`);
  const upload = await fetch(ticket.body.uploadUrl, {
    method: "PUT",
    headers: { "content-type": "application/pdf" },
    body: content,
  });
  console.log("4. Unggah langsung ke bucket          :", upload.ok ? `ok (${upload.status})` : `GAGAL ${upload.status}`);

  // Minta tautan unduh lewat endpoint aplikasi.
  const download = await page.evaluate(async (key) => {
    const response = await fetch(`/api/dokumen?key=${encodeURIComponent(key)}`);
    return { status: response.status, body: await response.json() };
  }, ticket.body.key);

  if (!download.body.ok) {
    console.log("5. Tautan unduh                       : GAGAL —", download.body.message);
    await browser.close();
    process.exit(1);
  }
  console.log("5. Tautan unduh diterima              : ok");

  const fetched = await fetch(download.body.url);
  const text = await fetched.text();
  console.log("6. Unduh dari bucket                  :", text === content.toString() ? "isi sama" : "ISI BERBEDA");

  // Kunci ruang lain harus ditolak.
  const forbidden = await page.evaluate(async () => {
    const response = await fetch("/api/dokumen?key=" + encodeURIComponent("ws-orang-lain/rahasia.pdf"));
    return { status: response.status, body: await response.json() };
  });
  console.log("7. Kunci ruang lain ditolak           :", forbidden.status === 403 ? "ya" : `TIDAK (${forbidden.status})`);

  // Bersihkan objek uji.
  const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
  const s3 = new S3Client({
    region: read("AWS_REGION"),
    endpoint: read("AWS_ENDPOINT_URL_S3"),
    credentials: {
      accessKeyId: read("AWS_ACCESS_KEY_ID"),
      secretAccessKey: read("AWS_SECRET_ACCESS_KEY"),
    },
    forcePathStyle: true,
  });
  await s3.send(
    new DeleteObjectCommand({
      Bucket: read("NEON_OBJECT_STORAGE_BUCKET") || "assets",
      Key: ticket.body.key,
    }),
  );
  console.log("8. Objek uji dibersihkan              : ok");

  await browser.close();

  const ok =
    ticket.body.ok &&
    upload.ok &&
    download.body.ok &&
    text === content.toString() &&
    forbidden.status === 403;

  console.log("");
  console.log(ok ? "OBJECT STORAGE OK — terhubung lewat aplikasi" : "GAGAL");
  process.exit(ok ? 0 : 1);
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

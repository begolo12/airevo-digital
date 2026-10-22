// Memastikan endpoint ekspor menolak permintaan tanpa sesi.
//
// Percobaan pertama memakai `context.request` yang berbagi cookie dengan
// browser, sehingga hasilnya menyesatkan. Di sini dipakai konteks baru yang
// benar-benar tanpa cookie.

const { chromium, request } = require("playwright");

const BASE = "http://localhost:3100";

(async () => {
  // 1. Tanpa cookie sama sekali.
  const anonymous = await request.newContext();
  const response = await anonymous.get(`${BASE}/api/ekspor/transaksi`);
  const body = await response.text();

  console.log("Tanpa cookie:");
  console.log("  status          :", response.status());
  console.log("  content-type    :", response.headers()["content-type"] ?? "(tidak ada)");
  console.log("  isi (60 char)   :", body.slice(0, 60).replace(/\s+/g, " "));
  console.log(
    "  berbentuk CSV?  :",
    (response.headers()["content-type"] ?? "").includes("text/csv") ? "YA (BOCOR)" : "tidak",
  );

  await anonymous.dispose();

  // 2. Dengan cookie sesi palsu.
  const forged = await request.newContext({
    extraHTTPHeaders: { cookie: "airevo_session=palsu.tanda.tangan" },
  });
  const forgedResponse = await forged.get(`${BASE}/api/ekspor/transaksi`);
  console.log("");
  console.log("Cookie palsu:");
  console.log("  status          :", forgedResponse.status());
  console.log(
    "  berbentuk CSV?  :",
    (forgedResponse.headers()["content-type"] ?? "").includes("text/csv")
      ? "YA (BOCOR)"
      : "tidak",
  );

  await forged.dispose();

  const leaked =
    (response.headers()["content-type"] ?? "").includes("text/csv") ||
    (forgedResponse.headers()["content-type"] ?? "").includes("text/csv");

  console.log("");
  console.log(leaked ? "GAGAL — data bisa diunduh tanpa sesi" : "AMAN — sesi wajib");
  process.exit(leaked ? 1 : 0);
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

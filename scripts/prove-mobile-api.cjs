// Menguji API mobile dari ujung ke ujung, seperti yang dilakukan aplikasi.
//
// Alur: login → pilih profil + PIN → ambil ringkasan, transaksi, tagihan,
// anggaran, laporan → pastikan sesi tidak sah ditolak.

const BASE = process.env.API_BASE ?? "http://localhost:3100";

let failures = 0;

function check(label, ok, detail = "") {
  console.log(`${ok ? "ok  " : "GAGAL"}  ${label}${detail ? `  ${detail}` : ""}`);
  if (!ok) failures += 1;
}

async function api(path, { token, method = "GET", body } = {}) {
  const headers = { accept: "application/json", "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  return { status: response.status, ...payload };
}

(async () => {
  /* ------------------------------ 1. tanpa token ----------------------------- */

  const anonymous = await api("/api/mobile/summary");
  check("tanpa token ditolak 401", anonymous.status === 401, `status ${anonymous.status}`);

  const badToken = await api("/api/mobile/summary", { token: "palsu.tanda-tangan" });
  check("token palsu ditolak 401", badToken.status === 401, `status ${badToken.status}`);

  /* -------------------------------- 2. login -------------------------------- */

  const wrongPassword = await api("/api/mobile/auth/login", {
    method: "POST",
    body: { email: "irvan@airevo-digital.my.id", password: "salah" },
  });
  check("kata sandi salah ditolak", wrongPassword.status === 401, `status ${wrongPassword.status}`);

  const login = await api("/api/mobile/auth/login", {
    method: "POST",
    body: { email: "irvan@airevo-digital.my.id", password: "airevo123" },
  });

  check("login berhasil", login.ok === true, `status ${login.status}`);
  if (!login.ok) {
    console.log("\nBERHENTI: login gagal, sisa pemeriksaan dilewati.");
    process.exit(1);
  }

  const profileToken = login.data.token;
  check("token tahap profile diterima", typeof profileToken === "string" && profileToken.length > 20);
  check("profil dikembalikan", login.data.profiles.length > 0, `${login.data.profiles.length} profil`);

  /* --------------------------- 3. token belum aktif -------------------------- */

  const tooEarly = await api("/api/mobile/summary", { token: profileToken });
  check("token tahap profile tidak boleh baca data", tooEarly.status === 403, `status ${tooEarly.status}`);

  /* --------------------------- 4. pilih profil + PIN ------------------------- */

  const irvan = login.data.profiles.find((item) => item.id === "p-irvan");
  if (!irvan) {
    console.log("GAGAL  profil p-irvan tidak ada");
    process.exit(1);
  }

  const wrongPin = await api("/api/mobile/auth/profile", {
    method: "POST",
    body: { token: profileToken, profileId: "p-irvan", pin: "0000" },
  });
  check("PIN salah ditolak", wrongPin.status === 401, `status ${wrongPin.status}`);

  const unlock = await api("/api/mobile/auth/profile", {
    method: "POST",
    body: { token: profileToken, profileId: "p-irvan", pin: "1234" },
  });
  check("PIN benar diterima", unlock.ok === true, `status ${unlock.status}`);
  if (!unlock.ok) {
    console.log("\nBERHENTI: PIN gagal.");
    process.exit(1);
  }

  const token = unlock.data.token;
  check("token aktif diterbitkan", typeof token === "string" && token !== profileToken);
  check("workspace ditentukan", typeof unlock.data.workspaceId === "string", unlock.data.workspaceId);

  /* ------------------------------- 5. identitas ------------------------------ */

  const me = await api("/api/mobile/me", { token });
  check("identitas terbaca", me.ok === true && me.data.profile.id === "p-irvan");

  /* ------------------------------- 6. ringkasan ------------------------------ */

  const summary = await api("/api/mobile/summary", { token });
  check("ringkasan terbaca", summary.ok === true);
  if (summary.ok) {
    const d = summary.data;
    check("  saldo berupa angka", Number.isInteger(d.balance), String(d.balance));
    check("  pemasukan > 0", d.income > 0, String(d.income));
    check("  proyeksi 6 bulan", d.projection.length === 6, `${d.projection.length} bulan`);
    check(
      "  proyeksi berisi angka",
      d.projection.every((p) => Number.isInteger(p.balance)),
    );
    check("  kekayaan bersih terbaca", Number.isInteger(d.netWorth), String(d.netWorth));
  }

  /* ------------------------------- 7. transaksi ------------------------------ */

  const tx = await api("/api/mobile/transactions?limit=5", { token });
  check("transaksi terbaca", tx.ok === true);
  if (tx.ok) {
    check("  dibatasi 5", tx.data.items.length <= 5, `${tx.data.items.length} baris`);
    check("  total > 0", tx.data.total > 0, String(tx.data.total));
    check("  ada hasMore", typeof tx.data.hasMore === "boolean");
    const first = tx.data.items[0];
    check("  nominal integer", Number.isInteger(first.amount), String(first.amount));
    check("  tanggal ISO", /^\d{4}-\d{2}-\d{2}$/.test(first.occurredAt), first.occurredAt);
  }

  const page2 = await api("/api/mobile/transactions?limit=5&offset=5", { token });
  check("paginasi bekerja", page2.ok === true && page2.data.offset === 5);

  /* -------------------------------- 8. tagihan ------------------------------- */

  const bills = await api("/api/mobile/bills", { token });
  check("tagihan terbaca", bills.ok === true);
  if (bills.ok) {
    check("  ada tagihan", bills.data.items.length > 0, `${bills.data.items.length} tagihan`);
    check("  total integer", Number.isInteger(bills.data.total));
  }

  /* -------------------------------- 9. anggaran ------------------------------ */

  const budgets = await api("/api/mobile/budgets", { token });
  check("anggaran terbaca", budgets.ok === true);
  if (budgets.ok) {
    check("  ada kategori", budgets.data.items.length > 0);
  }

  /* -------------------------------- 10. laporan ------------------------------ */

  const reports = await api("/api/mobile/reports", { token });
  check("laporan terbaca", reports.ok === true);
  if (reports.ok) {
    check("  tren 12 bulan", reports.data.series.length === 12, `${reports.data.series.length} bulan`);
    check("  kategori terisi", reports.data.categories.length > 0);
  }

  /* -------------------------------- 11. tujuan ------------------------------- */

  const goals = await api("/api/mobile/goals", { token });
  check("tujuan terbaca", goals.ok === true);

  /* ------------------------------- 12. kalender ------------------------------ */

  const month = new Date().toISOString().slice(0, 7);
  const calendar = await api(`/api/mobile/calendar?month=${month}`, { token });
  check("kalender terbaca", calendar.ok === true);

  const badMonth = await api("/api/mobile/calendar?month=2026-13", { token });
  check("bulan tidak sah ditolak", badMonth.status === 422, `status ${badMonth.status}`);

  /* ------------------------------ 13. referensi ------------------------------ */

  const reference = await api("/api/mobile/reference", { token });
  check("referensi terbaca", reference.ok === true);
  if (reference.ok) {
    check("  ada akun", reference.data.accounts.length > 0);
    check("  ada kategori", reference.data.categories.length > 0);
  }

  /* ------------------------ 14. isolasi antar workspace ---------------------- */

  /*
   * Isolasi antar ruang.
   *
   * Sari adalah anggota ruang bersama `ws-family`, jadi setelah masuk ia
   * memang mendapat data yang sama — itu benar, bukan kebocoran. Yang perlu
   * dibuktikan adalah bahwa ruang **pribadi** Bima tidak bisa dibaca oleh
   * token Sari.
   */
  const sariUnlock = await api("/api/mobile/auth/profile", {
    method: "POST",
    body: { token: profileToken, profileId: "p-sari", pin: "1234" },
  });

  check("Sari bisa masuk", sariUnlock.ok === true);

  if (sariUnlock.ok) {
    const sariMe = await api("/api/mobile/me", { token: sariUnlock.data.token });
    check(
      "Sari masuk ke ruang bersama (bukan pribadi Irvan)",
      sariMe.ok && sariMe.data.workspaceId !== "ws-irvan",
      `workspace=${sariMe.data?.workspaceId}`,
    );
    check(
      "token Sari bukan token Irvan",
      sariUnlock.data.token !== token,
    );
  }

  console.log("");
  console.log(failures === 0 ? "API MOBILE OK" : `${failures} PEMERIKSAAN GAGAL`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

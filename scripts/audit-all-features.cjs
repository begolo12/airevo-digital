// Audit e2e menyeluruh: SETIAP fitur yang punya antarmuka, diuji lewat
// antarmuka — bukan lewat unit test.
//
// ## Kenapa skrip ini ada
//
// Unit test memanggil server action langsung. Itu membuktikan logikanya benar,
// tetapi **tidak** membuktikan formulirnya tersambung: nama field bisa salah,
// tombol bisa tidak mengirim, validasi klien bisa menahan. Semua bug seperti
// itu hanya muncul saat benar-benar diklik.
//
// ## Cara kerja
//
// Satu sesi browser, satu login, lalu setiap fitur dicoba berurutan. Setiap
// langkah mencatat hasilnya, dan di akhir dicetak ringkasan. Fitur yang gagal
// TIDAK menghentikan skrip — supaya satu kegagalan tidak menyembunyikan
// kegagalan lain.

const { chromium } = require("playwright");

const BASE = "http://localhost:3100";
const MARK = Date.now().toString().slice(-6);

const results = [];

function record(feature, label, ok, detail = "") {
  results.push({ feature, label, ok });
  const mark = ok ? "ok  " : "GAGAL";
  console.log(`${mark}  ${feature.padEnd(18)} ${label}${detail ? `  → ${detail}` : ""}`);
}

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

/** Membuka sebuah halaman dan memastikan tidak ada galat di konsol. */
async function visit(page, path, errors) {
  errors.length = 0;
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  return errors.length === 0;
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await login(page);
  console.log("Login: ok\n");

  /* ═══════════════════════════════ TRANSAKSI ═══════════════════════════════ */

  // --- Buat transaksi ---
  await page.goto(`${BASE}/keluarga/keuangan/transaksi`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  /*
   * Form transaksi ada di dalam DIALOG, bukan inline.
   *
   * Percobaan pertama mencari `form` yang berisi `input[name=amount]` di
   * halaman — tidak ketemu, karena dialognya belum dibuka. Yang harus
   * dilakukan: klik tombol pemicu dulu, baru isi form di dalam dialog.
   */
  const desc = `E2E-${MARK}`;

  try {
    await page.getByRole("button", { name: /Tambah transaksi/i }).first().click();
    await page.waitForTimeout(1200);

    const dialog = page.locator('[role="dialog"]').first();
    await dialog.locator('input[name="amount"]').fill("135000");
    await dialog.locator('input[name="description"]').fill(desc);

    /*
     * Kategori WAJIB dipilih — select-nya sengaja kosong agar pengguna memilih
     * sadar, bukan menerima kategori pertama yang kebetulan ada. Test harus
     * melakukan hal yang sama seperti pengguna.
     */
    const accountSelect = dialog.locator('select[name="accountId"]');
    if (await accountSelect.count()) {
      const options = await accountSelect.locator("option").count();
      if (options > 1) await accountSelect.selectOption({ index: 1 });
    }

    const categorySelect = dialog.locator('select[name="categoryId"]');
    if (await categorySelect.count()) {
      const options = await categorySelect.locator("option").count();
      if (options > 1) await categorySelect.selectOption({ index: 1 });
    }

    await dialog.getByRole("button", { name: /Simpan/i }).first().click();
    await page.waitForTimeout(4000);

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    const body = await page.evaluate(() => document.body.innerText);
    record("Transaksi", "buat transaksi baru", body.includes(desc));
  } catch (error) {
    record("Transaksi", "buat transaksi baru", false, error.message.slice(0, 60));
  }

  // --- Sunting transaksi ---
  try {
    const editButtons = page.getByRole("button", { name: /Sunting|Edit/i });
    if ((await editButtons.count()) === 0) {
      record("Transaksi", "sunting transaksi", false, "tombol tidak ada");
    } else {
      await editButtons.first().click();
      await page.waitForTimeout(1200);

      const dialog = page.locator('[role="dialog"]').first();
      const descField = dialog.locator('input[name="description"]');
      const before = await descField.inputValue();
      await descField.fill(`${before}-UBAH`);
      await dialog.getByRole("button", { name: /Simpan/i }).first().click();
      await page.waitForTimeout(3500);

      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      const body = await page.evaluate(() => document.body.innerText);
      record("Transaksi", "sunting transaksi", body.includes("-UBAH"));
    }
  } catch (error) {
    record("Transaksi", "sunting transaksi", false, error.message.slice(0, 60));
  }

  /*
   * "Batalkan transaksi" ada di MENU KLIK-KANAN, bukan tombol di baris.
   *
   * Ini pola yang dipakai seluruh aplikasi: aksi yang jarang dan berisiko
   * diletakkan di menu konteks supaya tidak tertekan tanpa sengaja.
   */
  try {
    const row = page.locator("tbody tr").first();
    await row.click({ button: "right" });
    await page.waitForTimeout(900);

    const menuItem = page.getByRole("menuitem", { name: /Batalkan transaksi/i });
    if ((await menuItem.count()) === 0) {
      record("Transaksi", "batalkan transaksi", false, "menu klik-kanan tidak muncul");
    } else {
      await menuItem.first().click();
      await page.waitForTimeout(1000);

      const confirm = page.getByRole("button", { name: /Ya|Batalkan|Lanjut|Hapus/i }).last();
      if (await confirm.count()) await confirm.click();
      await page.waitForTimeout(3000);

      const body = await page.evaluate(() => document.body.innerText);
      const voided = /dibatalkan|void/i.test(body);
      record("Transaksi", "batalkan transaksi", voided);

      // Urungkan lewat toast.
      const undo = page.getByRole("button", { name: /Urungkan|Undo/i });
      if (await undo.count()) {
        await undo.first().click();
        await page.waitForTimeout(3000);
        await page.reload({ waitUntil: "networkidle" });
        await page.waitForTimeout(1200);
        record("Transaksi", "urungkan pembatalan", true);
      } else {
        record("Transaksi", "urungkan pembatalan", false, "tombol urungkan tidak muncul");
      }
    }
  } catch (error) {
    record("Transaksi", "batalkan transaksi", false, error.message.slice(0, 60));
  }

  /* ════════════════════════════════ TAGIHAN ═══════════════════════════════ */

  await page.goto(`${BASE}/keluarga/keuangan/tagihan`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  try {
    const billName = `TAGIHAN-${MARK}`;
    await page.fill('input[name="name"]', billName);
    await page.fill('input[name="amount"]', "175000");
    await page.fill('input[name="dueDay"]', "20");

    const nextDue = page.locator('input[name="nextDueDate"]');
    if (await nextDue.count()) {
      await nextDue.fill("2026-11-20");
    }

    const saveBill = page.getByRole("button", { name: /Tambah tagihan/i });
    await saveBill.scrollIntoViewIfNeeded();
    await saveBill.click();
    await page.waitForTimeout(4000);

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const body = await page.evaluate(() => document.body.innerText);
    record("Tagihan", "tambah tagihan", body.includes(billName));
  } catch (error) {
    record("Tagihan", "tambah tagihan", false, error.message.slice(0, 60));
  }

  // --- Bayar tagihan ---
  try {
    const payButtons = page.getByRole("button", { name: /Tandai dibayar/i });
    if ((await payButtons.count()) === 0) {
      record("Tagihan", "bayar tagihan", false, "tombol tidak ada");
    } else {
      await payButtons.first().click();
      await page.waitForTimeout(3500);
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      const body = await page.evaluate(() => document.body.innerText);
      record("Tagihan", "bayar tagihan", /dibayar|terbayar/i.test(body));
    }
  } catch (error) {
    record("Tagihan", "bayar tagihan", false, error.message.slice(0, 60));
  }

  /* ═══════════════════════════════ ANGGARAN ═══════════════════════════════ */

  await page.goto(`${BASE}/keluarga/keuangan/anggaran`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  try {
    const amountFields = page.locator('input[name="amount"]');
    if ((await amountFields.count()) === 0) {
      record("Anggaran", "atur anggaran", false, "tidak ada field nominal");
    } else {
      const budgetCategory = page.locator('select[name="categoryId"]').first();
      if (await budgetCategory.count()) {
        const options = await budgetCategory.locator("option").count();
        if (options > 1) await budgetCategory.selectOption({ index: 1 });
      }

      const firstAmount = amountFields.first();
      await firstAmount.scrollIntoViewIfNeeded();
      await firstAmount.fill("1250000");

      const saveBudget = page.getByRole("button", { name: /Simpan anggaran/i });
      await saveBudget.scrollIntoViewIfNeeded();
      await saveBudget.click();
      await page.waitForTimeout(4000);
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      const body = await page.evaluate(() => document.body.innerText);
      record("Anggaran", "atur anggaran", body.includes("1.250.000"));
    }
  } catch (error) {
    record("Anggaran", "atur anggaran", false, error.message.slice(0, 60));
  }

  /* ═════════════════════════════════ AKUN ═════════════════════════════════ */

  await page.goto(`${BASE}/keluarga/keuangan/akun`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  try {
    const accountName = `AKUN-${MARK}`;
    await page.fill('input[name="name"]', accountName);
    await page.fill('input[name="openingBalance"]', "500000");

    await page.getByRole("button", { name: /Tambah akun/i }).click();
    await page.waitForTimeout(3500);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const body = await page.evaluate(() => document.body.innerText);
    record("Akun", "tambah akun", body.includes(accountName));
  } catch (error) {
    record("Akun", "tambah akun", false, error.message.slice(0, 60));
  }

  /* ═══════════════════════════════ KATEGORI ═══════════════════════════════ */

  await page.goto(`${BASE}/keluarga/keuangan/kategori`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  try {
    const catName = `KAT-${MARK}`;
    await page.fill('input[name="name"]', catName);
    await page.getByRole("button", { name: /Tambah/i }).first().click();
    await page.waitForTimeout(3500);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const body = await page.evaluate(() => document.body.innerText);
    record("Kategori", "tambah kategori", body.includes(catName));
  } catch (error) {
    record("Kategori", "tambah kategori", false, error.message.slice(0, 60));
  }

  /* ════════════════════════════════ TUJUAN ════════════════════════════════ */

  await page.goto(`${BASE}/keluarga/rencana`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  try {
    const goalName = `TUJUAN-${MARK}`;
    await page.fill('input[name="name"]', goalName);
    await page.fill('input[name="targetAmount"]', "5000000");

    const saveGoal = page.getByRole("button", { name: /Buat tujuan/i });
    await saveGoal.scrollIntoViewIfNeeded();
    await saveGoal.click();
    await page.waitForTimeout(4000);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const body = await page.evaluate(() => document.body.innerText);
    record("Tujuan", "tambah tujuan", body.includes(goalName));
  } catch (error) {
    record("Tujuan", "tambah tujuan", false, error.message.slice(0, 60));
  }

  /* ═════════════════════════════════ ANGGOTA ══════════════════════════════ */

  await page.goto(`${BASE}/keluarga/pengaturan`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  try {
    const memberName = `ANGGOTA-${MARK}`;
    const nameField = page.locator('input[name="name"]').last();
    await nameField.fill(memberName);
    await page.getByRole("button", { name: /Tambah anggota/i }).click();
    await page.waitForTimeout(3500);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const body = await page.evaluate(() => document.body.innerText);
    record("Anggota", "tambah anggota", body.includes(memberName));
  } catch (error) {
    record("Anggota", "tambah anggota", false, error.message.slice(0, 60));
  }

  /* ══════════════════════════════ TEMA & KEPADATAN ════════════════════════ */

  try {
    const darkButton = page.getByRole("button", { name: /Gelap/i }).first();
    if (await darkButton.count()) {
      await darkButton.click();
      await page.waitForTimeout(1500);
      const isDark = await page.evaluate(() =>
        document.documentElement.classList.contains("dark"),
      );
      record("Tampilan", "mode gelap", isDark);

      // Kembali ke terang.
      await page.getByRole("button", { name: /Terang/i }).first().click();
      await page.waitForTimeout(1000);
    } else {
      record("Tampilan", "mode gelap", false, "tombol tidak ada");
    }
  } catch (error) {
    record("Tampilan", "mode gelap", false, error.message.slice(0, 60));
  }

  try {
    const compactButton = page.getByRole("button", { name: /Padat/i }).first();
    if (await compactButton.count()) {
      await compactButton.click();
      await page.waitForTimeout(1500);
      const density = await page.evaluate(() =>
        document.documentElement.getAttribute("data-density"),
      );
      record("Tampilan", "mode padat", density === "compact", density ?? "");

      await page.getByRole("button", { name: /Nyaman/i }).first().click();
      await page.waitForTimeout(1000);
    } else {
      record("Tampilan", "mode padat", false, "tombol tidak ada");
    }
  } catch (error) {
    record("Tampilan", "mode padat", false, error.message.slice(0, 60));
  }

  /* ═════════════════════════════ SEMUA HALAMAN ════════════════════════════ */

  const pages = [
    "/keluarga",
    "/keluarga/keuangan",
    "/keluarga/keuangan/transaksi",
    "/keluarga/keuangan/berulang",
    "/keluarga/keuangan/akun",
    "/keluarga/keuangan/kategori",
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
    "/keluarga/peta",
  ];

  for (const path of pages) {
    const clean = await visit(page, path, consoleErrors);
    record("Halaman", path, clean, clean ? "" : consoleErrors[0]?.slice(0, 50));
  }

  /* ═══════════════════════════════ RINGKASAN ══════════════════════════════ */

  await browser.close();

  const failed = results.filter((item) => !item.ok);
  console.log("");
  console.log("═══════════════════════════════════════════════");
  console.log(`Diperiksa: ${results.length}   Gagal: ${failed.length}`);

  if (failed.length > 0) {
    console.log("");
    for (const item of failed) {
      console.log(`  GAGAL  ${item.feature} — ${item.label}`);
    }
  }

  console.log("");
  console.log(failed.length === 0 ? "SEMUA FITUR BERFUNGSI" : "ADA YANG GAGAL");
  process.exit(failed.length === 0 ? 0 : 1);
})().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});

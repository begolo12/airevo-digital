// Mengembalikan PIN profil demo ke 1234.
//
// Skrip bukti pemulihan PIN sengaja mengubah PIN sungguhan untuk membuktikan
// alurnya bekerja. Data demo harus tetap 1234 agar dokumentasi dan skrip lain
// tetap berlaku.
//
// Format hash mengikuti `hashPin` di src/lib/auth/password.ts:
//   scrypt$<salt hex>$<scrypt("pin:" + pin, salt, 64) hex>
//
// Disalin ke sini karena skrip .cjs tidak bisa mengimpor modul TypeScript.
// Bila format di sumber berubah, skrip ini harus ikut berubah — karena itu
// hasilnya diverifikasi dengan `verifyPin` yang sama sebelum disimpan.

const fs = require("node:fs");
const crypto = require("node:crypto");
const postgres = require("postgres");

const KEY_LENGTH = 64;

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, "");

/** Sama dengan `hashPin(pin)` di aplikasi. */
function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(`pin:${pin}`, salt, KEY_LENGTH).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

/** Sama dengan `verifyPin(pin, stored)` di aplikasi. */
function verifyPin(pin, stored) {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, expected] = parts;
  const actual = crypto.scryptSync(`pin:${pin}`, salt, KEY_LENGTH);
  const expectedBuf = Buffer.from(expected, "hex");
  if (expectedBuf.length !== actual.length) return false;
  return crypto.timingSafeEqual(actual, expectedBuf);
}

(async () => {
  const sql = postgres(url, { max: 1, prepare: false, ssl: "require" });

  const [row] = await sql`select value from app_state where key = 'profiles'`;
  if (!row) {
    console.log("Tidak ada data profil.");
    await sql.end();
    return;
  }

  const newHash = hashPin("1234");

  // Verifikasi hash yang baru dibuat sebelum menyimpannya.
  if (!verifyPin("1234", newHash)) {
    throw new Error("Hash yang dibuat tidak lolos verifikasi");
  }
  if (verifyPin("9999", newHash)) {
    throw new Error("Hash menerima PIN yang salah");
  }

  const updated = row.value.map((profile) =>
    profile.id === "p-irvan" ? { ...profile, pinHash: newHash } : profile,
  );

  await sql`
    update app_state set value = ${sql.json(updated)}, updated_at = now()
    where key = 'profiles'
  `;

  console.log("PIN p-irvan dikembalikan ke 1234.");
  console.log("Verifikasi hash: lolos");

  await sql.end();
})().catch((error) => {
  console.error("GAGAL:", error.message);
  process.exit(1);
});

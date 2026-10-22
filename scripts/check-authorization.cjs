// Memeriksa bahwa setiap server action memeriksa sesi.
//
// Celah otorisasi yang ditemukan sebelumnya (`resetDemoData`, `updateMember`,
// dst.) lolos karena tidak ada pemeriksaan sistematis seperti ini: `tsc` hijau,
// 417 test hijau, tetapi action bisa dipanggil tanpa login.
//
// Skrip ini membaca `actions.ts`, memisahkan tiap fungsi, lalu memeriksa apakah
// badannya memanggil salah satu fungsi sesi.

const fs = require("node:fs");

const SOURCE = "src/lib/data/actions.ts";
const lines = fs.readFileSync(SOURCE, "utf8").split("\n");

/**
 * Action yang memang **tidak** memerlukan sesi, beserta alasannya.
 * Daftar ini harus tetap kecil — setiap tambahan perlu alasan tertulis.
 */
const PUBLIC_ACTIONS = new Map([
  ["loginAction", "Pengguna belum punya sesi saat memanggil ini."],
  ["logoutAction", "Menghapus sesi yang mungkin sudah tidak ada."],
  ["switchProfileAction", "Memakai getSession() langsung, bukan requireViewer()."],
  ["submitContact", "Form kontak publik di halaman marketing."],
]);

/** Pemanggilan yang menandakan pemeriksaan sesi. */
const GUARDS = [
  "currentScope()",
  "requireViewer()",
  "requireActiveSession()",
  "requireSession()",
  "requireAccountSession()",
  "getViewer()",
  "getAccountSession()",
  "getSession()",
];

/* --------------------------- kumpulkan action ----------------------------- */

const actions = [];
for (let index = 0; index < lines.length; index += 1) {
  const match = lines[index].match(/^export async function (\w+)/);
  if (match) actions.push({ name: match[1], start: index });
}

/* ------------------------------ periksa ----------------------------------- */

const unguarded = [];

for (let index = 0; index < actions.length; index += 1) {
  const action = actions[index];
  const end = index + 1 < actions.length ? actions[index + 1].start : lines.length;
  const body = lines.slice(action.start, end).join("\n");

  const guarded = GUARDS.some((guard) => body.includes(guard));
  if (guarded) continue;

  if (PUBLIC_ACTIONS.has(action.name)) continue;

  unguarded.push({ name: action.name, line: action.start + 1 });
}

console.log(`${actions.length} server action diperiksa.`);
console.log(`${PUBLIC_ACTIONS.size} boleh publik (punya alasan tertulis).`);

if (unguarded.length === 0) {
  console.log("\nSemua action lain memeriksa sesi.");
  process.exit(0);
}

console.log(`\n${unguarded.length} action TANPA pemeriksaan sesi:\n`);
for (const action of unguarded) {
  console.log(`  ${action.name}  (${SOURCE}:${action.line})`);
}

console.log(
  "\nTambahkan pemeriksaan sesi, atau daftarkan di PUBLIC_ACTIONS bila memang publik.",
);
process.exit(1);

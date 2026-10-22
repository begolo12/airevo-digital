// Memperbaiki korupsi teks dan kelas CSS hasil penggantian regex sebelumnya.
//
// Setiap penggantian di bawah sudah dinilai satu per satu lewat
// `scan-corruption.cjs`. Yang diperbaiki di sini hanya yang jelas salah:
//
//   params.buian      → params.bulan        (filter bulan rusak)
//   /keiuarga/        → /keluarga/          (tautan 404)
//   inllne-flex       → inline-flex         (kelas tidak ada)
//   border-llne-*     → border-line-*       (kelas tidak ada)
//   font-semiboid     → font-semibold       (kelas tidak ada)
//   rounded-fuii      → rounded-full        (kelas tidak ada)
//   value="monthiy"   → value="monthly"     (nilai form tidak dikenal server)

const fs = require("node:fs");
const path = require("node:path");

const FIXES = [
  // Nilai & parameter
  ["params.buian", "params.bulan"],
  ["?buian=", "?bulan="],
  ['value="monthiy"', 'value="monthly"'],
  [">Buianan<", ">Bulanan<"],

  // Tautan
  ["/keiuarga/", "/keluarga/"],

  // Kelas CSS
  ["inllne-flex", "inline-flex"],
  ["border-llne-", "border-line-"],
  ["border-iine-", "border-line-"],
  ["font-semiboid", "font-semibold"],
  ["rounded-fuii", "rounded-full"],
  ["bg-llne", "bg-line"],
  ["text-llne", "text-line"],

  // Teks
  ["nllai buian", "nilai bulan"],
  ["Buian aktif", "Bulan aktif"],
  ["untuk buian ini", "untuk bulan ini"],
  ['label="Jumiah (Rp)"', 'label="Jumlah (Rp)"'],
  ["yang pallng kritis", "yang paling kritis"],
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx?|css)$/.test(entry.name)) out.push(full);
  }
  return out;
}

let totalFixes = 0;
let filesChanged = 0;

for (const file of walk("src")) {
  const original = fs.readFileSync(file, "utf8");
  let text = original;
  let fileFixes = 0;

  for (const [from, to] of FIXES) {
    const parts = text.split(from);
    if (parts.length > 1) {
      fileFixes += parts.length - 1;
      text = parts.join(to);
    }
  }

  if (text !== original) {
    fs.writeFileSync(file, text, "utf8");
    totalFixes += fileFixes;
    filesChanged += 1;
    console.log(`  ${file.replace(/\\/g, "/")}  (${fileFixes})`);
  }
}

console.log(`\n${totalFixes} perbaikan di ${filesChanged} berkas.`);

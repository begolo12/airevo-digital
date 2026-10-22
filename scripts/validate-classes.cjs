// Memvalidasi setiap kelas yang dipakai di `src/` terhadap CSS hasil build.
//
// Cara ini menangkap korupsi yang tidak terdaftar di daftar pola: kelas yang
// ditulis tapi tidak pernah dihasilkan Tailwind berarti salah ketik, dan
// gayanya diam-diam hilang. Contoh nyata yang ditemukan: `inllne-flex`,
// `font-semiboid`, `rounded-fuii`, `border-llne-strong`.
//
// Kelas dinamis (hasil interpolasi) dilewati karena memang tidak bisa
// diverifikasi secara statis.

const fs = require("node:fs");
const path = require("node:path");

/* --------------------------- kumpulkan CSS build -------------------------- */

function findCss(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findCss(full, out);
    else if (entry.name.endsWith(".css")) out.push(full);
  }
  return out;
}

const cssFiles = findCss(".next").filter((file) => !file.includes("cache"));
if (cssFiles.length === 0) {
  console.error("Tidak ada CSS hasil build. Jalankan `pnpm build` dulu.");
  process.exit(1);
}

const css = cssFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");

/** Semua kelas yang benar-benar ada di CSS. */
const defined = new Set();
for (const match of css.matchAll(/\.((?:\\.|[^\s,{:>~+"')\]]|[^\x00-\x7F])+)/g)) {
  defined.add(match[1].replace(/\\/g, ""));
}

/* ----------------------------- kumpulkan kelas ---------------------------- */

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * Kelas yang tidak dihasilkan Tailwind tetapi sah dipakai: ditulis manual di
 * `globals.css`, atau ditangani pihak lain.
 */
const MANUAL = new Set([
  "note", "note-tilt-left", "note-tilt-right", "tape", "grid-paper", "hand",
  "label-eyebrow", "surface", "menu-item", "row-interactive", "row-flash",
  "scroll-thin", "paper-grain", "tnum", "skeleton", "animate-rise",
  "animate-fade", "animate-toast", "animate-receipt", "animate-digit",
  "animate-ring", "animate-confetti", "dark", "group", "peer", "sr-only",
]);

/** Awalan kelas yang memang dinamis atau tidak perlu diverifikasi. */
const SKIP_PREFIX = [
  "group-", "peer-", "data-", "aria-", "has-", "dark:", "motion-",
  "print:", "supports-", "rtl:", "ltr:",
];

const suspicious = new Map();

for (const file of walk("src")) {
  const source = fs.readFileSync(file, "utf8");

  // Hanya periksa isi atribut className / string yang berbentuk kelas.
  for (const match of source.matchAll(/(?:className=|cx\(|class=)[\s\S]{0,400}?["'`]([^"'`]+)["'`]/g)) {
    const chunk = match[1];

    for (const token of chunk.split(/[\s]+/)) {
      const clean = token.trim();
      if (!clean || clean.length < 2) continue;
      if (/[${}()[\]]/.test(clean)) continue; // dinamis
      if (clean.includes("/")) continue; // opacity modifier, sulit diverifikasi
      if (SKIP_PREFIX.some((prefix) => clean.startsWith(prefix))) continue;
      if (MANUAL.has(clean)) continue;

      // Hanya periksa token yang berbentuk utilitas Tailwind.
      if (!/^[a-z][a-z0-9-]*(:|$)/.test(clean)) continue;

      const base = clean.includes(":") ? clean.slice(clean.lastIndexOf(":") + 1) : clean;
      if (!base) continue;
      if (MANUAL.has(base)) continue;

      if (!defined.has(clean) && !defined.has(base)) {
        if (!suspicious.has(clean)) {
          suspicious.set(clean, new Set());
        }
        suspicious.get(clean).add(file.replace(/\\/g, "/"));
      }
    }
  }
}

if (suspicious.size === 0) {
  console.log("Semua kelas yang dipakai ada di CSS hasil build.");
  process.exit(0);
}

const sorted = [...suspicious.entries()].sort((a, b) => a[0].localeCompare(b[0]));
console.log(`${sorted.length} kelas tidak ditemukan di CSS hasil build:\n`);

for (const [cls, files] of sorted.slice(0, 60)) {
  console.log(`  ${cls}`);
  for (const file of [...files].slice(0, 2)) console.log(`      ${file}`);
}

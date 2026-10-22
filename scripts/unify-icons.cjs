// Mengganti ikon SVG inline dengan komponen `<Icon>`.
//
// Sebelumnya ada dua cara menulis ikon yang sama: 29 lewat `<Icon>` dan 20
// sebagai SVG inline. Dua cara untuk hal yang sama berarti ukuran dan
// ketebalan garis bisa menyimpang tanpa disadari, dan setiap perubahan gaya
// ikon harus disentuh di dua tempat.
//
// Skrip ini mencocokkan blok `<svg ...>...</svg>` beserta jalurnya, lalu
// memetakannya ke nama ikon yang sudah ada di `icon.tsx`.

const fs = require("node:fs");

/**
 * Peta: potongan `d="..."` → nama ikon.
 * Hanya ikon yang memang sudah ada di `icon.tsx`.
 */
const ICON_BY_PATH = [
  { d: "M19 12H5M11 6l-6 6 6 6", name: "arrow-left" },
  { d: "M5 12h14M13 6l6 6-6 6", name: "arrow-right" },
  { d: "M4 7h16M4 12h16M4 17h16", name: "menu" },
  { d: "M6 6l12 12M18 6L6 18", name: "close" },
  { d: "M12 5v14M5 12h14", name: "plus" },
  { d: "M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z", name: "command" },
  { d: "M9 18l6-6-6-6", name: "chevron-right" },
  { d: "M6 9l6 6 6-6", name: "chevron-down" },
  { d: "M12 4v11M7.5 11L12 15.5 16.5 11M4 19h16", name: "download" },
  { d: "M12 20V9M7.5 13L12 8.5 16.5 13M4 5h16", name: "upload" },
  { d: "M20 11.5l-7.8 7.8a4.5 4.5 0 0 1-6.4-6.4l8-8a3 3 0 0 1 4.3 4.3l-7.9 7.9a1.5 1.5 0 0 1-2.2-2.2l7.1-7.1", name: "paperclip" },
  { d: "M4 6h16M7 12h10M10 18h4", name: "filter" },
  { d: "M5 12h14", name: "minus" },
  { d: "M4 16.5l5.5-5.5 3.5 3.5L20 7M20 7h-5M20 7v5", name: "trend-up" },
  { d: "M4 7.5L9.5 13l3.5-3.5L20 16.5M20 16.5h-5M20 16.5v-5", name: "trend-down" },
];

const files = process.argv.slice(2);
let totalReplaced = 0;

for (const file of files) {
  let source = fs.readFileSync(file, "utf8");
  const original = source;

  /*
   * Cocokkan blok svg satu baris maupun multi-baris. `[\s\S]` dipakai agar
   * newline ikut cocok tanpa bergantung pada bentuk line ending berkas.
   */
  source = source.replace(/<svg[\s\S]*?<\/svg>/g, (block) => {
    // Ambil semua `d="..."` di dalam blok.
    const paths = [...block.matchAll(/d="([^"]+)"/g)].map((match) => match[1]);
    if (paths.length === 0) return block;

    const match = ICON_BY_PATH.find((entry) =>
      paths.some((path) => path.replace(/\s+/g, "") === entry.d.replace(/\s+/g, "")),
    );
    if (!match) return block;

    // Ambil ukuran dari atribut width.
    const width = block.match(/width="(\d+)"/);
    const size = width ? width[1] : "18";

    // Ambil ketebalan garis bila ada.
    const strokeWidth = block.match(/strokeWidth="([\d.]+)"/);
    const stroke = strokeWidth ? ` strokeWidth={${strokeWidth[1]}}` : "";

    // Pertahankan className bila ada (mis. `animate-spin`).
    const className = block.match(/className="([^"]+)"/);
    const extra = className ? ` className="${className[1]}"` : "";

    totalReplaced += 1;
    return `<Icon name="${match.name}" size={${size}}${stroke}${extra} />`;
  });

  if (source !== original) {
    fs.writeFileSync(file, source, "utf8");
    console.log(`  ${file.replace(/\\/g, "/")}`);
  }
}

console.log(`\n${totalReplaced} ikon diganti.`);

// Menambahkan import `Icon` pada berkas yang memakainya.
//
// Dijalankan setelah `unify-icons.cjs` mengganti SVG inline menjadi `<Icon>`.

const fs = require("node:fs");

const IMPORT_LINE = 'import { Icon } from "@/components/ui/icon";';

for (const file of process.argv.slice(2)) {
  const source = fs.readFileSync(file, "utf8");

  if (!source.includes("<Icon")) continue;
  if (source.includes('from "@/components/ui/icon"')) continue;

  const lines = source.split("\n");

  // Cari baris import terakhir, lalu sisipkan setelahnya.
  let lastImport = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (/^import\s/.test(lines[index])) lastImport = index;
    // Import multi-baris: berhenti saat menemukan penutup.
    if (/^} from "/.test(lines[index])) lastImport = index;
  }

  if (lastImport === -1) {
    lines.unshift(IMPORT_LINE);
  } else {
    lines.splice(lastImport + 1, 0, IMPORT_LINE);
  }

  fs.writeFileSync(file, lines.join("\n"), "utf8");
  console.log(`  ${file.replace(/\\/g, "/")}`);
}

console.log("Import Icon ditambahkan.");

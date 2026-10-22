// Mencari query yang menerima `viewer` tetapi dipanggil tanpa viewer.
//
// Query yang menerima `viewer` memakainya untuk dua hal: menyaring per ruang
// data, dan menyaring transaksi privat. Memanggilnya tanpa viewer berarti
// menampilkan data dari SEMUA ruang — kebocoran yang tidak terlihat di layar
// karena hasilnya tetap "masuk akal", hanya bercampur.

const fs = require("node:fs");
const path = require("node:path");

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

// Kumpulkan fungsi query yang menerima `viewer`.
const queries = fs.readFileSync("src/lib/data/queries.ts", "utf8");
const viewerFns = new Set();
const fnPattern = /export function (\w+)\(([\s\S]*?)\)\s*(?::[^{]+)?\{/g;
let match;
while ((match = fnPattern.exec(queries)) !== null) {
  if (match[2].includes("viewer")) viewerFns.add(match[1]);
}

console.log(`Query yang menerima viewer: ${viewerFns.size}`);
console.log([...viewerFns].join(", "));
console.log("");

// Periksa setiap pemanggilan di halaman dan komponen.
const findings = [];

for (const file of walk("src")) {
  if (file.includes("queries.ts")) continue;

  const source = fs.readFileSync(file, "utf8");
  const lines = source.split("\n");
  const hasViewer = /requireViewer|getViewer/.test(source);

  for (const [index, line] of lines.entries()) {
    if (line.trim().startsWith("//") || line.trim().startsWith("*")) continue;

    for (const fn of viewerFns) {
      const call = new RegExp(`\\b${fn}\\(`, "g");
      if (!call.test(line)) continue;

      // Sudah meneruskan viewer?
      if (/\bviewer\b/.test(line)) continue;

      findings.push({
        file: file.replace(/\\/g, "/").replace(/^src\//, ""),
        line: index + 1,
        fn,
        text: line.trim().slice(0, 90),
        hasViewer,
      });
    }
  }
}

if (findings.length === 0) {
  console.log("Tidak ada pemanggilan tanpa viewer.");
} else {
  console.log(`Pemanggilan TANPA viewer: ${findings.length}\n`);

  const byFile = new Map();
  for (const item of findings) {
    if (!byFile.has(item.file)) byFile.set(item.file, []);
    byFile.get(item.file).push(item);
  }

  for (const [file, items] of byFile) {
    const scoped = items[0].hasViewer ? "punya requireViewer" : "TANPA requireViewer";
    console.log(`${file}  (${scoped})`);
    for (const item of items) {
      console.log(`  ${item.line}: ${item.fn}()  →  ${item.text}`);
    }
    console.log("");
  }
}

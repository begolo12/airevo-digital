// Memindai korupsi karakter hasil penggantian regex massal sebelumnya.
//
// Pola korupsi: huruf `i` dan `l` tertukar, `a`/`u` tertukar, dan sejenisnya.
// Ini menghasilkan bug NYATA, bukan sekadar salah ketik:
//   - `/keiuarga/`      → tautan navigasi 404
//   - `params.buian`    → filter bulan tidak berfungsi
//   - `font-semiboid`   → kelas CSS tidak ada, gaya hilang
//
// Skrip ini melaporkan setiap kecurigaan dengan konteks agar bisa dinilai
// satu per satu, bukan diganti buta.

const fs = require("node:fs");
const path = require("node:path");

/** Kata yang benar → varian rusak yang mungkin muncul. */
const SUSPECTS = [
  // `l` → `i`
  [/\bkeiuarga\b/g, "keluarga"],
  [/\bnllai\b/g, "nilai"],
  [/\bbuian\b/g, "bulan"],
  [/\bBuian\b/g, "Bulan"],
  [/\bjumiah\b/g, "jumlah"],
  [/\bJumiah\b/g, "Jumlah"],
  [/\bpallng\b/g, "paling"],
  [/\bsemiboid\b/g, "semibold"],
  [/\bmonthiy\b/g, "monthly"],
  [/\bbuianan\b/gi, "bulanan"],
  [/\bkeiuar\b/g, "keluar"],
  [/\bKeiuar\b/g, "Keluar"],
  [/\bkeluarg4\b/g, "keluarga"],
  [/\btidаk\b/g, "tidak"],
  [/\byаng\b/g, "yang"],
  [/\bdаn\b/g, "dan"],
  [/\bdаri\b/g, "dari"],
  [/\bаkan\b/g, "akan"],
  [/\bаtau\b/g, "atau"],
  [/\bdengаn\b/g, "dengan"],
  [/\buntuк\b/g, "untuk"],
  [/\bkаrena\b/g, "karena"],
  [/\bаntara\b/g, "antara"],
  [/\bаdalah\b/g, "adalah"],
  [/\btаhun\b/g, "tahun"],
  [/\bbulаn\b/g, "bulan"],
  [/\bhаri\b/g, "hari"],
  [/\bnаmа\b/g, "nama"],
  [/\bjumlаh\b/g, "jumlah"],
  [/\btаnggаl\b/g, "tanggal"],
  [/\bsаldo\b/g, "saldo"],
  [/\bаnggаran\b/g, "anggaran"],
  [/\btrаnsаksi\b/g, "transaksi"],
  [/\bkаtegori\b/g, "kategori"],
  [/\bаkun\b/g, "akun"],
  [/\btаgihаn\b/g, "tagihan"],
  [/\brencаnа\b/g, "rencana"],
  [/\blаporаn\b/g, "laporan"],
  [/\bаnggotа\b/g, "anggota"],
  [/\bprofll\b/g, "profil"],
  [/\bProfll\b/g, "Profil"],
  [/\bhasll\b/g, "hasil"],
  [/\btampII\b/g, "tampil"],
  [/\bsald0\b/g, "saldo"],
  [/\baktlf\b/g, "aktif"],
  [/\bharu5\b/g, "harus"],
  [/\bsud4h\b/g, "sudah"],
  [/\bsebelumny4\b/g, "sebelumnya"],
  [/\bkategor1\b/g, "kategori"],
  [/\btransaks1\b/g, "transaksi"],
  [/\banggaran1\b/g, "anggaran"],
  [/\btanggaI\b/g, "tanggal"],
  [/\bKeiuarga\b/g, "Keluarga"],
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx?|css|json|md)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const hits = [];

for (const file of [...walk("src"), ...walk("docs"), ...walk("scripts")]) {
  const lines = fs.readFileSync(file, "utf8").split("\n");

  lines.forEach((line, index) => {
    for (const [pattern, correct] of SUSPECTS) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        hits.push({
          file: file.replace(/\\/g, "/"),
          line: index + 1,
          correct,
          text: line.trim().slice(0, 110),
        });
      }
    }
  });
}

if (hits.length === 0) {
  console.log("Tidak ada korupsi teks ditemukan.");
} else {
  const byFile = new Map();
  for (const hit of hits) {
    if (!byFile.has(hit.file)) byFile.set(hit.file, []);
    byFile.get(hit.file).push(hit);
  }

  for (const [file, items] of byFile) {
    console.log(`\n${file}  (${items.length})`);
    for (const item of items) {
      console.log(`  ${item.line}: [${item.correct}] ${item.text}`);
    }
  }

  console.log(`\nTotal: ${hits.length} kecurigaan di ${byFile.size} berkas.`);
}

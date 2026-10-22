// Mendeteksi korupsi `l`↔`i` dan `a`↔`u` secara presisi.
//
// Alih-alih kamus besar, skrip ini memakai daftar kata Indonesia umum yang
// mengandung `l`, lalu memeriksa apakah varian rusaknya (dengan `l` diganti
// `i`) muncul di teks yang terlihat pengguna. Cara ini presisi: hanya menandai
// kata yang memang bentuk rusak dari kata nyata.

const fs = require("node:fs");
const path = require("node:path");

/** Kata Indonesia umum yang mengandung `l` atau `u`. */
const WORDS = `
belanja belum beli bulan batal batalkan berlaku batalnya salah saldo pilih
pilihan pilihnya jelas jelasnya alat alur alami akhirnya awal hasil kali kecil
kualitas lengkap lebih lewat lihat laporan lalu lalu lintas lingkungan lunas
lupa salah satu selesai seluruh sekolah sesuai simpan sampai sisa siswa
software soal status sudah sulit tambah tampil tanpa tepat terakhir tetap
tidak tinggi tujuan tugas tunai tunda ubah uang umum unduh untuk upah urus
usaha utama wajib waktu wali warna kartu kecil keluarga keluar kembali
kebutuhan kelompok kemudian kepada kerja kesalahan khusus kurang lagi lainnya
lama langganan langsung lembar listrik luar madu makan maksimal mana manfaat
masuk masih masa mata melalui memakai membuat memberi memiliki memuat
menampilkan mencari mendapatkan menjadi menimpa menit menurut menyimpan muncul
mulai nama namun naik negara nilai nyaman obat orang pada pakai paling panduan
panjang pasar pasti pekerja pelajar pemasukan pembayaran pembelian pemilik
pendapatan pendidikan penuh per periode pertama perlu pesan pesanan pihak
pinjam potong proses profil progres pukul puluh rumah rupiah saat saja sakit
sama sangat satu sudah setahun setiap siap simpan soal suami subtotal suka
sumber tahun tanpa tanggal target teman tetap tidak tim tujuan tunai tunda
uang umum unduh untuk upah urus usaha utama wajib waktu wali warna
aktif akun akhir akta aksi anak anggota antar aplikasi arsip aset asuransi
atas atau bagian bagaimana bahan baru batas bawah bayi bebas benar bentuk
berapa berakhir beranda berat berbagi berbagai berhasil beri bersih besar bisa
boleh bruto buat bukan bunga cara catatan cepat cetak cicilan contoh cukup
daftar dalam dapat dari data dengan depan detail dewasa dibuat digunakan
dihapus diisi dilakukan dimulai diterima dokumen dua dulu edisi enam fitur
gambar gaji ganti gaya gedung gizi gratis gula guru habis hampir hari harus
hati henti hidup hijau hubungi ibu ikut impor ini ingin isi istri izin jadi
jadwal jatuh jauh jumlah juta kabar kalender kami kamu kanan karya kas
kategori keadaan kebijakan kembali kesehatan keterangan kualitas lagi
laporan lembar lengkap lihat lupa mata maksud melalui mencari menjadi
`.trim()
    .split(/\s+/)
    .filter(Boolean);

/** Varian rusak: `l` → `i`, `u` → `a`, `a` → `u`. */
function variants(word) {
  const out = new Set();
  if (word.includes("l")) out.add(word.replace(/l/g, "i"));
  if (word.includes("u")) out.add(word.replace(/u/g, "a"));
  if (word.includes("a")) out.add(word.replace(/a/g, "u"));
  // `ll` → `ii` sudah tercakup di atas.
  return [...out].filter((v) => v !== word);
}

const CORRUPT = new Map();
for (const word of WORDS) {
  for (const variant of variants(word)) {
    CORRUPT.set(variant, word);
  }
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

function visibleText(source) {
  const chunks = [];
  for (const match of source.matchAll(/>([^<>{}]{3,200})</g)) chunks.push(match[1]);
  for (const match of source.matchAll(
    /(?:title|hint|label|placeholder|description|aria-label|alt)=(?:"|{`)([^"'`{}]{3,200})/g,
  )) {
    chunks.push(match[1]);
  }
  return chunks;
}

const hits = [];

for (const file of walk("src")) {
  const lines = fs.readFileSync(file, "utf8").split("\n");

  lines.forEach((line, index) => {
    for (const chunk of visibleText(line)) {
      const cleaned = chunk.replace(/\{[^}]*\}/g, " ").replace(/[^A-Za-z\s-]/g, " ");
      for (const raw of cleaned.split(/[\s-]+/)) {
        const word = raw.trim().toLowerCase();
        if (word.length < 3) continue;
        if (CORRUPT.has(word)) {
          hits.push({
            file: file.replace(/\\/g, "/"),
            line: index + 1,
            wrong: word,
            right: CORRUPT.get(word),
            text: line.trim().slice(0, 100),
          });
        }
      }
    }
  });
}

if (hits.length === 0) {
  console.log("Tidak ada korupsi l/i atau a/u ditemukan.");
} else {
  const seen = new Set();
  for (const hit of hits) {
    const key = `${hit.file}:${hit.line}:${hit.wrong}`;
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`${hit.file}:${hit.line}`);
    console.log(`  "${hit.wrong}" → "${hit.right}"`);
    console.log(`  ${hit.text}`);
  }
  console.log(`\nTotal: ${seen.size} kecurigaan.`);
}

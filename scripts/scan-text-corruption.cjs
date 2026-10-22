// Pemindai korupsi teks menyeluruh.
//
// ## Kenapa kamus dibangun dari dokumentasi
//
// Daftar kata manual selalu ketinggalan: `pengeiuaran`, `membiokir`, `sinyai`,
// `teriambat`, `totais` semuanya lolos dari pemindaian sebelumnya. Dokumentasi
// di `docs/` ditulis dalam bahasa Indonesia yang benar dan memuat ribuan kata
// yang sama dengan yang dipakai antarmuka.
//
// Jadi: kamus = semua kata dari `docs/*.md` + kata umum tambahan. Lalu setiap
// kata di teks antarmuka yang TIDAK ada di kamus, tetapi berubah menjadi kata
// kamus bila `l`→`i` atau `i`→`l`, dilaporkan sebagai korupsi.
//
// Cara ini presisi: hanya menandai kata yang punya "kembaran" sah di kamus.

const fs = require("node:fs");
const path = require("node:path");

/* ------------------------- bangun kamus dari docs ------------------------- */

function walk(dir, extensions, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", ".git", "shots"].includes(entry.name)) continue;
      walk(full, extensions, out);
    } else if (extensions.some((extension) => entry.name.endsWith(extension))) {
      out.push(full);
    }
  }
  return out;
}

/** Kata yang sah: dari dokumentasi, kode, dan daftar tambahan. */
const dictionary = new Set();

function addWords(text) {
  // Hanya huruf; buang kode, angka, dan simbol.
  const cleaned = text.replace(/`[^`]*`/g, " ").replace(/[^A-Za-z\s-]/g, " ");
  for (const raw of cleaned.split(/[\s-]+/)) {
    const word = raw.trim().toLowerCase();
    if (word.length >= 3) dictionary.add(word);
  }
}

for (const file of walk("docs", [".md"])) {
  addWords(fs.readFileSync(file, "utf8"));
}

// Kata umum yang mungkin tidak muncul di dokumentasi.
addWords(`
  abaikan acak acara adaptasi adik agenda ahli air ajaran akses aktif akta akun
  akuntansi alat alamat alergi alih alur anak anda anggaran anggota angka
  angkanya antar antarmuka aplikasi arsip arus aset asinkron asli asuransi
  atur awalan ayah bagian bahasa bahan bantu banyak barang baris batalkan batas
  bawah bayi bayar belum benar beranda berapa berakhir berat berbagi berbagai
  berhasil berhenti beri berlaku bersih besar bisa boleh bruto buat bulan
  bulanan bunga cara catatan cepat cetak cicilan contoh cukup daftar dalam
  dapat dari data dengan depan detail dewasa diagih dibayar dibuat digunakan
  dihapus diisi dilakukan dimulai diterima dokumen dua dulu edisi enam fitur
  gambar gaji ganti gaya gedung gizi gratis gula guru habis hampir hari harus
  hasil hati henti hidup hijau hubungi ibu ikut impor ingin isi istri izin jadi
  jadwal jatuh jauh jumlah juta kabar kalender kami kamu kanan kartu karya kas
  kategori keadaan kebijakan kecil kebutuhan kembali keluar keluarga kelompok
  kemudian kepada kerja kesalahan kesehatan keterangan khusus kualitas kurang
  lagi lainnya lama langganan langsung laporan lembar lengkap lewat lihat
  lingkungan lupa madu makan maksimal mana manfaat masuk masih masa mata
  maksud melalui memakai membuat memberi memiliki memuat menampilkan mencari
  mendapatkan menjadi menimpa menit menurut menyimpan muncul mulai nama namun
  naik negara nilai nyaman obat orang pada pakai paling panduan panjang pasar
  pasti pekerja pelajar pemasukan pembayaran pembelian pemilik pendapatan
  pendidikan penuh per periode pertama perlu pesan pesanan pihak pinjam potong
  proses profil progres pukul puluh rumah rupiah saat saja sakit saldo sama
  sangat satu sudah sesuai setahun setiap siap simpan sisa siswa soal software
  status suami subtotal suka sumber tahun tanpa tanggal tapi target teman tetap
  tidak tim tinggi tujuan tugas tunai tunda ubah uang umum unduh untuk upah
  urus usaha utama wajib waktu wali warna
  belanja blokir sinyal terlambat total pengeluaran pemasukan transaksi
  anggaran kategori rekening tagihan cicilan utang piutang aset tujuan
  kontribusi kalender agenda tugas belanja dokumen kesehatan pendidikan
  laporan pengaturan dashboard ringkasan saldo masuk keluar transfer
  pengingat pengulangan lampiran berkas unggah unduh pratinjau simpan batal
  hapus sunting ubah tambah cari saring urut pilih kembali lanjut selesai
  berhasil gagal proses muat tunggu
`);

console.log(`Kamus: ${dictionary.size} kata.`);

/* ------------------------- baca teks antarmuka ---------------------------- */

/** Teks yang terlihat pengguna, plus nama variabel dan kelas CSS. */
function extractTokens(source) {
  const tokens = [];

  // Teks di antara tag.
  for (const match of source.matchAll(/>([^<>{}]{2,300})</g)) tokens.push(match[1]);

  // Atribut teks.
  for (const match of source.matchAll(
    /(?:title|hint|label|placeholder|description|aria-label|alt|confirmText|confirmDescription|submitLabel|message)=(?:"|{`)([^"'`{}]{2,300})/g,
  )) {
    tokens.push(match[1]);
  }

  // Identifier (nama variabel, fungsi, kelas) — untuk menangkap `totais`,
  // `pengeiuaran` yang dipakai sebagai nama.
  for (const match of source.matchAll(/\b([a-z][a-zA-Z0-9]{2,40})\b/g)) {
    tokens.push(match[1]);
  }

  return tokens;
}

/* ------------------------------- periksa ---------------------------------- */

/** Varian dengan l↔i yang mungkin merupakan bentuk benar. */
function repairCandidates(word) {
  const candidates = new Set();

  // l → i  (korupsi paling sering: pengeiuaran → pengeluaran)
  if (word.includes("i")) candidates.add(word.replace(/i/g, "l"));
  // i → l
  if (word.includes("l")) candidates.add(word.replace(/l/g, "i"));
  // ll → i
  candidates.add(word.replace(/ll/g, "i"));
  candidates.add(word.replace(/ii/g, "l"));

  return [...candidates].filter((candidate) => candidate !== word);
}

const hits = new Map();

for (const file of walk("src", [".tsx", ".ts", ".css"])) {
  const source = fs.readFileSync(file, "utf8");
  const relative = file.replace(/\\/g, "/");

  for (const token of extractTokens(source)) {
    const cleaned = token.replace(/[^A-Za-z\s-]/g, " ");
    for (const raw of cleaned.split(/[\s-]+/)) {
      const word = raw.trim();
      if (word.length < 3) continue;

      const lower = word.toLowerCase();
      // Kata yang sudah sah dilewati.
      if (dictionary.has(lower)) continue;
      // camelCase: cek tiap bagian.
      const parts = word.split(/(?=[A-Z])/).map((part) => part.toLowerCase());
      if (parts.length > 1 && parts.every((part) => part.length < 3 || dictionary.has(part))) {
        continue;
      }
      if (parts.length > 1) continue;

      for (const candidate of repairCandidates(lower)) {
        if (!dictionary.has(candidate)) continue;

        const key = `${lower} → ${candidate}`;
        if (!hits.has(key)) hits.set(key, new Set());
        hits.get(key).add(relative);
        break;
      }
    }
  }
}

/* -------------------------------- laporkan -------------------------------- */

if (hits.size === 0) {
  console.log("Tidak ada korupsi teks ditemukan.");
  process.exit(0);
}

console.log(`\n${hits.size} kecurigaan korupsi:\n`);

const sorted = [...hits.entries()].sort((a, b) => a[0].localeCompare(b[0]));
for (const [pair, files] of sorted) {
  console.log(`  ${pair}`);
  console.log(`      ${[...files].slice(0, 2).join(", ")}`);
}

console.log(`\nPeriksa satu per satu — sebagian bisa jadi istilah sah.`);

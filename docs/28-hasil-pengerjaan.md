# 28 — Hasil Pengerjaan Rencana

> Diperbarui: 2026-10-22
> Rujukan rencana: [27-rencana-rilis.md](27-rencana-rilis.md)

Dokumen ini mencatat **apa yang benar-benar dikerjakan**, bukan apa yang
direncanakan. Setiap klaim disertai angka atau perintah yang bisa diulang.

---

## 1. Ringkasan

| Fase | Status | Bukti |
| --- | --- | --- |
| 0.1 `SESSION_SECRET` | **Selesai** | 44 karakter acak di `.env.local` |
| 0.2 Deploy Vercel | **Belum** | butuh akun Vercel Anda |
| 1.1 Skala tipografi | **Selesai** | 200 nilai ad-hoc → **0** |
| 1.2 Ikon seragam | **Selesai** | 21 SVG inline → 1 (spinner, sengaja) |
| 1.3 Token semantik | **Selesai** | emphasis, scrim, surface |
| 1.4 Dark mode | **Selesai** | 16 halaman, 0 temuan kontras |
| 1.5 Mode kepadatan | **Selesai** | token `--row-height`, `--card-padding` |
| 1.6 Aksesibilitas | **Selesai** | axe-core WCAG 2.1 AA: 0 pelanggaran |
| 1.7 Sistem gerak | **Selesai** | 4 kurva, 4 durasi |
| 2.1 Angka bergulir, cincin, konfeti | **Selesai** | `AnimatedNumber`, `ProgressRing`, `Confetti` |
| 2.2 Sparkline | **Selesai** | tren saldo di kartu ringkasan |
| 2.3 Struk saat transaksi | **Selesai** | animasi `receipt-out` |
| 2.4 Heatmap kalender | **Selesai** | intensitas pengeluaran per hari |
| 2.5 Pintasan keyboard | **Selesai** | g+huruf, /, ?, ⌘K |
| 3.1 Unggah dokumen | **Selesai** | terbukti end-to-end |
| 3.2 Edit transaksi | **Selesai** | terbukti end-to-end + 8 test |
| 3.3 Urungkan (undo) | **Selesai** | toast 6 detik + 5 test |
| 3.4 Ekspor CSV | **Selesai** | 15 test + terbukti lewat aplikasi |
| 3.5 Simulator pelunasan utang | **Selesai** | 13 test + UI di halaman Utang |
| 3.6 Grafik tren | **Selesai** | batang kini tampil (bug tinggi persen) |
| 3.7 Ruang bersama | **Selesai** | buat/gabung/keluar + 16 test |
| 3.8 Transaksi berulang | **Selesai** | 32 test + terbukti end-to-end |
| 3.9 Lampiran foto struk | **Selesai** | 9 test + terbukti end-to-end |
| 3.10 Pisah tagihan | **Selesai** | 25 test + terbukti end-to-end |
| 3.11 Lupa PIN | **Selesai** | 8 test + terbukti end-to-end |
| 3.12 Proyeksi arus kas | **Selesai** | 27 test + tampil di Laporan |
| 5.1 Aplikasi Android | **Selesai** | Flutter + REST API; lihat [32](32-aplikasi-android.md) |
| 3.13 Korupsi teks halaman Tugas | **Selesai** | 7 kata + pemindai diperkuat |
| 6.1 Audit e2e semua fitur | **Selesai** | 33 pemeriksaan, 0 gagal |
| 4.1 Rate limit persisten | **Selesai** | Postgres; lihat [31](31-pembatas-laju-persisten.md) |
| 4.2 Uji konkurensi | **Selesai** | pola aman; lihat [29](29-uji-konkurensi.md) |
| 4.3 Uji aksesibilitas | **Selesai** | 46 pemeriksaan, 0 pelanggaran |
| 4.4 CI | **Selesai** | `.github/workflows/verify.yml` + repo git aktif |
| 4.5 Audit otorisasi | **Selesai** | 63 action diperiksa; 6 celah ditutup |
| E2 `workspaceId` opsional | **Terjaga** | 17 entitas, invariant test |
| E3 Dokumentasi auth ganda | **Selesai** | lihat [30](30-dua-jalur-auth.md) |
---

## 2. Angka sebelum dan sesudah

| Metrik | Sebelum | Sesudah |
| --- | --- | --- |
| Ukuran font ad-hoc | 200 | **0** |
| SVG inline di luar icon.tsx | 21 | **1** (spinner dua lapis) |
| `bg-white` (menyilaukan di mode gelap) | 5 | **0** |
| Korupsi teks & kelas | 22+ | **0** |
| Tautan rusak | tidak diketahui | **0** (67 rute diperiksa) |
| Test | 401 | **673** |
| Halaman diaudit | sebagian | **30 halaman × 3 ukuran** |
| Temuan kontras | tidak diukur | **0** di kedua tema |
| Pelanggaran aksesibilitas | tidak diukur | **0** di 46 pemeriksaan |

---

## 3. Bug nyata yang ditemukan audit ini

Ini bukan pekerjaan kosmetik. Audit menemukan bug yang membuat fitur **tidak
berfungsi**, dan semuanya sudah diperbaiki.

### 3.1 Korupsi teks yang merusak fitur

Sisa dari penggantian regex massal di sesi sebelumnya. Tidak terdeteksi karena
`tsc` dan test sama sekali tidak memeriksa teks antarmuka.

| Bug | Akibat | Berkas |
| --- | --- | --- |
| `params.buian` | **Filter bulan di halaman Anggaran tidak berfungsi** | `anggaran/page.tsx` |
| `/keiuarga/...` | **Tautan navigasi 404** | `anggaran/page.tsx` |
| `value="monthiy"` | Nilai form tidak dikenal server | `tugas/page.tsx` |
| `inllne-flex`, `rounded-fuii` | Kelas tidak ada → gaya hilang | beberapa |
| `border-llne-*`, `divide-llne` | Garis tidak tampil | beberapa |
| `font-semiboid`, `font-biack` | Ketebalan huruf tidak berlaku | beberapa |
| `capitaiize`, `items-basellne` | Kelas tidak ada | beberapa |
| `iewat`, `beium`, `seiesai`, `iaporan`, `hiiang` | Salah ketik terlihat pengguna | beberapa |
| `bg-white` di mode gelap | Input putih menyilaukan | 5 tempat |

### 3.2 Bug aksesibilitas

Ditemukan oleh axe-core (WCAG 2.1 AA), tidak terlihat oleh test biasa:

| Bug | Akibat |
| --- | --- |
| `aria-label` berbeda dari teks terlihat | Pembaca layar membaca nama yang tidak cocok dengan yang tertulis (42 elemen) |
| `<select>` tanpa nama aksesibel | Tidak bisa dipakai pengguna pembaca layar (2 elemen) |
| `<input type="file">` tanpa label | Tidak diketahui fungsinya (12 elemen) |
| `text-tomato-deep` / `text-paper` di latar gelap | Kontras gagal (21 elemen) |

### 3.3 Celah otorisasi pada server action

Ditemukan saat audit lanjutan. Ini yang paling serius: beberapa server action
**tidak memeriksa sesi sama sekali**, sehingga bisa dipanggil tanpa login.

| Action | Akibat sebelum diperbaiki |
| --- | --- |
| `resetDemoData` | **Siapa pun tanpa login bisa menghapus seluruh data aplikasi** |
| `updateHousehold` | Nama keluarga bisa diubah tanpa masuk |
| `createMember` | Anggota bisa ditambah tanpa masuk |
| `updateMember` | Nama dan peran anggota bisa diubah tanpa masuk |
| `toggleMemberActive` | Anggota bisa dinonaktifkan tanpa masuk |
| `deleteMember` | Anggota bisa dihapus tanpa masuk |

**Kenapa lolos selama ini:** `members` dan `household` sengaja tidak di-scope
per ruang (data keluarga berlaku lintas ruang), sehingga tidak ikut terjaring
pola `findScoped()` yang dipakai aksi lain. Tidak ada test yang mencoba
memanggilnya tanpa sesi.

**Perbaikan:** `requireViewer()` di kelima aksi anggota dan rumah tangga;
`resetDemoData` ditambah pemeriksaan peran — hanya pemilik akun.

### 3.4 Kebocoran lintas ruang pada halaman detail

| Bug | Akibat |
| --- | --- |
| `goalById(id)` tanpa `workspaceId` | Tujuan ruang lain bisa dibuka dengan menebak id |
| `contributionsFor(goalId)` tanpa `workspaceId` | Riwayat setoran ruang lain ikut terbaca |

Halaman `/keluarga/rencana/[id]` menerima `id` dari URL. Layout sudah memeriksa
sesi, jadi bukan akses tanpa login — tetapi pengguna yang login di satu ruang
bisa membaca data ruang lain.

### 3.5 Open redirect

| Bug | Akibat |
| --- | --- |
| `pilih-profil` memakai `next.startsWith("/")` | `//evil.example` lolos → pengguna dilempar ke situs penipu setelah login |

`safeNextPath()` yang benar sudah ada di `actions.ts`, tetapi halaman memakai
pemeriksaan sendiri yang lebih lemah. Sekarang dipindah ke `@/lib/safe-path`
dan dipakai bersama oleh halaman **dan** action.

### 3.6 Kode pesanan bisa diprediksi

| Bug | Akibat |
| --- | --- |
| `randomCode()` memakai `Math.random()` | Kode pesanan bisa ditebak → email pembeli lain terbaca |

Halaman `/pesanan/[code]` menampilkan email pembeli, dan kode pesanan adalah
satu-satunya proteksinya. `Math.random()` tidak kriptografis. Sekarang memakai
`crypto.getRandomValues()` dengan penolakan sampel agar sebarannya rata.

### 3.7 Validasi tanggal dan angka yang tidak konsisten

Ditemukan saat menguji server action dengan masukan rusak — hal yang tidak
pernah dicoba test yang ada, karena test selalu mengirim isian yang benar.

| Bug | Akibat |
| --- | --- |
| `safeDueDate("2026-01", 0)` → `"2026-01-00"` | Tanggal tidak bisa diurai `Date.parse()`, umur tagihan jadi `NaN` |
| `setBudget` menerima `NaN` | Total anggaran jadi `NaN` di seluruh halaman |
| `setBudget` menerima bulan `2026-13` | Anggaran tersimpan tapi tidak pernah muncul |
| `createChore` menyimpan `points` tanpa validasi | `NaN` merusak papan poin |
| `createChore` melakukan cast buta `frequency as ...` | Nilai apa pun tersimpan sebagai frekuensi |
| `createChore` menerima `2026-02-30` | Tanggal mustahil tersimpan |
| 5 dari 7 tempat memakai regex tanggal saja | `2026-02-30` lolos sebagai tanggal sah |

**Akar masalahnya:** `isRealDate()` sudah ada dan benar, tetapi hanya dipakai
di 2 dari 7 tempat. Sisanya memakai regex bentuk saja.

**Perbaikan:** bukan menambah pemeriksaan satu per satu — itu akan terlewat
lagi — tetapi membuat skema zod `zRealDate` yang memvalidasi bentuk **dan**
keberadaan tanggalnya. Setiap field yang memakainya otomatis terlindungi.

Untuk angka, `NaN < 0` bernilai `false`, sehingga pemeriksaan
`if (amount < 0)` tidak menangkap `NaN`. Ditambahkan `Number.isFinite()`.

### 3.8 Grafik tren kosong

Grafik "Tren 12 bulan" di halaman Laporan menampilkan label bulan tetapi
**tanpa batang sama sekali** — hanya garis datar di dasar.

**Sebabnya:** batang memakai tinggi persen (`height: 42%`), tetapi induk
kolomnya tidak punya tinggi tetap. Persentase dari tinggi yang belum ditentukan
menghasilkan nol, jadi semua batang tingginya nol meski elemennya ada.

**Perbaikannya:** kolom diberi `h-full` agar tingginya mengikuti wadah `h-40`,
sehingga persentase punya acuan.

**Kenapa lolos:** `tsc`, `lint`, dan seluruh test tidak memeriksa hasil render
visual. Yang menemukannya adalah pemeriksaan tangkapan layar. Dashboard punya
grafik serupa (`cashflow-chart.tsx`) yang **sudah** memakai `h-full` — jadi bug
ini hanya ada di satu tempat, bukan pola menyeluruh.

### 3.9 Rujukan dari aturan berulang tidak diperiksa

Saat menambahkan transaksi berulang, aksi hapus/arsip yang sudah ada tidak
mengetahui koleksi baru. Tiga bug:

| Bug | Akibat |
| --- | --- |
| `archiveAccount` tidak memeriksa aturan berulang | Akun terarsip masih dipakai aturan → transaksi tanpa nama akun, tidak masuk saldo |
| `archiveCategory` sama sekali tidak memeriksa rujukan | Kategori terarsip masih dipakai → laporan per kategori tidak lengkap |
| `applyDueRules` tidak menyaring rujukan hilang | Data lama yang tidak konsisten menghasilkan transaksi rusak |

**Pelajaran:** menambah koleksi baru berarti memeriksa **semua** tempat yang
sudah ada dan mungkin merujuknya. Yang menemukan ini adalah test yang sengaja
mencoba menghapus entitas yang masih dirujuk — bukan test fitur baru itu
sendiri.

### 3.10 Proyeksi menampilkan pemasukan nol

Proyeksi arus kas hanya membaca aturan berulang. Pengguna yang mencatat gaji
sebagai transaksi biasa — mayoritas — melihat pemasukan Rp0 di semua bulan,
sehingga proyeksi menyimpulkan uangnya akan habis.

**Perbaikannya:** bila tidak ada aturan pemasukan berulang, pakai rata-rata
historis tiga bulan, dan beri tahu bahwa itu perkiraan.

**Pelajaran:** fitur baru yang membaca data harus bertanya "bagaimana kalau
datanya tidak dalam bentuk yang saya harapkan?" — bukan hanya "apakah datanya
ada?".

### 3.11 Aturan berulang menunjuk akun terarsip

Urutan yang bisa terjadi: aturan dimatikan → akunnya diarsipkan → aturan
diaktifkan kembali. Hasilnya aturan menunjuk akun terarsip, dan transaksi yang
dibuatnya tidak masuk hitungan saldo mana pun.

**Perbaikan dua lapis:**

1. `toggleRecurringRule` menolak pengaktifan dengan pesan yang menjelaskan.
2. `applyDueRules` menyaring akun dan kategori terarsip — sabuk pengaman bila
   data sudah terlanjur tidak konsisten.

Dua lapis, bukan satu, karena lapis pertama bergantung pada data yang rapi;
lapis kedua tetap bekerja meski data dari versi lama tidak rapi.

### 3.12 Kontras teks proyeksi

Teks nominal pemasukan di proyeksi memakai `text-mint-deep` (#3f7d62) — hanya
3.1:1 di latar gelap, di bawah ambang WCAG AA 4.5:1.

**Pelajaran:** memilih warna dari palet tanpa memeriksa kontrasnya mudah
terlewat, karena di mode terang warnanya terlihat baik. Yang menangkapnya
adalah audit aksesibilitas otomatis — bukan pemeriksaan manual.

Sekarang memakai `text-positive` yang punya nilai terpisah untuk kedua mode.

### 3.13 Halaman Anggaran membaca data lintas ruang

Audit e2e menyeluruh menemukan halaman Anggaran memanggil query **tanpa
`viewer`**:

```ts
const rows = budgetRows(month);            // semua ruang
const totals = budgetTotals(month);        // semua ruang
const trend = categoryTrend(6, month);     // semua ruang
const expenseCategories = listCategories("expense");
```

**Tiga akibat sekaligus:**

| Masalah | Akibat |
| --- | --- |
| Tanpa `viewer` | Anggaran dari SEMUA ruang bercampur; angkanya salah tanpa terlihat salah |
| `listCategories("expense")` | `"expense"` dikirim sebagai **workspaceId**, bukan jenis — dropdown kosong |
| Dropdown kosong + `required` | Formulir anggaran **tidak bisa disimpan sama sekali** |

Bug ketiga adalah yang paling merusak: fitur inti halaman itu tidak berfungsi,
dan tidak ada pesan galat — tombol hanya tidak melakukan apa pun karena
validasi HTML menahan submit.

**Bukti perbaikan** (`scripts/prove-budget-scope.cjs`): anggaran Rp987.654.321
disisipkan ke ruang pribadi, lalu halaman keluarga dibuka — angka itu tidak
muncul, dan dropdown berisi 15 opsi.

### 3.14 `min={1}` + `step` membuat nominal bulat ditolak browser

Tiga field memakai `min={1}` bersama `step` lebih dari 1:

```html
<input name="amount" type="number" min={1} step={1000} placeholder="395000" />
```

Aturan validasi HTML: nilai sah = `min + n × step`. Dengan `min=1` dan
`step=1000`, nilai sahnya 1, 1001, 2001, … — sehingga **395000 dari placeholder
sendiri ditolak**. Pesan browsernya: "The two nearest valid values are 174001
and 175001."

Diperbaiki di tiga tempat: tagihan, utang (pokok), dan tujuan.

### 3.15 Pembatalan transaksi tidak bisa diurungkan lewat menu klik-kanan

Tombol "Batalkan" di baris sudah punya `undoAction`, tetapi item yang sama di
menu klik-kanan tidak. Padahal menu itulah yang dipakai untuk aksi berisiko —
justru di situ kesalahan klik paling mahal.

`ContextMenuItem` sekarang mendukung `undoAction`, dan item "Batalkan transaksi"
memakainya.

### 3.16 Kartu tidak bisa menyusut — luapan horizontal 156px

Di layar 390px, halaman `/keluarga` melebar sampai 546px. Penyebabnya: sebagai
anak grid, lebar minimum sebuah elemen secara default adalah `min-content`,
bukan nol. Kartu berisi teks `truncate` (yang memakai `white-space: nowrap`)
karena itu menolak menyusut.

Diperbaiki dengan `min-w-0` pada komponen `Card` — satu perubahan yang berlaku
untuk seluruh aplikasi.

### 3.17 Progressbar tanpa nama dan kontras sel kalender

Dua pelanggaran aksesibilitas baru muncul setelah data uji bertambah:

| Pelanggaran | Sebab |
| --- | --- |
| `aria-progressbar-name` | `label={row.category?.name}` kosong untuk pengeluaran tanpa kategori |
| `color-contrast` | Angka hari di sel heatmap memakai `text-muted` di latar yang menggelap |

Diperbaiki: `ProgressBar` selalu punya nama (cadangan: persentasenya), dan angka
hari memakai `text-ink`.

### 3.18 Pemindai korupsi teks sendiri punya bug

Enam korupsi masih bersarang di halaman Tugas rumah: `coiumn`, `Muiai`,
`Kembaii`, `Uiangi`, `dibataikan`, `opsionai`, `Sekaii`. Tombol berbunyi
"Muiai" dan "Kembaii" — terlihat jelas oleh pengguna, tetapi lolos dari
pemindai otomatis.

**Dua bug di pemindai:**

| Bug | Akibat |
| --- | --- |
| Mengganti **semua** `i`↔`l` sekaligus | `Muiai` → `mulal` (bukan kata), seharusnya `mulai` |
| Kamus hanya berisi kata Indonesia | `coiumn` tidak punya pembanding `column` |

**Perbaikannya:** coba setiap posisi satu per satu, dan tambahkan istilah
Inggris yang dipakai sebagai identifier.

**Diverifikasi dengan uji sengaja** — menyisipkan `coiumn` lalu memastikan
pemindai menangkapnya, kemudian mengembalikannya:

```
=== dengan korupsi sengaja ===
1 kecurigaan korupsi:
  coiumn → column
=== setelah dikembalikan ===
Tidak ada korupsi teks ditemukan.
```

**Pelajaran terpenting dari seluruh proyek ini:** alat audit juga bisa salah.
Ketika audit melaporkan "bersih", yang terbukti hanyalah "bersih menurut alat
itu". Alat perlu diuji dengan cara menyuntikkan kesalahan yang diketahui —
bukan hanya dijalankan.

### 3.19 Bug dark mode

| Bug | Akibat |
| --- | --- |
| `bg-ink` jadi putih di mode gelap | Kartu TOTAL SALDO & tombol utama menyilaukan |
| `text-paper` tertinggal | Teks gelap di latar gelap, **kontras 1.31:1** |
| `bg-ink/40` untuk tirai dialog | Tirai jadi kabut putih |

Perbaikannya bukan menambal satu per satu, tetapi menambah token yang memang
tidak boleh terbalik: `--color-emphasis`, `--color-on-emphasis`,
`--color-scrim`.

---

## 4. Yang dibangun

### 4.1 Fondasi visual

**Skala tipografi** — 9 langkah di `@theme`, satu-satunya ukuran yang dipakai:

```
2xs 10px · xs 11px · sm 12px · base 13px · md 15px
lg 17px · xl 22px · 2xl 28px · 3xl 36px
```

**Token semantik** — komponen memakai peran (`--surface-raised`,
`--text-secondary`), bukan warna mentah. Ini yang membuat tema mungkin tanpa
menyentuh setiap komponen.

**Dark mode "Malam di Dapur"** — kertas gelap kecoklatan, bukan hitam pekat.
Dua titik cahaya lampu hangat di latar. Tiga pilihan: terang, gelap, ikut
sistem.

**Anti-kedip** — `ThemeScript` menempelkan kelas `dark` sebelum paint. Tanpa
ini, pengguna mode gelap melihat kilatan putih setiap memuat halaman.

**Mode kepadatan** — nyaman (baris 44px) atau padat (34px). Berlaku lewat token,
bukan menyentuh setiap komponen.

**Sistem gerak** — 4 kurva, 4 durasi, satu tempat. Semua dimatikan di bawah
`prefers-reduced-motion`.

### 4.2 Detail yang menjelaskan

| Detail | Yang dijelaskan |
| --- | --- |
| **Angka bergulir** | "nilai ini baru berubah, dan seberapa" |
| **Struk tercetak** | dialog menyusut & meluncur saat transaksi tersimpan |
| **Cincin progres** | mengisi dari 0, membuat "seberapa jauh" terasa |
| **Konfeti tujuan** | sekali saja saat 100%, warna meja dapur |
| **Sparkline** | tren 30 hari, bukan hanya angka sesaat |
| **Toast + Urungkan** | aksi bisa dibatalkan |

### 4.3 Sunting transaksi

Sebelumnya satu-satunya cara memperbaiki salah catat adalah **membatalkan lalu
mencatat ulang** — meninggalkan dua baris di riwayat untuk satu kejadian.

Sekarang ada tombol **Sunting** di setiap baris (hanya untuk transaksi yang
belum dibatalkan). Dialog terisi nilai lama, jadi pengguna hanya mengubah yang
salah.

Aturan yang dijaga:

- transaksi yang sudah dibatalkan **tidak bisa** disunting (jejak audit)
- validasi sama ketatnya dengan pencatatan baru
- pencatat asli (`recordedByProfileId`) **tidak berubah** meski disunting orang
  lain — supaya tetap jelas siapa yang pertama mencatat

**Bukti:**

```
3. Tombol Sunting tersedia            : 1
4. Dialog terisi nilai lama           : 77000 | SUNTING-179262019626
6. Deskripsi baru tampil              : ya
7. Nominal baru tampil                : ya
8. Tersimpan di database              : 1 baris
     SUNTING-1792620196266-DIUBAH = 123000
SUNTING TRANSAKSI OK
```

### 4.4 Urungkan (undo)

Pengguna sering menekan tombol pada baris yang salah. Sebelumnya membatalkan
transaksi bersifat permanen — salah klik memaksa mencatat ulang dan
meninggalkan jejak yang membingungkan.

Sekarang toast setelah pembatalan menawarkan **Urungkan** selama 6 detik. Aksi
`restoreTransaction()` hanya menghapus `voidedAt`; pencatat asli dan jejak audit
tidak berubah.

**Bukti:** 5 test — mengembalikan transaksi, menolak yang tidak dibatalkan,
menolak ruang lain, menolak id tidak ada, mempertahankan pencatat asli.

### 4.5 Ekspor CSV

`GET /api/ekspor/transaksi?bulan=&tipe=&q=` — mengikuti filter yang sedang
aktif, jadi yang diunduh sama dengan yang terlihat.

Tiga hal yang dijaga:

| Hal | Alasan |
| --- | --- |
| Sesi wajib | Tanpa ini siapa pun bisa mengunduh data keuangan |
| Saring ruang + visibilitas | Transaksi "Pribadi" profil lain tidak ikut |
| Netralkan rumus | Deskripsi `=HYPERLINK(...)` bisa jadi serangan saat dibuka di Excel |

**Bukti:**

```
2. Tombol Ekspor CSV tersedia             : ya
3. Status                                 : 200
4. Content-Type                           : text/csv; charset=utf-8
6. BOM UTF-8                              : ada
7. Baris (header + data)                  : 11
10. Jumlah kolom konsisten                : ya (10)
AMAN — sesi wajib
```

### 4.6 Heatmap kalender

Kalender bulanan sekarang memberi lapisan warna sesuai besarnya pengeluaran
tiap hari. Angka saja tidak memberi tahu hari mana yang mahal; pola warna
memberi tahu dalam sekejap.

Lima tingkat, dihitung relatif terhadap pengeluaran terbesar bulan itu —
bukan ambang nominal tetap, karena Rp500.000 bisa besar di satu keluarga dan
kecil di keluarga lain.

Satu masalah kontras ditemukan saat pemeriksaan visual: nominal di atas sel
paling gelap hanya 3.90:1. Ditambahkan token `--color-heat-text` dengan nilai
berbeda per tema.

### 4.7 Pintasan keyboard

| Pintasan | Fungsi |
| --- | --- |
| `⌘K` / `Ctrl+K` | Buka palette |
| `g` lalu `d`/`t`/`a`/`r`/`p`/… | Lompat ke halaman |
| `/` | Fokus ke kolom cari |
| `?` | Buka daftar pintasan |
| `↑` `↓` `↵` | Navigasi di palette |

Dua ketukan untuk navigasi, bukan satu, karena satu huruf akan bentrok dengan
pengetikan biasa. Pintasan diabaikan saat fokus di kolom isian.

**Bukti:** `g t` → Transaksi, `g a` → Anggaran, `g r` → Rencana, `g p` →
Pengaturan semuanya berhasil; mengetik "gajian" di kolom cari tidak terlempar
ke halaman lain.

### 4.8 Simulator pelunasan utang

Daftar utang memberi tahu *berapa* sisa utang, tetapi tidak menjawab pertanyaan
yang sebenarnya ingin diketahui: **"kalau saya bayar sekian per bulan, lunas
kapan?"**

Simulator di halaman Utang menghitungnya langsung di browser — hasil berubah
saat angka digeser, tanpa menunggu jaringan.

| Isian | Hasil |
| --- | --- |
| Bayar per bulan | Lunas dalam berapa bulan |
| Tambahan (opsional) | Berapa bulan lebih cepat + bunga yang dihemat |

Bunga dihitung **per bulan dari sisa pokok**, cara bank menghitung kredit
konsumtif di Indonesia. Bukan dari pokok awal.

**Kasus batas yang dijelaskan, bukan dibiarkan menghasilkan angka menyesatkan:**

- Utang sudah lunas → "Utang ini sudah lunas."
- Bayaran nol → "Isi kemampuan membayar per bulan."
- **Bayaran tidak menutup bunga** → menyebutkan angka minimal yang perlu dibayar

Kasus ketiga yang paling penting: tanpa penjelasan, pengguna hanya melihat
simulasi yang tidak berakhir tanpa tahu sebabnya.

**Bukti:** 13 test — tanpa bunga, dengan bunga, sisa pokok selalu menurun,
kasus batas, dan perbandingan dua skenario.

### 4.9 Ruang bersama

Ruang bersama memungkinkan dua profil bekerja di satu data — mis. suami dan
istri — dengan setiap transaksi tetap tercatat siapa yang mencatatnya.

| Aksi | Aturan yang dijaga |
| --- | --- |
| Buat | Maksimal 2 per profil, nama tidak boleh ganda |
| Gabung | Kode harus cocok, tidak bisa gabung ruang sendiri, tidak bisa dua kali |
| Keluar | Pemilik tidak bisa keluar; keluar dari ruang aktif mengembalikan sesi ke ruang pribadi |

**Batas ditegakkan di server, bukan hanya UI.** Menyembunyikan tombol tidak
cukup: permintaan yang dibuat tangan tetap harus ditolak.

**Bukti:**

```
2. Bagian Ruang bersama                   : ada
3. Kuota awal                             : 1 dari 2
4. Ruang baru muncul setelah reload       : ya
5. Kode undangan                          : 5U8PRD
6. Kuota setelah membuat                  : 2 dari 2 ruang bersama terpakai
7. Tombol nonaktif saat kuota penuh       : ya
KELOLA RUANG BERSAMA OK
```

**Pelajaran dari percobaan pertama:** skrip ini sempat gagal berulang kali
dengan tombol nonaktif. Penyebabnya bukan bug aplikasi — **skrip debug saya
sendiri** ikut membuat ruang uji di setiap percobaan, sehingga kuota selalu
penuh sebelum skrip sempat berjalan. Skrip sekarang mengukur kuota awal dan
membersihkan dirinya sendiri.

### 4.10 Transaksi berulang otomatis

Gaji, langganan, dan cicilan terjadi setiap bulan. Sebelumnya pengguna harus
mencatatnya sendiri setiap kali.

**Keputusan desain yang penting:** aturan berulang menyimpan **cetakan**, bukan
transaksi masa depan. Bila 12 transaksi dibuat di muka, saldo hari ini akan
terlihat minus padahal uangnya belum keluar — laporan jadi menyesatkan.

| Aspek | Cara |
| --- | --- |
| Kapan dibuat | Saat jatuh tempo, atas konfirmasi pengguna |
| Idempoten | `nextAt` dimajukan setiap kali transaksi dibuat |
| Tanggal 31 di bulan pendek | Dijepit ke akhir bulan (31 Jan → 28/29 Feb) |
| Aturan lama tidak aktif | Dibatasi 24 periode tertinggal, maks 20 per pemanggilan |
| Menghapus aturan | Transaksi lama **tidak** ikut terhapus |

**Kenapa dikonfirmasi, bukan otomatis diam-diam:** transaksi keuangan sebaiknya
disetujui. Nominal yang tiba-tiba muncul di saldo lebih membingungkan daripada
satu klik tambahan.

**Bukti:**

```
4. Banner berulang muncul                 : ya
5. Banner hilang setelah dicatat          : ya
6. Transaksi tercipta                     : 1
     2026-10-21  Rp88000
7. nextAt setelah dibuat                  : 2026-11-21
8. Jumlah setelah muat ulang              : 1
TRANSAKSI BERULANG OK — idempoten, jadwal maju
```

Baris 7 dan 8 adalah intinya: jadwal maju satu bulan, dan memuat ulang halaman
tidak membuat transaksi kedua.

### 4.11 Lampiran foto struk

Foto struk dilampirkan langsung dari baris transaksi. Endpoint unggah
digeneralisasi agar melayani dokumen **dan** transaksi, dengan pemeriksaan
kepemilikan yang sama.

| Aspek | Cara |
| --- | --- |
| Unggah | Presigned URL — berkas tidak melewati server |
| Jenis | JPG, PNG, WEBP, PDF |
| Ukuran | Maksimal 10 MB (diperiksa klien **dan** server) |
| Kunci | Wajib diawali `workspaceId/`, `..` ditolak |
| Ganti lampiran | Berkas lama dihapus, tidak ada objek yatim |
| Transaksi dibatalkan | Lampiran **tetap** tersimpan sebagai bukti |

**Bukti:**

```
2. Tombol Struk tersedia                  : 10
4. Nama berkas tampil setelah reload      : ya
5. Transaksi dengan lampiran              : 1
     ws-family/t-10.png  (struk-uji-1792663133350.png)
6. Tautan unduh                           : 200 ok
7. Unduh dari bucket                      : ok
LAMPIRAN FOTO TRANSAKSI OK
```

### 4.12 Pisah tagihan antar anggota

Tagihan rumah dibayar satu orang tetapi dinikmati semua. Tanpa pembagian,
catatan hanya menunjukkan siapa yang **membayar**, bukan siapa yang
**menanggung** — pembagian beban terasa tidak adil tanpa ada yang bisa
membuktikannya.

| Cara | Cocok untuk |
| --- | --- |
| Rata | Tagihan rumah yang dinikmati bersama |
| Bobot | Pembagian yang disepakati, mis. 60/40 |
| Nominal tetap | Nominal tertentu per orang |

**Aturan yang dijaga: total bagian harus selalu sama dengan jumlah tagihan.**
Pembulatan naif (33.333 × 3) kehilangan satu rupiah, dan selisih itu akan
muncul di laporan tanpa penjelasan. Sisa pembulatan dibagikan, bukan dibuang.

**Bukti:**

```
6. Bagian                                 : 500001 + 500000
7. Total bagian                           : 1000001 (tagihan 1000001)
8. Total cocok                            : ya
PEMBAGIAN TAGIHAN OK
```

Nominal bagian dihitung di **server**, tidak diterima dari klien — angka dari
browser bisa dimanipulasi.

### 4.13 Lupa PIN

PIN melindungi privasi antar anggota keluarga, bukan rahasia dari pemilik akun.
Tanpa jalur pemulihan, pemilik akun yang lupa PIN kehilangan akses ke datanya
sendiri secara permanen.

Tetapi jalur pemulihan adalah **pintu masuk alternatif**. Bila tidak dijaga
ketat, ia menjadi cara melewati PIN:

| Penjagaan | Alasan |
| --- | --- |
| Wajib sudah masuk sebagai pemilik akun | Bukan jalan masuk tanpa login |
| Wajib kata sandi akun | Bukan sekadar klik |
| Profil harus milik akun itu | Tidak bisa memulihkan profil orang lain |
| Percobaan dibatasi (`LOGIN_RULE`) | Tidak bisa jadi cara menebak kata sandi |
| PIN lama **tidak** diminta | Justru itu yang terlupakan |

**Bukti:**

```
4. Kata sandi salah ditolak               : ya
5. Kata sandi benar diterima              : ya
7. Masuk dengan PIN baru                  : ya
PEMULIHAN PIN OK
```

**Catatan proses:** skrip bukti ini mengubah PIN sungguhan. Setelah dijalankan,
PIN demo **harus** dikembalikan dengan `node scripts/restore-demo-pin.cjs` —
kalau tidak, dokumentasi dan skrip lain yang memakai 1234 akan gagal.

### 4.14 Proyeksi arus kas

Laporan menjawab "berapa yang sudah terjadi". Yang tidak terjawab: "apakah bulan
depan saya cukup?" — pertanyaan yang sebenarnya paling menentukan keputusan.

**Sumber angka** — hanya yang sudah diketahui, bukan tebakan:

1. Transaksi berulang (gaji, langganan, cicilan)
2. Tagihan aktif dengan jadwalnya
3. Rata-rata pengeluaran harian dari tiga bulan terakhir yang sudah lewat

**Yang sengaja tidak dilakukan:**

- Tidak memakai model statistik. Dengan data sebulan-dua, itu hanya menambah
  keyakinan palsu.
- Tidak memprediksi pemasukan tak tetap (bonus, penjualan).
- Tidak menampilkan satu angka tunggal tanpa asal-usulnya.

### Bug yang ditemukan saat mengerjakannya

Proyeksi pertama menampilkan **pemasukan Rp0** di semua bulan, padahal pengguna
punya pemasukan nyata. Sebabnya: proyeksi hanya membaca aturan berulang,
sedangkan pengguna mencatat gaji sebagai transaksi biasa.

Angka nol yang menyesatkan lebih buruk daripada tidak ada proyeksi — pengguna
akan menyimpulkan uangnya akan habis. Perbaikannya: bila tidak ada aturan
pemasukan berulang, pakai rata-rata historis, dan **beri tahu** bahwa itu
perkiraan.

**Bukti (setelah perbaikan):**

```
Oktober 2026   masuk Rp14.500.000  keluar Rp2.710.000  bersih Rp11.790.000  → Rp93.210.000
November 2026  masuk Rp14.500.000  keluar Rp3.745.000  bersih Rp10.755.000  → Rp103.965.000
...
Maret 2027     masuk Rp14.500.000  keluar Rp3.745.000  bersih Rp10.755.000  → Rp146.985.000
```

### 4.15 Unggah dokumen

Rantai lengkap, terbukti bekerja:

```
tombol → POST /api/dokumen (sesi + kepemilikan diperiksa)
       → presigned URL → unggah LANGSUNG ke bucket (dengan progres)
       → server action mencatat kunci objek
       → berkas bisa diunduh lewat /api/dokumen?key=...
```

**Keamanan berlapis:**

- kunci wajib diawali `workspaceId/`
- `..` ditolak
- jenis berkas dibatasi: PDF, JPG, PNG, WEBP
- ukuran maksimal 10 MB (diperiksa di klien **dan** server)
- menghapus dokumen ikut menghapus berkasnya (tidak ada objek yatim)

**Bukti:**

```
3. Tombol lampiran tersedia           : 6
4. Berkas dipilih                     : ok
6. Nama berkas tampil setelah reload  : ya
7. Tombol lepas tersedia              : 1
8. Tautan unduh dari server           : 200 ok
9. Lampiran dilepas                   : ok
UNGGAH DOKUMEN OK
```

---

## 5. Perangkat audit yang dibuat

Skrip ini bisa dijalankan ulang kapan saja. Semuanya ada di `scripts/`.

| Skrip | Fungsi |
| --- | --- |
| `validate-classes.cjs` | Setiap kelas CSS yang dipakai harus ada di hasil build |
| `validate-links.cjs` | Setiap `href="/..."` harus menunjuk rute yang ada |
| `scan-corruption.cjs` | Pola korupsi teks yang diketahui |
| `scan-l-i.cjs` | Korupsi `l`↔`i` dan `a`↔`u` secara presisi |
| `audit-theme.cjs` | Kontras & latar terang di kedua tema |
| `audit-all-pages.cjs` | 30 halaman × 4 ukuran layar |
| `audit-a11y.cjs` | axe-core WCAG 2.1 AA, kedua tema |
| `prove-upload.cjs` | Unggah dokumen end-to-end |
| `prove-edit-transaction.cjs` | Sunting transaksi end-to-end |
| `prove-density.cjs` | Mode kepadatan benar-benar mengubah tata letak |
| `prove-export.cjs` | Ekspor CSV end-to-end |
| `check-export-auth.cjs` | Ekspor menolak permintaan tanpa sesi |
| `prove-shortcuts.cjs` | Pintasan keyboard & tidak mengganggu pengetikan |
| `test-concurrency.cjs` | Tulis bersamaan ke Postgres |
| `malformed-input.test.ts` | Server action dengan masukan rusak |
| `format-edge.test.ts` | Tanggal kabisat, pergantian tahun, nominal besar |
| `prove-workspace.cjs` | Kelola ruang bersama end-to-end |
| `prove-recurring.cjs` + `check-recurring.cjs` | Transaksi berulang end-to-end |
| `prove-recurring-ui.cjs` | Formulir aturan berulang lewat UI |
| `prove-transaction-photo.cjs` | Lampiran foto struk end-to-end |
| `prove-bill-split.cjs` | Pisah tagihan end-to-end |
| `prove-pin-recovery.cjs` | Lupa PIN end-to-end |
| `restore-demo-pin.cjs` | Mengembalikan PIN demo ke 1234 |
| `recurring-references.test.ts` | Rujukan aturan berulang dijaga |
| `clean-test-workspaces.cjs` | Membersihkan ruang uji |
| `clean-test-data.cjs` | Membersihkan data uji dari database |
| `order-code.test.ts` | Kode pesanan: acak kriptografis, sebaran rata |
| `safe-path.test.ts` | Sanitasi 
ext — open redirect |
| `goal-scoping.test.ts` | Isolasi ruang pada halaman detail |
| `member-authorization.test.ts` | Otorisasi aksi anggota |
| `check-db.cjs` | Koneksi Postgres |
| `check-storage.cjs` | Object Storage langsung |
| `inspect-neon.cjs` | Isi database |

**Kenapa ini penting:** tiga bug terbesar di bagian 3 tidak terdeteksi oleh
`tsc`, `lint`, maupun 401 test. Yang menemukannya adalah validasi kelas
terhadap CSS hasil build dan pemindaian teks. Tanpa perangkat ini, bug yang
sama akan muncul lagi.

---

## 6. Hasil audit akhir

```
Semua halaman termuat bersih di 4 ukuran layar.

Mode light — 16 halaman: 0 temuan
Mode dark  — 16 halaman: 0 temuan

Aksesibilitas (axe-core, WCAG 2.1 AA):
  46 pemeriksaan (23 halaman × 2 tema): 0 pelanggaran serius

Konkurensi Postgres:
  tulis baris berbeda bersamaan : 20/20 tersimpan
  tulis baris sama bersamaan    : 1 baris, tanpa duplikat
  pola hapus-lalu-tulis         : tidak dipakai aplikasi

text-[...] ad-hoc : 0
bg-white          : 0
Tautan rusak      : 0  (67 rute)

tsc    : bersih
lint   : bersih
test   : 673 lulus (38 berkas)
build  : ✓ Compiled successfully
```

---

## 6b. Putaran terakhir — fitur baru & bug yang ditemukan

| Fitur | Test | Bukti |
| --- | --- | --- |
| Transaksi berulang otomatis | 32 | banner dashboard → transaksi → idempoten |
| Lampiran foto struk | 9 | unggah → bucket → unduh |
| Pisah tagihan antar anggota | 25 | Rp1.000.001 → 500.001 + 500.000 |
| Lupa PIN | 8 | kata sandi salah ditolak, benar diterima |
| Proyeksi arus kas 6 bulan | 27 | tampil di Laporan |
| Rate limit persisten | 8 | blokir bertahan setelah restart |

**Bug yang ditemukan saat mengerjakan fitur-fitur itu** — semuanya tidak
terdeteksi `tsc`, `lint`, maupun test yang sudah ada:

| Bug | Dampak |
| --- | --- |
| Grafik tren kosong | Batang tidak tampil (tinggi persen tanpa acuan) |
| Rujukan aturan berulang tidak diperiksa | Akun/kategori terarsip masih dipakai |
| Aturan aktif kembali setelah akun diarsipkan | Transaksi tanpa akun sah |
| Proyeksi menampilkan pemasukan Rp0 | Menyimpulkan uang akan habis |
| Kontras `text-mint-deep` 3.1:1 | Di bawah ambang WCAG AA |
| `formData.get` untuk kotak centang | Pembagian hanya untuk satu anggota |
| Test flaky `order-code` (0.16%) | Kegagalan acak membuat CI tidak dipercaya |
| 7 korupsi teks di halaman Tugas | Tombol berbunyi "Muiai", "Kembaii" |
| Halaman Anggaran tanpa `viewer` | Anggaran lintas ruang bercampur |
| `listCategories("expense")` | Dropdown kosong; form anggaran tidak bisa disimpan |
| `min={1}` + `step` di 3 field | Nominal bulat ditolak browser |
| Kartu tanpa `min-w-0` | Luapan horizontal 156px di layar 390px |
| Progressbar tanpa nama | Pembaca layar tidak tahu apa yang diukur |
| Pemindai korupsi sendiri punya bug | Korupsi lolos dari audit otomatis |

**Pelajaran yang berulang:** menambah koleksi atau fitur baru berarti memeriksa
**semua** tempat yang sudah ada dan mungkin merujuknya — bukan hanya menulis
kode baru. Empat dari tujuh bug di atas muncul dari kelalaian itu.

## 7. Yang belum dikerjakan

Empat hal tersisa — **semuanya butuh akun atau keputusan Anda**, bukan
pekerjaan kode yang tertunda:

| Hal | Yang saya butuhkan dari Anda |
| --- | --- |
| **Deploy Vercel + domain** | Akun Vercel; `SESSION_SECRET` sudah siap |
| **Pembayaran Xendit/Midtrans** | Pilihan gateway + akun merchant |
| Sentry (monitoring error) | Akun Sentry (gratis untuk skala ini) |
| Uji restore Neon PITR | Akses konsol Neon untuk mencoba restore |

Fitur yang sengaja **tidak** dikerjakan karena butuh layanan berbayar atau data
nyata: daftar belanja realtime (Neon Realtime), pencarian bahasa alami (AI
Gateway, biaya per query), deteksi anomali (butuh data nyata untuk dilatih).

---

## 8. Cara memverifikasi ulang

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm build

node scripts/validate-classes.cjs
node scripts/validate-links.cjs
node scripts/scan-l-i.cjs

# Butuh server jalan di port 3100
pnpm dev --port 3100
node scripts/audit-theme.cjs
node scripts/audit-all-pages.cjs
node scripts/prove-upload.cjs
node scripts/prove-edit-transaction.cjs
node scripts/prove-density.cjs
node scripts/audit-a11y.cjs
node scripts/prove-export.cjs
node scripts/check-export-auth.cjs
node scripts/prove-shortcuts.cjs
```

---

## 9. Memeriksa otorisasi

Setiap server action harus memeriksa sesi. Skrip di bawah mencetak action yang
tidak memanggil satu pun pemeriksaan:

```bash
node scripts/check-authorization.cjs
```

Yang sah muncul hanya empat: `loginAction`, `logoutAction`,
`switchProfileAction` (memakai `getSession` langsung), dan `submitContact`
(form publik).

### Jebakan yang perlu diingat

Tiruan `requireViewer` di test **harus melempar**, bukan mengembalikan `null`.
Tiruan yang mengembalikan `null` membuat aksi tetap berjalan tanpa sesi,
sehingga test otorisasi lulus palsu. Inilah yang menyembunyikan enam celah di
bagian 3.3 — `tsc` hijau, 417 test hijau, tetapi `resetDemoData` bisa dipanggil
siapa pun.

Pelajaran yang sama berlaku untuk audit: **test yang hijau tidak membuktikan
apa pun tentang hal yang tidak diuji.** Yang menemukan celah ini adalah
pemeriksaan sistematis atas seluruh 52 action, bukan test yang sudah ada.
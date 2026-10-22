# 20 — UX Aplikasi Keluarga

> Diperbarui: 2026-10-21
> Fokus: rasa pakai (quality of life), bukan menambah fitur baru.

Dokumen ini mencatat keputusan UX dan infrastruktur UI aplikasi Keluarga:
apa yang berubah, kenapa, dan bagaimana menambah halaman baru tanpa merusaknya.

---

## 1. Prinsip yang dipakai

1. **Tidak ada dialog browser.** `alert`, `confirm`, dan `prompt` memutus alur dan
   tidak bisa digayakan. Semua umpan balik tampil di dalam aplikasi.
2. **Umpan balik dekat dengan aksi.** Notifikasi muncul di sudut, bukan di puncak
   halaman, supaya tidak menggeser tata letak.
3. **Navigasi bisa dicari, bukan hanya dipindai.** 21 halaman terlalu banyak untuk
   dihafal. Satu pintu pencarian lebih berguna daripada menu yang lebih rapi.
4. **Aksi destruktif selalu dikonfirmasi, dengan konsekuensi yang dijelaskan.**
   Bukan sekadar "Yakin?".
5. **Kerangka muat menyerupai halaman asli.** Perpindahan halaman tidak terasa
   kosong dan tidak ada lompatan tata letak.

---

## 2. Fondasi yang dibangun

### Toast (`src/components/ui/toast.tsx`)

Notifikasi dalam aplikasi, dipasang sekali di root layout.

```tsx
const toast = useToast();
toast.success("Transaksi tersimpan");
toast.error("Gagal menyimpan", "Periksa kembali jumlah dan akun.");
```

- Maksimal 4 notifikasi terlihat; yang lama terdorong keluar.
- Sukses/info hilang setelah 4 detik, error setelah 7 detik.
- Bisa ditutup manual, mendukung satu tombol aksi.
- `aria-live="polite"`, error memakai `role="alert"`.
- Posisi: kanan bawah di desktop, tengah bawah di ponsel (di atas bottom nav).

### Confirm (`src/components/ui/confirm.tsx`)

Dialog konfirmasi milik aplikasi, menggantikan `window.confirm`.

```tsx
const confirm = useConfirm();
const ok = await confirm({
  title: "Hapus tugas ini?",
  description: "Tugas akan hilang dari papan dan tidak bisa dikembalikan.",
  tone: "danger",
  confirmLabel: "Hapus",
});
```

- `role="alertdialog"`, fokus otomatis ke tombol utama.
- `Escape` membatalkan, `Enter` menyetujui.
- Fokus dikembalikan ke elemen pemicu setelah dialog ditutup.
- Klik latar menutup dialog.

### ActionButton & ActionForm

`ActionButton` tidak lagi memakai `<form>`, karena konfirmasi perlu menahan
pengiriman lebih dulu. Sekarang memakai `onClick` + `useTransition`:

- Tidak ada risiko submit ganda.
- Status pending tampil di tombol ("Memproses…").
- Hasil `ActionResult` langsung menjadi toast.
- `router.refresh()` dipanggil setelah aksi agar data server diperbarui.

`InlineForm` hanya memunculkan toast saat **gagal**. Untuk aksi yang hasilnya
langsung terlihat (centang belanja, ubah status tugas), notifikasi sukses justru
mengganggu.

---

## 3. Context menu (klik kanan)

`src/components/app/context-menu.tsx`

```tsx
<ContextMenu
  as="li"
  className="row-interactive px-5 py-3"
  items={[
    { kind: "label", text: bill.name },
    { kind: "copy", label: "Salin nominal", value: formatIDR(bill.amount) },
    { kind: "separator" },
    { kind: "action", label: "Lewati periode", action: skipBill, fields: { billId: bill.id } },
  ]}
>
  …isi baris…
</ContextMenu>
```

### Jenis item

| Kind | Fungsi |
| --- | --- |
| `label` | Judul konteks, tidak bisa diklik |
| `copy` | Salin teks ke clipboard + toast |
| `link` | Navigasi ke halaman lain |
| `action` | Menjalankan server action, dengan konfirmasi opsional |
| `separator` | Garis pemisah |

### Kenapa `as` dan bukan pembungkus

Komponen ini **merender elemennya sendiri** (`as="tr" | "li" | "div"`), bukan
membungkus anak dengan `<div>`. Alasannya:

- `<div>` tidak boleh berada di dalam `<tbody>` — ini memicu hydration error.
- Pembungkus merusak `display: table-row` dan `flex` pada baris daftar.

Versi pertama memakai `<div className="contents">`; hasilnya halaman transaksi
gagal total. Versi kedua memakai `cloneElement`, tetapi tidak aman untuk elemen
yang berasal dari server component. Pendekatan sekarang menghindari keduanya.

### Portal

Menu dirender lewat `createPortal` ke `document.body`, supaya tidak terpotong
`overflow: hidden` pada tabel atau kartu. Posisi dijepit agar tetap di dalam
viewport, dan menu ditutup saat scroll atau resize.

### Keyboard

`Escape` menutup, `↑`/`↓` memindahkan sorotan, `Enter` menjalankan item.

### Halaman yang sudah memakai

| Halaman | Menu |
| --- | --- |
| Transaksi | Salin nominal, salin ID, buka akun, kelola kategori, batalkan |
| Tagihan | Salin nominal, salin jatuh tempo, catat transaksi, lewati periode |
| Tugas | Mulai, selesai, kembalikan, hapus |
| Belanja | Salin nama, salin harga, tandai sudah dibeli / batalkan |

---

## 4. Command palette (⌘K)

`src/components/app/command-palette.tsx`

Satu pintu untuk 21 halaman dan beberapa aksi cepat.

- Dibuka dengan `⌘K` / `Ctrl+K`, tombol "Cari…" di sidebar, atau ikon kaca pembesar
  di ponsel.
- Pencarian mencocokkan label, nama grup, dan **kata kunci bahasa sehari-hari**.
  Contoh: "listrik" → Tagihan, "dokter" → Kesehatan, "spp" → Pendidikan,
  "kpr" → Utang & piutang.
- Hasil dikelompokkan: Aksi cepat → Navigasi.
- `↑`/`↓` memilih, `Enter` membuka, `Esc` menutup.
- Item terpilih otomatis di-scroll agar tetap terlihat.

Kata kunci didefinisikan di `src/config/app-nav.ts` bersama navigasi, jadi
menambah halaman dan kata kuncinya cukup di satu tempat.

---

## 5. Sidebar

`src/components/app/app-sidebar.tsx`

Perbaikan dibanding versi sebelumnya:

| Sebelum | Sesudah |
| --- | --- |
| Tanpa ikon | Ikon garis 20×20 per menu |
| Daftar datar 21 item | 6 grup yang bisa dilipat |
| Status lipatan hilang saat reload | Tersimpan di `localStorage` |
| Tidak ada pencarian | Tombol "Cari… ⌘K" di puncak |
| Menu aktif berupa blok hitam penuh | Batang kiri + latar kartu + ikon berwarna |
| Tombol "Keluar" telanjang | Menu pengguna (Pengaturan, Pesanan, Semua aplikasi, Keluar) |
| Drawer mobile menutupi konten | Drawer dengan latar gelap, tutup otomatis saat pindah halaman |
| Bottom nav teks saja | Bottom nav berikon |

### Status lipatan tanpa efek

Status grup dibaca lewat `useSyncExternalStore` dari `localStorage`, bukan
`useEffect` + `setState`. Ini menghindari render berantai (ditandai sebagai error
oleh lint React 19) dan aman saat hidrasi.

Drawer dan menu pengguna menyimpan **pathname saat dibuka**, sehingga otomatis
tertutup ketika pengguna berpindah halaman — juga tanpa efek.

### Tata letak

Header (logo + pencarian) dan footer (menu pengguna) tetap, hanya bagian tengah
yang scroll. Diuji pada tinggi 900px: 21 menu + menu pengguna muat tanpa scroll.

---

## 6. Kerangka muat

`src/components/app/skeleton.tsx` + `src/app/(apps)/keluarga/loading.tsx`

- `.skeleton` memakai animasi shimmer, dimatikan otomatis saat
  `prefers-reduced-motion`.
- Bentuk kerangka meniru tata letak asli (header, 4 kartu statistik, daftar).
- Diterapkan di level segmen `keluarga`, jadi berlaku untuk semua halaman anak.

---

## 7. Halaman peta aplikasi

`/keluarga/peta`

Halaman bantuan yang mendaftar semua fitur dan pintasan keyboard. Berguna untuk
pengguna baru yang belum tahu halaman mana yang harus dibuka. Bisa dicapai dari
grup "Lainnya" atau lewat ⌘K → "Peta aplikasi".

---

## 8. Cara menambah halaman baru

1. **Tambah entri di `src/config/app-nav.ts`** — label, href, ikon, kata kunci.
   Sidebar, command palette, dan halaman peta otomatis ikut.
2. **Buat halaman** di `src/app/(apps)/keluarga/<nama>/page.tsx`.
3. **Bungkus baris data dengan `ContextMenu`** bila ada daftar yang bisa
   diolah. Pilih `as` sesuai elemen: `tr` untuk tabel, `li` untuk daftar.
4. **Gunakan `ActionButton`** untuk aksi destruktif, sertakan `confirmText` dan
   `confirmDescription` yang menjelaskan konsekuensinya.
5. **Jangan pakai `window.confirm`/`alert`.** Sudah ada penggantinya.

---

## 9. Batasan

| Hal | Status |
| --- | --- |
| Undo setelah hapus | Belum — aksi destruktif masih permanen setelah dikonfirmasi |
| Pintasan keyboard per aksi | Belum — baru ⌘K dan navigasi di dalam palette |
| Context menu di ponsel | Tidak tersedia (klik kanan tidak ada); aksi tetap lewat tombol |
| Preferensi tema gelap | Belum |
| Sinkronisasi preferensi antar perangkat | Belum — lipatan grup disimpan per browser |

---

## 10. Verifikasi

| Pemeriksaan | Hasil |
| --- | --- |
| `pnpm lint` | bersih |
| `pnpm typecheck` | bersih |
| `pnpm test` | 95 lulus (8 berkas) |
| `pnpm build` | sukses |
| Context menu merender `<tr>` tanpa pembungkus | diuji di jsdom |
| Konfirmasi menahan aksi destruktif | diuji |
| `Escape` menutup menu | diuji |
| Salin ke clipboard | diuji |
| Kata kunci pencarian menemukan halaman tepat | diuji |
| Sidebar 21 menu muat di 900px | diperiksa lewat screenshot |
| Tampilan mobile 390×844 | diperiksa lewat screenshot |
| Tidak ada hydration error | diperiksa di console |

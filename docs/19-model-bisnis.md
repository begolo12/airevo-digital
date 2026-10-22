# 19 — Model Bisnis & Penjualan

> Diperbarui: 2026-10-21
> Keputusan pemilik: **sekali beli Rp49.000, akses seumur hidup, tanpa langganan.**
> Gateway pembayaran: **Xendit/Midtrans nanti — sekarang formatnya dulu.**

Dokumen ini menjelaskan bagaimana situs ini menghasilkan uang, dan bagaimana
kode mendukungnya.

---

## 1. Ringkasan keputusan

| Hal | Keputusan | Alasan |
| --- | --- | --- |
| Model harga | Sekali bayar | Pembeli Indonesia menghindari langganan untuk alat pribadi |
| Harga Keluarga | Rp49.000 | Terjangkau untuk rumah tangga, margin tetap positif |
| Isi lisensi | Akses hosted seumur hidup, semua fitur | Paling sesuai janji "tanpa langganan" |
| Pembayaran | Transfer manual, gateway menyusul | Bisa jalan hari ini tanpa KYC |
| Jumlah produk aktif | 1 (Keluarga) | Fokus; Ops & Keuangan disembunyikan |
| Landing page | Umum (studio + produk) | Tidak boleh terdengar seperti satu produk saja |

### Konsekuensi yang harus disadari

Karena akses seumur hidup tanpa biaya berulang, **biaya hosting ditanggung
penjual selamanya**. Rp49.000 per pembeli hanya menutup hosting selama beberapa
tahun. Ini keputusan sadar: prioritas saat ini adalah pengguna awal dan
kredibilitas, bukan margin.

Jika suatu saat biaya hosting menjadi masalah, opsi yang tetap jujur:

1. Naikkan harga untuk pembeli baru (pembeli lama tetap).
2. Tambahkan paket hosted berbayar terpisah, bukan mengubah lisensi lama.

---

## 2. Dua sumber pendapatan

```
Pendapatan
├── Produk siap pakai (self-serve)
│   └── Keluarga — Rp49.000 sekali bayar
└── Jasa (custom)
    └── Web app / internal tools — harga per proyek lewat /contact
```

Landing page menampilkan keduanya, dengan produk sebagai fokus utama.

---

## 3. Alur pembelian

```
/beli/[slug]                    /pesanan/[code]              /admin/pesanan
     │                                │                            │
  isi nama, email  ──createOrder──▶  kode pesanan + instruksi  ──▶ verifikasi
  centang setuju                     transfer manual                 │
                                                                     ▼
                                                          tandai lunas
                                                                     │
                                                          settleOrder()
                                                                     │
                                                          lisensi terbit
                                                                     │
                                                          /keluarga terbuka
```

### Langkah detail

1. **Pilih produk.** `/aplikasi` menampilkan katalog; hanya produk `visible` yang muncul.
2. **Buka checkout.** `/beli/keluarga` — form nama, email, WhatsApp (opsional), dan
   centang persetujuan bahwa ini pembelian sekali bayar.
3. **Pesanan dibuat.** `createOrder` memvalidasi dengan Zod, mengambil harga dari
   registry (bukan dari form, sehingga tidak bisa dimanipulasi), lalu memanggil
   provider pembayaran.
4. **Instruksi tampil.** `/pesanan/ARV-XXXXX` menampilkan rekening tujuan, nominal,
   dan langkah transfer.
5. **Verifikasi manual.** Pemilik membuka `/admin/pesanan`, menekan "Tandai lunas".
6. **Lisensi terbit.** `settleOrder()` mengubah status pesanan, menerbitkan kunci
   lisensi, dan menautkannya ke email pembeli.
7. **Akses aktif.** Layout `/keluarga` memanggil `hasLicense(session.email, "keluarga")`.
   Tanpa lisensi, isi aplikasi tidak dirender.

### Pengaman yang sudah ada

- Harga **selalu** diambil dari registry, bukan dari input form.
- Pesanan pending ganda untuk email + produk yang sama dipakai ulang (tidak dobel tagihan).
- Pesanan kedaluwarsa setelah 3 hari.
- `settleOrder()` idempoten: webhook ganda tidak menerbitkan lisensi kedua.
- Lisensi hanya berlaku untuk produk yang dibeli (`productId` dicocokkan).
- Pencocokan email tidak peka huruf besar.
- Lisensi yang dicabut langsung menutup akses.
- Semua aksi admin butuh peran `owner`.

---

## 4. Struktur data

### Order

```ts
type Order = {
  id: string;
  code: string;              // ARV-XXXXX, tanpa 0/O/1/I/L
  productId: string;
  productName: string;       // disimpan agar riwayat tetap terbaca
  buyerName: string;
  email: string;             // kunci pencocokan lisensi
  whatsapp?: string;
  amount: number;            // disimpan saat checkout, bukan dihitung ulang
  status: "pending" | "paid" | "cancelled" | "expired";
  provider: "manual" | "xendit" | "midtrans";
  method: "bank_transfer" | "qris" | "redirect";
  providerRef?: string;      // id transaksi gateway
  instructions?: string[];
  bankAccount?: { bank: string; number: string; holder: string };
  createdAt: string;
  expiresAt: string;
  paidAt?: string;
};
```

`amount` dan `productName` sengaja **disalin** ke pesanan. Kalau harga produk naik
besok, riwayat pembelian lama tidak berubah.

### ProductLicense

```ts
type ProductLicense = {
  id: string;
  orderId: string;
  productId: string;
  key: string;               // KELU-XXXX-XXXX-XXXX
  email: string;
  status: "active" | "revoked";
  issuedAt: string;
  revokedAt?: string;
};
```

**Tidak ada `expiresAt`** — itu yang membuatnya "seumur hidup". Pencabutan hanya
lewat tindakan manual (refund/penyalahgunaan).

---

## 5. Registry produk

Harga dan lisensi hidup di `src/config/apps.ts`, bukan di database. Alasannya:
harga adalah keputusan produk, bukan data pengguna, dan perlu ikut version control.

```ts
{
  id: "keluarga",
  status: "available",
  visible: true,          // tampil di katalog publik
  pricing: {
    price: 49_000,
    currency: "IDR",
    license: {
      model: "one-time",
      summary: "Sekali bayar. Akses seumur hidup. Tanpa langganan.",
      includes: [...],
      seats: "1 keluarga, hingga 6 anggota",
      updates: "Pembaruan versi mayor dan perbaikan masuk otomatis.",
      support: "Bantuan lewat email, balasan 1–2 hari kerja.",
    },
  },
}
```

### Menyembunyikan produk

Produk lama **tidak dihapus**, hanya `visible: false`:

```ts
{ id: "ops", status: "soon", visible: false }
```

Efeknya: hilang dari landing, `/aplikasi`, sitemap, dan halaman detail — tetapi
datanya tetap ada dan bisa diaktifkan kembali dengan satu baris.

`getVisibleApp()` mengembalikan `undefined` untuk produk tersembunyi, sehingga
`/aplikasi/ops` menjadi 404. Ini disengaja: halaman produk setengah jadi lebih
merugikan daripada tidak ada.

---

## 6. Lapisan pembayaran

Semua provider memenuhi satu kontrak:

```ts
interface PaymentProvider {
  id: "manual" | "xendit" | "midtrans";
  label: string;
  isConfigured(): boolean;
  createPayment(intent: PaymentIntent): Promise<PaymentResult>;
}
```

Lokasi: `src/lib/payments/`.

| File | Status |
| --- | --- |
| `manual.ts` | **Aktif.** Transfer bank, tanpa kredensial |
| `xendit.ts` | Kerangka. Melempar error sampai diimplementasikan |
| `midtrans.ts` | Kerangka. Melempar error sampai diimplementasikan |
| `index.ts` | `getPaymentProvider()` memilih provider |

### Perilaku pemilihan provider

```ts
const candidate = providers[process.env.PAYMENT_PROVIDER];
return candidate?.isConfigured() ? candidate : manualProvider;
```

Jika gateway diminta tetapi kredensial belum ada, aplikasi **jatuh ke transfer
manual**, bukan gagal. Pembeli tetap bisa menyelesaikan pesanan.

---

## 7. Cara mengaktifkan Xendit

1. Daftar akun Xendit, dapatkan `XENDIT_SECRET_KEY` dan `XENDIT_CALLBACK_TOKEN`.
2. Isi keduanya di environment Vercel.
3. Set `PAYMENT_PROVIDER="xendit"`.
4. Implementasikan `createPayment` di `src/lib/payments/xendit.ts`:

```ts
const response = await fetch("https://api.xendit.co/v2/invoices", {
  method: "POST",
  headers: {
    Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    external_id: intent.orderCode,
    amount: intent.amount,
    payer_email: intent.customer.email,
    description: intent.productName,
    success_redirect_url: `${site.url}/pesanan/${intent.orderCode}?status=paid`,
    failure_redirect_url: `${site.url}/pesanan/${intent.orderCode}?status=failed`,
  }),
});
```

5. Buat route `POST /api/payments/xendit`:

```ts
// Verifikasi header x-callback-token, lalu:
const order = orderByCode(body.external_id);
if (order && body.status === "PAID") settleOrder(order);
```

6. Tambahkan endpoint yang sama untuk Midtrans dengan verifikasi `signature_key`
   = `sha512(order_id + status_code + gross_amount + serverKey)`.

**Yang tidak perlu diubah:** halaman checkout, halaman pesanan, penerbitan lisensi,
gate akses. Semuanya sudah lepas dari detail provider.

---

## 8. Halaman yang terlibat

| Route | Peran | Indeks |
| --- | --- | --- |
| `/` | Landing umum: studio + produk + model harga | Ya |
| `/aplikasi` | Katalog berharga | Ya |
| `/aplikasi/[slug]` | Detail + kartu harga + lisensi | Ya |
| `/beli/[slug]` | Checkout | Tidak |
| `/pesanan/[code]` | Status + instruksi + kunci lisensi | Tidak |
| `/admin/pesanan` | Verifikasi, lisensi, pendapatan | Tidak |
| `/keluarga` | Aplikasi, dijaga gate lisensi | Tidak |

`/beli`, `/pesanan`, dan `/admin` diblokir di `robots.ts`.

---

## 9. Metrik yang sudah bisa dibaca

Di `/admin/pesanan`:

- **Pendapatan** — jumlah pesanan lunas
- **Menunggu bayar** — pesanan pending
- **Lisensi aktif** — total lisensi `active`
- **Pembeli** — email unik yang sudah lunas
- **Konversi** — lunas ÷ total pesanan

Belum ada: analitik funnel (berapa yang membuka `/beli` lalu batal). Itu butuh
event tracking, rencananya lewat Vercel Analytics atau tabel `events`.

---

## 10. Yang belum, dan urutannya

| Hal | Prioritas | Catatan |
| --- | --- | --- |
| Gateway otomatis | Tinggi | Kerangka siap; tinggal implementasi + webhook |
| Email lisensi otomatis | Tinggi | Sekarang kunci tampil di halaman pesanan |
| Halaman "pesanan saya" | Sedang | Pembeli bisa cek ulang tanpa simpan URL |
| Kupon / diskon | Rendah | Belum ada kebutuhan |
| Analitik funnel | Rendah | Butuh event tracking |
| Multi-produk | Menunggu | Aktifkan `visible: true` saat siap |

---

## 11. Pertanyaan yang mungkin muncul

**Kalau pembeli minta refund?**
Cabut lisensi di `/admin/pesanan`. Akses langsung tertutup. Tidak ada
pro-rata karena tidak ada langganan.

**Kalau satu keluarga punya dua email?**
Lisensi terikat per email. Satu pembelian = satu email. Jika butuh lebih,
terbitkan lisensi tambahan secara manual (belum ada UI-nya).

**Kenapa harga tidak di database?**
Harga perlu version control dan review. Menyimpannya di DB menambah risiko
perubahan tak sengaja yang langsung memengaruhi checkout.

**Apakah orang bisa mengakali harga?**
Tidak. `createOrder` membaca `app.pricing.price` dari registry dan mengabaikan
input harga apa pun dari form.

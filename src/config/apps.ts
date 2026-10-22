export type ProductStatus = "available" | "soon" | "retired";

/** Isi lisensi: apa yang didapat pembeli setelah membayar sekali. */
export type License = {
  /** Selalu "one-time" — tidak ada langganan. */
  model: "one-time";
  /** Kalimat pendek untuk kartu harga. */
  summary: string;
  /** Poin-poin isi lisensi. */
  includes: string[];
  /** Batas pemakaian. */
  seats: string;
  /** Kebijakan pembaruan versi. */
  updates: string;
  /** Dukungan yang disertakan. */
  support: string;
};

export type Pricing = {
  /** Harga dalam rupiah penuh, tanpa desimal. */
  price: number;
  /** Harga coret bila ada promo. */
  compareAt?: number;
  currency: "IDR";
  license: License;
};

export type AppEntry = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  /** Untuk siapa produk ini. */
  audience: string;
  /** Tujuan tombol "Masuk". */
  href: string;
  /** true jika aplikasi hidup di deployment lain. */
  external: boolean;
  marketingHref: string;
  status: ProductStatus;
  /**
   * Tampil di katalog publik.
   * Produk yang belum siap dijual tetap disimpan di sini agar datanya tidak hilang.
   */
  visible: boolean;
  requiresAuth: boolean;
  accent: "butter" | "mint" | "tomato" | "sky" | "plum";
  features: string[];
  version: string;
  lastUpdated: string;
  /** Kosong berarti belum dijual (status "soon"). */
  pricing?: Pricing;
};

/**
 * Lisensi standar untuk semua produk: sekali beli, akses seumur hidup.
 *
 * Model ini sengaja dipakai agar tidak ada tagihan berulang. Konsekuensinya
 * biaya hosting ditanggung penjual, jadi harga tidak boleh terlalu rendah.
 */
const lifetimeLicense = (seats: string): License => ({
  model: "one-time",
  summary: "Sekali bayar. Akses seumur hidup. Tanpa langganan.",
  includes: [
    "Semua fitur yang tersedia saat ini",
    "Pembaruan versi berikutnya tanpa biaya tambahan",
    "Data tersimpan di akun Anda sendiri",
  ],
  seats,
  updates: "Pembaruan versi mayor dan perbaikan masuk otomatis.",
  support: "Bantuan lewat email, balasan 1–2 hari kerja.",
});

/**
 * Katalog produk.
 *
 * Hanya produk dengan `visible: true` yang tampil di landing, /aplikasi,
 * sitemap, dan halaman detail. Produk lama disimpan dengan `visible: false`
 * agar mudah diaktifkan kembali tanpa menulis ulang datanya.
 *
 * Aplikasi lama tidak dipindahkan ke repo ini. Isi URL-nya lewat environment
 * variable supaya bisa berubah tanpa mengubah kode:
 *   NEXT_PUBLIC_OPS_URL
 *   NEXT_PUBLIC_KEUANGAN_URL
 */
const opsUrl = process.env.NEXT_PUBLIC_OPS_URL || "/aplikasi/ops";
const keuanganUrl = process.env.NEXT_PUBLIC_KEUANGAN_URL || "/aplikasi/keuangan";

export const apps: AppEntry[] = [
  {
    id: "keluarga",
    name: "Keluarga",
    tagline: "Uang, rencana, dan ritme rumah dalam satu tempat.",
    description:
      "Catat arus kas, atur anggaran, pantau tagihan, dan capai tujuan keluarga — tanpa spreadsheet.",
    audience: "Untuk rumah tangga yang ingin catatan keuangannya rapi.",
    href: "/keluarga",
    external: false,
    marketingHref: "/aplikasi/keluarga",
    status: "available",
    visible: true,
    requiresAuth: true,
    accent: "mint",
    version: "1.0",
    lastUpdated: "Oktober 2026",
    features: [
      "Catat transaksi dalam hitungan detik",
      "Anggaran bulanan per kategori",
      "Pengingat tagihan dan langganan",
      "Tujuan keuangan dengan proyeksi",
      "Utang, piutang, aset, dan kekayaan bersih",
      "Kalender, tugas rumah, dan daftar belanja",
      "Dokumen, kesehatan, dan pendidikan anak",
    ],
    pricing: {
      price: 49_000,
      currency: "IDR",
      license: lifetimeLicense("1 keluarga, hingga 6 anggota"),
    },
  },
  {
    id: "ops",
    name: "Ops",
    tagline: "Kelola klien, proyek, dan task tanpa spreadsheet berserakan.",
    description:
      "Aplikasi operasional untuk studio dan tim kecil: klien, proyek, task, dan progres.",
    audience: "Untuk studio dan tim kecil.",
    href: opsUrl,
    external: Boolean(process.env.NEXT_PUBLIC_OPS_URL),
    marketingHref: "/aplikasi/ops",
    status: "soon",
    visible: false,
    requiresAuth: true,
    accent: "sky",
    version: "0.9",
    lastUpdated: "—",
    features: [
      "Data klien terpusat",
      "Proyek dengan status dan progres",
      "Task dengan prioritas dan tenggat",
    ],
  },
  {
    id: "keuangan",
    name: "Keuangan",
    tagline: "Catat arus kas dan baca laporan tanpa menunggu akhir bulan.",
    description:
      "Aplikasi keuangan untuk usaha: akun, transaksi, anggaran, dan laporan.",
    audience: "Untuk usaha kecil dan perorangan.",
    href: keuanganUrl,
    external: Boolean(process.env.NEXT_PUBLIC_KEUANGAN_URL),
    marketingHref: "/aplikasi/keuangan",
    status: "soon",
    visible: false,
    requiresAuth: true,
    accent: "butter",
    version: "0.9",
    lastUpdated: "—",
    features: [
      "Akun dan saldo otomatis",
      "Transaksi pemasukan, pengeluaran, transfer",
      "Laporan bulanan dan ekspor",
    ],
  },
];

/** Produk yang tampil di katalog publik. */
export const visibleApps = apps.filter((app) => app.visible);

/** Produk yang sedang dijual (punya harga). */
export const sellableApps = visibleApps.filter((app) => app.pricing);

export function getApp(id: string): AppEntry | undefined {
  return apps.find((app) => app.id === id);
}

/** Hanya produk yang boleh diakses publik. */
export function getVisibleApp(id: string): AppEntry | undefined {
  return apps.find((app) => app.id === id && app.visible);
}

export function getSellableApp(id: string): AppEntry | undefined {
  return apps.find((app) => app.id === id && app.visible && app.pricing);
}

export const accentClasses: Record<
  AppEntry["accent"],
  { bg: string; border: string; text: string; solid: string }
> = {
  butter: {
    bg: "bg-butter/45",
    border: "border-butter-deep",
    text: "text-ink",
    solid: "bg-butter-deep",
  },
  mint: {
    bg: "bg-mint/45",
    border: "border-mint-deep",
    text: "text-ink",
    solid: "bg-mint-deep",
  },
  tomato: {
    bg: "bg-tomato/15",
    border: "border-tomato/40",
    text: "text-tomato-deep",
    solid: "bg-tomato",
  },
  sky: {
    bg: "bg-sky/45",
    border: "border-sky-deep",
    text: "text-ink",
    solid: "bg-sky-deep",
  },
  plum: {
    bg: "bg-plum/40",
    border: "border-plum",
    text: "text-ink",
    solid: "bg-plum",
  },
};

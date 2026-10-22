import type { IconName } from "@/components/ui/icon";

export type NavItem = {
  label: string;
  href: string;
  icon: IconName;
  /** Cocok persis, bukan prefix. Untuk halaman indeks. */
  exact?: boolean;
  /** Kata kunci tambahan untuk pencarian di command palette. */
  keywords?: string[];
  /** Angka kecil di kanan, misalnya jumlah tagihan jatuh tempo. */
  badge?: number;
};

export type NavGroup = {
  id: string;
  title: string;
  items: NavItem[];
};

/**
 * Satu sumber navigasi untuk sidebar, bottom nav, dan command palette.
 *
 * Menambah halaman cukup di sini: sidebar, pencarian, dan pintasan ikut
 * menyesuaikan tanpa mengubah komponen.
 */
export const appNav: NavGroup[] = [
  {
    id: "ringkasan",
    title: "Ringkasan",
    items: [
      {
        label: "Dashboard",
        href: "/keluarga",
        icon: "home",
        exact: true,
        keywords: ["beranda", "ringkasan", "awal"],
      },
    ],
  },
  {
    id: "uang",
    title: "Uang",
    items: [
      // Halaman ini dulu tidak punya tautan navigasi sama sekali sehingga tidak
      // bisa dijangkau. Sekarang menjadi halaman utama grup "Uang".
      {
        label: "Ringkasan uang",
        href: "/keluarga/keuangan",
        icon: "chart",
        exact: true,
        keywords: ["keuangan", "ringkasan", "arus kas", "saldo", "overview"],
      },
      {
        label: "Transaksi",
        href: "/keluarga/keuangan/transaksi",
        icon: "receipt",
        keywords: ["catat", "pengeluaran", "pemasukan", "transfer", "riwayat"],
      },
      {
        label: "Berulang",
        href: "/keluarga/keuangan/berulang",
        icon: "repeat",
        keywords: ["rutin", "gaji", "langganan", "cicilan", "otomatis", "berulang"],
      },
      {
        label: "Akun",
        href: "/keluarga/keuangan/akun",
        icon: "bank",
        keywords: ["rekening", "saldo", "dompet", "cash"],
      },
      {
        label: "Kategori",
        href: "/keluarga/keuangan/kategori",
        icon: "tag",
        keywords: ["label", "klasifikasi"],
      },
      {
        label: "Anggaran",
        href: "/keluarga/keuangan/anggaran",
        icon: "chart",
        keywords: ["budget", "batas", "bulanan"],
      },
      {
        label: "Tagihan",
        href: "/keluarga/keuangan/tagihan",
        icon: "calendar",
        keywords: ["bill", "jatuh tempo", "listrik", "internet", "langganan"],
      },
      {
        label: "Utang & piutang",
        href: "/keluarga/keuangan/utang",
        icon: "handshake",
        keywords: ["hutang", "pinjaman", "cicilan", "kpr", "piutang"],
      },
      {
        label: "Aset & asuransi",
        href: "/keluarga/keuangan/aset",
        icon: "building",
        keywords: ["properti", "kendaraan", "emas", "polis", "kekayaan"],
      },
    ],
  },
  {
    id: "rencana",
    title: "Rencana",
    items: [
      {
        label: "Tujuan",
        href: "/keluarga/rencana",
        icon: "target",
        keywords: ["goal", "dana darurat", "liburan", "kuliah", "tabungan"],
      },
    ],
  },
  {
    id: "harian",
    title: "Harian",
    items: [
      {
        label: "Kalender",
        href: "/keluarga/kalender",
        icon: "calendar",
        keywords: ["agenda", "jadwal", "ulang tahun", "acara"],
      },
      {
        label: "Tugas",
        href: "/keluarga/tugas",
        icon: "check",
        keywords: ["chore", "pekerjaan rumah", "pr"],
      },
      {
        label: "Belanja",
        href: "/keluarga/belanja",
        icon: "cart",
        keywords: ["shopping", "daftar", "pasar", "groceries"],
      },
    ],
  },
  {
    id: "catatan",
    title: "Catatan",
    items: [
      {
        label: "Dokumen",
        href: "/keluarga/dokumen",
        icon: "file",
        keywords: ["berkas", "kk", "akta", "sertifikat", "paspor"],
      },
      {
        label: "Kesehatan",
        href: "/keluarga/kesehatan",
        icon: "heart",
        keywords: ["dokter", "obat", "alergi", "imunisasi", "kontrol"],
      },
      {
        label: "Pendidikan",
        href: "/keluarga/pendidikan",
        icon: "book",
        keywords: ["sekolah", "spp", "kuliah", "biaya"],
      },
    ],
  },
  {
    id: "lainnya",
    title: "Lainnya",
    items: [
      // "Anggota" tidak lagi berdiri sendiri: pengelolaannya menyatu dengan
      // Pengaturan agar tidak ada dua tempat untuk hal yang sama.
      {
        label: "Laporan",
        href: "/keluarga/laporan",
        icon: "chart",
        keywords: ["report", "rekap", "tren", "analisis"],
      },
      {
        label: "Pengaturan",
        href: "/keluarga/pengaturan",
        icon: "settings",
        keywords: ["setting", "lisensi", "preferensi", "akun"],
      },
      {
        label: "Peta aplikasi",
        href: "/keluarga/peta",
        icon: "grid",
        keywords: ["bantuan", "help", "pintasan", "shortcut", "semua halaman"],
      },
    ],
  },
];

/**
 * Menu khusus pemilik: penjualan produk.
 *
 * Digabung ke grup "Lainnya", bukan grup terpisah — supaya sidebar tidak
 * bertambah satu header lagi dan tetap muat tanpa scroll di layar 900px.
 */
export const ownerItems: NavItem[] = [
  {
    label: "Pesanan",
    href: "/admin/pesanan",
    icon: "package",
    keywords: ["order", "lisensi", "pendapatan", "pembeli", "penjualan"],
  },
];

/** Item untuk bottom nav di layar kecil. */
export const bottomNavItems: NavItem[] = [
  { label: "Beranda", href: "/keluarga", icon: "home", exact: true },
  { label: "Uang", href: "/keluarga/keuangan/transaksi", icon: "receipt" },
  { label: "Rencana", href: "/keluarga/rencana", icon: "target" },
  { label: "Harian", href: "/keluarga/kalender", icon: "calendar" },
  { label: "Lainnya", href: "/keluarga/pengaturan", icon: "settings" },
];

export function navGroupsFor(role: string): NavGroup[] {
  if (role !== "owner") return appNav;

  return appNav.map((group) =>
    group.id === "lainnya"
      ? { ...group, items: [...group.items, ...ownerItems] }
      : group,
  );
}

/**
 * Grup yang dibuka saat pertama kali.
 *
 * Hanya grup yang memuat halaman aktif. Sisanya terlipat supaya sidebar tidak
 * terasa seperti daftar panjang — 21 menu sekaligus membuat mata lelah.
 */
export function defaultCollapsedGroups(activeGroupId: string | null): Record<string, boolean> {
  const collapsed: Record<string, boolean> = {};
  for (const group of appNav) {
    collapsed[group.id] = group.id !== activeGroupId;
  }
  return collapsed;
}

export function isNavActive(pathname: string, item: NavItem): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

/** Semua item, rata — untuk command palette. */
export function flatNav(role: string): NavItem[] {
  return navGroupsFor(role).flatMap((group) => group.items);
}

/** Grup yang memuat path aktif, untuk membuka accordion otomatis. */
export function groupIdForPath(pathname: string, role: string): string | null {
  const group = navGroupsFor(role).find((entry) =>
    entry.items.some((item) => isNavActive(pathname, item)),
  );
  return group?.id ?? null;
}

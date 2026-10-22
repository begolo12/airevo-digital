import "server-only";

import { getApp, type AppEntry } from "@/config/apps";
import { formatDate } from "@/lib/format";
import { getStore } from "./store";
import type { Order, OrderStatus, ProductLicense } from "./types";

/* ------------------------------- lisensi --------------------------------- */

/** Lisensi aktif milik sebuah email untuk produk tertentu. */
export function licenseFor(
  email: string,
  productId: string,
): ProductLicense | undefined {
  return getStore().licenses.find(
    (license) =>
      license.email.toLowerCase() === email.toLowerCase() &&
      license.productId === productId &&
      license.status === "active",
  );
}

/** Apakah sebuah email berhak memakai produk. */
export function hasLicense(email: string, productId: string): boolean {
  return Boolean(licenseFor(email, productId));
}

/** Semua lisensi milik satu email. */
export function licensesFor(email: string): ProductLicense[] {
  return getStore()
    .licenses.filter(
      (license) => license.email.toLowerCase() === email.toLowerCase(),
    )
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

export type LicenseRow = ProductLicense & {
  productName: string;
  productHref?: string;
  issuedLabel: string;
};

export function licenseRows(email: string): LicenseRow[] {
  return licensesFor(email).map((license) => {
    const app = getApp(license.productId);
    return {
      ...license,
      productName: app?.name ?? license.productId,
      productHref: app?.visible ? app.href : undefined,
      issuedLabel: formatDate(license.issuedAt.slice(0, 10)),
    };
  });
}

/* ------------------------------- pesanan --------------------------------- */

export function orderRows(): Order[] {
  return [...getStore().orders].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function orderByCode(code: string): Order | undefined {
  return getStore().orders.find(
    (order) => order.code.toLowerCase() === code.toLowerCase(),
  );
}

export function orderById(id: string): Order | undefined {
  return getStore().orders.find((order) => order.id === id);
}

export function ordersByEmail(email: string): Order[] {
  return getStore()
    .orders.filter((order) => order.email.toLowerCase() === email.toLowerCase())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export type OrderRow = Order & {
  product?: AppEntry;
  /** Instruksi pembayaran hanya ditampilkan saat masih pending. */
  payable: boolean;
  createdLabel: string;
  expiresLabel: string;
  licenseKey?: string;
};

export function orderRow(order: Order): OrderRow {
  const product = getApp(order.productId);
  const license = getStore().licenses.find((item) => item.orderId === order.id);
  return {
    ...order,
    product,
    payable: order.status === "pending",
    createdLabel: formatDate(order.createdAt.slice(0, 10)),
    expiresLabel: formatDate(order.expiresAt.slice(0, 10)),
    licenseKey: license?.key,
  };
}

/* ------------------------------ statistik -------------------------------- */

export type SalesSummary = {
  total: number;
  paid: number;
  pending: number;
  revenue: number;
  licenses: number;
  conversion: number;
};

export function salesSummary(): SalesSummary {
  const { orders, licenses } = getStore();
  const paid = orders.filter((order) => order.status === "paid");
  const pending = orders.filter((order) => order.status === "pending");
  const revenue = paid.reduce((sum, order) => sum + order.amount, 0);

  return {
    total: orders.length,
    paid: paid.length,
    pending: pending.length,
    revenue,
    licenses: licenses.filter((license) => license.status === "active").length,
    conversion: orders.length > 0 ? Math.round((paid.length / orders.length) * 100) : 0,
  };
}

/** Jumlah pembeli unik (satu email dihitung sekali). */
export function buyerCount(): number {
  const emails = new Set(
    getStore()
      .orders.filter((order) => order.status === "paid")
      .map((order) => order.email.toLowerCase()),
  );
  return emails.size;
}

export const orderStatusLabel: Record<OrderStatus, string> = {
  pending: "Menunggu pembayaran",
  paid: "Lunas",
  cancelled: "Dibatalkan",
  expired: "Kedaluwarsa",
};

/* --------------------------- logika lisensi ------------------------------ */

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/**
 * Kode acak tanpa karakter yang mudah tertukar (0/O, 1/I/L).
 *
 * ## Kenapa bukan `Math.random()`
 *
 * Kode pesanan adalah **satu-satunya** proteksi halaman `/pesanan/[code]`, yang
 * menampilkan email pembeli. `Math.random()` tidak kriptografis: keluarannya
 * bisa diprediksi setelah beberapa sampel, sehingga penyerang bisa menyusun
 * kode berikutnya lalu membaca data pembeli lain.
 *
 * `crypto.getRandomValues` tersedia di Node maupun browser, jadi fungsi ini
 * aman dipakai di keduanya.
 *
 * ## Kenapa penolakan sampel
 *
 * 256 tidak habis dibagi 31, jadi `byte % 31` membuat sebagian huruf lebih
 * sering muncul (bias modulo). Nilai di atas 248 dibuang agar sebarannya rata.
 */
export function randomCode(length: number): string {
  const limit = 256 - (256 % CODE_ALPHABET.length);
  let out = "";

  while (out.length < length) {
    const bytes = new Uint8Array(length - out.length + 8);
    crypto.getRandomValues(bytes);

    for (const byte of bytes) {
      if (out.length >= length) break;
      // Buang nilai yang membuat distribusi tidak rata.
      if (byte >= limit) continue;
      out += CODE_ALPHABET[byte % CODE_ALPHABET.length];
    }
  }

  return out;
}

export function newOrderCode(): string {
  return `ARV-${randomCode(5)}`;
}

export function newLicenseKey(productId: string): string {
  const prefix = productId.slice(0, 4).toUpperCase();
  return `${prefix}-${randomCode(4)}-${randomCode(4)}-${randomCode(4)}`;
}

export type SettleResult = {
  order: Order;
  /** Lisensi baru, atau undefined bila pesanan sudah punya lisensi aktif. */
  license?: ProductLicense;
  alreadyPaid: boolean;
};

/**
 * Menandai pesanan lunas dan menerbitkan lisensi bila belum ada.
 *
 * Fungsi murni terhadap store (tanpa konteks request), sehingga bisa dipanggil
 * dari server action maupun webhook gateway di masa depan.
 * Mengembalikan `alreadyPaid: true` bila pesanan sudah pernah dilunasi,
 * supaya webhook yang datang dua kali tidak menerbitkan lisensi ganda.
 */
export function settleOrder(order: Order, now = new Date()): SettleResult {
  const store = getStore();

  if (order.status === "paid") {
    return { order, alreadyPaid: true };
  }

  order.status = "paid";
  order.paidAt = now.toISOString();

  const existing = store.licenses.find(
    (license) => license.orderId === order.id && license.status === "active",
  );
  if (existing) {
    return { order, license: existing, alreadyPaid: false };
  }

  const license: ProductLicense = {
    id: `lic-${randomCode(10).toLowerCase()}`,
    orderId: order.id,
    productId: order.productId,
    key: newLicenseKey(order.productId),
    email: order.email,
    status: "active",
    issuedAt: now.toISOString(),
  };
  store.licenses.push(license);

  return { order, license, alreadyPaid: false };
}

/** Mencabut lisensi. Mengembalikan false bila sudah dicabut sebelumnya. */
export function revokeLicenseById(id: string, now = new Date()): boolean {
  const license = getStore().licenses.find((item) => item.id === id);
  if (!license || license.status === "revoked") return false;
  license.status = "revoked";
  license.revokedAt = now.toISOString();
  return true;
}

/** Membatalkan pesanan yang belum lunas. */
export function cancelOrderByCode(code: string): Order | undefined {
  const order = getStore().orders.find(
    (item) => item.code.toLowerCase() === code.toLowerCase(),
  );
  if (!order || order.status === "paid") return undefined;
  order.status = "cancelled";
  return order;
}

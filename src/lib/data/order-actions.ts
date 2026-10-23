"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSellableApp } from "@/config/apps";
import { getPaymentProvider } from "@/lib/payments";
import { requireOwner } from "@/lib/session";
import {
  cancelOrderByCode,
  newOrderCode,
  randomCode,
  revokeLicenseById,
  settleOrder,
} from "./orders";
import { flushStore, getStore, saveStore } from "./store";
import type { ActionResult, Order } from "./types";

/* ------------------------------- bantuan --------------------------------- */

function fail(message: string, fieldErrors?: Record<string, string>): ActionResult {
  return { ok: false, message, fieldErrors };
}

/** Pesanan manual kedaluwarsa setelah 3 hari agar daftar tidak menumpuk. */
const ORDER_TTL_DAYS = 3;

function revalidateSales() {
  saveStore();
  revalidatePath("/aplikasi");
  revalidatePath("/admin/pesanan");
  revalidatePath("/keluarga/pengaturan");
}

/* -------------------------------- checkout -------------------------------- */

const checkoutSchema = z.object({
  productId: z.string().min(1, "Produk tidak dikenal."),
  buyerName: z.string().trim().min(2, "Nama minimal 2 karakter.").max(100),
  email: z.string().trim().email("Email tidak valid.").max(160),
  whatsapp: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((value) => (value ? value : undefined)),
  agree: z.literal("on", {
    message: "Centang persetujuan lisensi sebelum melanjutkan.",
  }),
});

/**
 * Membuat pesanan baru lalu mengarahkan pembeli ke halaman pembayaran.
 *
 * Pesanan yang masih pending untuk produk dan email yang sama dipakai ulang,
 * supaya pembeli tidak menghasilkan banyak tagihan karena menekan tombol dua kali.
 */
export async function createOrder(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const raw = {
    productId: String(formData.get("productId") ?? ""),
    buyerName: String(formData.get("buyerName") ?? ""),
    email: String(formData.get("email") ?? ""),
    whatsapp: String(formData.get("whatsapp") ?? ""),
    agree: formData.get("agree") ? "on" : "",
  };

  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return fail("Periksa kembali isian Anda.", fieldErrors);
  }

  const app = getSellableApp(parsed.data.productId);
  if (!app?.pricing) {
    return fail("Produk ini belum dijual.");
  }

  const store = getStore();
  const existing = store.orders.find(
    (order) =>
      order.productId === app.id &&
      order.status === "pending" &&
      order.email.toLowerCase() === parsed.data.email.toLowerCase() &&
      new Date(order.expiresAt).getTime() > Date.now(),
  );
  if (existing) {
    redirect(`/pesanan/${existing.code}`);
  }

  const provider = getPaymentProvider();
  if (!provider) {
    return fail(
      "Pembelian belum dibuka. Hubungi kami lewat halaman kontak untuk memesan manual.",
    );
  }

  const code = newOrderCode();

  let payment;
  try {
    payment = await provider.createPayment({
      orderCode: code,
      productName: app.name,
      amount: app.pricing.price,
      customer: {
        name: parsed.data.buyerName,
        email: parsed.data.email,
        whatsapp: parsed.data.whatsapp,
      },
    });
  } catch (error) {
    console.error("[order] gagal membuat pembayaran:", error);
    return fail(
      "Pembayaran sedang tidak tersedia. Coba lagi atau hubungi kami lewat halaman kontak.",
    );
  }

  const order: Order = {
    id: `ord-${randomCode(10).toLowerCase()}`,
    code,
    productId: app.id,
    productName: app.name,
    buyerName: parsed.data.buyerName,
    email: parsed.data.email,
    whatsapp: parsed.data.whatsapp,
    amount: app.pricing.price,
    status: "pending",
    provider: payment.provider,
    method: payment.method,
    providerRef: payment.providerRef,
    instructions: payment.instructions,
    bankAccount: payment.bankAccount,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + ORDER_TTL_DAYS * 86_400_000).toISOString(),
  };

  store.orders.push(order);
  revalidateSales();

  /*
   * Tunggu pesanan benar-benar tersimpan sebelum pembeli diarahkan ke kode
   * pembayarannya. Kode itu dipakai sebagai berita transfer; kalau barisnya
   * tidak pernah sampai ke database, pembeli mentransfer tanpa rujukan yang
   * bisa dicocokkan.
   */
  await flushStore();

  redirect(`/pesanan/${order.code}`);
}

/* ---------------------------- verifikasi manual --------------------------- */

/**
 * Menandai pesanan lunas dan menerbitkan lisensi.
 *
 * Hanya owner. Ini titik yang nanti dipanggil otomatis oleh webhook
 * Xendit/Midtrans, sehingga alur setelah pembayaran tidak perlu ditulis ulang.
 */
export async function markOrderPaid(formData: FormData): Promise<ActionResult> {
  await requireOwner();

  const code = String(formData.get("code") ?? "").trim();
  const order = getStore().orders.find(
    (item) => item.code.toLowerCase() === code.toLowerCase(),
  );

  if (!order) return fail("Pesanan tidak ditemukan.");

  const result = settleOrder(order);
  if (result.alreadyPaid) return fail("Pesanan ini sudah lunas.");

  revalidateSales();
  return {
    ok: true,
    message: `Pesanan ${order.code} ditandai lunas. Lisensi dikirim ke ${order.email}.`,
  };
}

export async function cancelOrder(formData: FormData): Promise<ActionResult> {
  await requireOwner();

  const code = String(formData.get("code") ?? "").trim();
  const order = cancelOrderByCode(code);
  if (!order) {
    return fail("Pesanan tidak ditemukan, atau sudah lunas dan tidak bisa dibatalkan.");
  }

  revalidateSales();
  return { ok: true, message: `Pesanan ${order.code} dibatalkan.` };
}

/** Mencabut lisensi, misalnya saat pembeli meminta pengembalian dana. */
export async function revokeLicense(formData: FormData): Promise<ActionResult> {
  await requireOwner();

  const id = String(formData.get("id") ?? "");
  if (!revokeLicenseById(id)) {
    return fail("Lisensi tidak ditemukan atau sudah dicabut.");
  }

  revalidateSales();
  return { ok: true, message: "Lisensi dicabut." };
}

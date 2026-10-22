import type { PaymentIntent, PaymentProvider, PaymentResult } from "./types";

/**
 * Kerangka provider Xendit. BELUM AKTIF.
 *
 * Untuk mengaktifkan:
 *   1. Isi `XENDIT_SECRET_KEY` dan `XENDIT_CALLBACK_TOKEN` di environment.
 *   2. Set `PAYMENT_PROVIDER="xendit"`.
 *   3. Implementasi `createPayment` di bawah memakai Invoice API:
 *        POST https://api.xendit.co/v2/invoices
 *        Authorization: Basic base64(secretKey + ":")
 *      Isi `external_id` dengan `intent.orderCode`, `amount` dengan `intent.amount`,
 *      `success_redirect_url` ke `/pesanan/<kode>?status=paid`.
 *   4. Tambahkan route webhook `POST /api/payments/xendit` yang memverifikasi
 *      header `x-callback-token`, lalu memanggil `markOrderPaid(orderCode)`.
 *
 * Sampai langkah itu selesai, provider ini sengaja melempar error agar tidak
 * ada pembayaran yang terlihat berhasil padahal tidak.
 */
export const xenditProvider: PaymentProvider = {
  id: "xendit",
  label: "Xendit",

  isConfigured() {
    return Boolean(process.env.XENDIT_SECRET_KEY);
  },

  async createPayment(intent: PaymentIntent): Promise<PaymentResult> {
    void intent;
    throw new Error(
      "Xendit belum diaktifkan. Isi XENDIT_SECRET_KEY lalu implementasikan createPayment.",
    );
  },
};

import type { PaymentIntent, PaymentProvider, PaymentResult } from "./types";

/**
 * Kerangka provider Midtrans. BELUM AKTIF.
 *
 * Untuk mengaktifkan:
 *   1. Isi `MIDTRANS_SERVER_KEY` dan `MIDTRANS_CLIENT_KEY`.
 *   2. Set `PAYMENT_PROVIDER="midtrans"` dan `MIDTRANS_IS_PRODUCTION`.
 *   3. Implementasi `createPayment` memakai Snap API:
 *        POST https://app.sandbox.midtrans.com/snap/v1/transactions
 *        Authorization: Basic base64(serverKey + ":")
 *      Pakai `intent.orderCode` sebagai `order_id`, `intent.amount` sebagai
 *      `gross_amount`, dan kembalikan `redirect_url` sebagai `redirectUrl`.
 *   4. Tambahkan route webhook `POST /api/payments/midtrans` yang memverifikasi
 *      `signature_key` = sha512(order_id + status_code + gross_amount + serverKey),
 *      lalu memanggil `markOrderPaid(orderCode)` saat `transaction_status`
 *      bernilai `settlement` atau `capture`.
 *
 * Sampai langkah itu selesai, provider ini sengaja melempar error agar tidak
 * ada pembayaran yang terlihat berhasil padahal tidak.
 */
export const midtransProvider: PaymentProvider = {
  id: "midtrans",
  label: "Midtrans",

  isConfigured() {
    return Boolean(process.env.MIDTRANS_SERVER_KEY);
  },

  async createPayment(intent: PaymentIntent): Promise<PaymentResult> {
    void intent;
    throw new Error(
      "Midtrans belum diaktifkan. Isi MIDTRANS_SERVER_KEY lalu implementasikan createPayment.",
    );
  },
};

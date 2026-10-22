import type { PaymentIntent, PaymentProvider, PaymentResult } from "./types";

/**
 * Provider default: transfer bank manual.
 *
 * Dipakai selama gateway belum aktif. Alurnya:
 *   1. Pembeli mengisi form dan mendapat kode pesanan.
 *   2. Pembeli transfer sesuai nominal, lalu konfirmasi.
 *   3. Penjual menandai pesanan lunas di /admin/pesanan.
 *   4. Lisensi diterbitkan otomatis.
 *
 * Tidak ada kredensial yang dibutuhkan, jadi selalu siap dipakai.
 */
export const manualProvider: PaymentProvider = {
  id: "manual",
  label: "Transfer bank",

  isConfigured() {
    return true;
  },

  async createPayment(intent: PaymentIntent): Promise<PaymentResult> {
    const bank = {
      bank: process.env.PAYMENT_BANK_NAME || "BCA",
      number: process.env.PAYMENT_BANK_ACCOUNT || "1234567890",
      holder: process.env.PAYMENT_BANK_HOLDER || "Airevo Digital",
    };

    return {
      provider: "manual",
      method: "bank_transfer",
      providerRef: intent.orderCode,
      bankAccount: bank,
      instructions: [
        `Transfer tepat ${formatAmount(intent.amount)} ke ${bank.bank} ${bank.number} a.n. ${bank.holder}.`,
        `Tulis kode pesanan ${intent.orderCode} pada berita transfer.`,
        "Konfirmasi lewat email atau WhatsApp setelah transfer.",
        "Akses aktif maksimal 1×24 jam setelah pembayaran diverifikasi.",
      ],
    };
  },
};

function formatAmount(value: number): string {
  return `Rp${Math.round(value).toLocaleString("id-ID")}`;
}

import type { PaymentIntent, PaymentProvider, PaymentResult } from "./types";

export type BankAccount = { bank: string; number: string; holder: string };

/**
 * Rekening tujuan transfer manual, dibaca dari environment.
 *
 * Tidak ada nilai bawaan. Rekening contoh di halaman pesanan adalah kegagalan
 * paling mahal di alur ini: pembeli mentransfer uang sungguhan ke nomor yang
 * tidak dimiliki siapa pun. Tanpa konfigurasi lengkap, provider melaporkan
 * dirinya belum siap sehingga checkout ditutup.
 */
function readBankAccount(): BankAccount | null {
  const bank = process.env.PAYMENT_BANK_NAME?.trim() ?? "";
  const number = process.env.PAYMENT_BANK_ACCOUNT?.trim() ?? "";
  const holder = process.env.PAYMENT_BANK_HOLDER?.trim() ?? "";
  return bank && number && holder ? { bank, number, holder } : null;
}

/**
 * Provider default: transfer bank manual.
 *
 * Alurnya:
 *   1. Pembeli mengisi form dan mendapat kode pesanan.
 *   2. Pembeli transfer sesuai nominal, lalu konfirmasi.
 *   3. Penjual menandai pesanan lunas di /admin/pesanan.
 *   4. Lisensi diterbitkan otomatis.
 */
export const manualProvider: PaymentProvider = {
  id: "manual",
  label: "Transfer bank",

  isConfigured() {
    return readBankAccount() !== null;
  },

  async createPayment(intent: PaymentIntent): Promise<PaymentResult> {
    const account = readBankAccount();

    if (!account) {
      throw new Error(
        "Rekening transfer belum dikonfigurasi: isi PAYMENT_BANK_NAME, PAYMENT_BANK_ACCOUNT, dan PAYMENT_BANK_HOLDER.",
      );
    }

    return {
      provider: "manual",
      method: "bank_transfer",
      providerRef: intent.orderCode,
      bankAccount: account,
      instructions: [
        `Transfer tepat ${formatAmount(intent.amount)} ke ${account.bank} ${account.number} a.n. ${account.holder}.`,
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

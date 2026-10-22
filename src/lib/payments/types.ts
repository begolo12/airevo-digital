import type { PaymentMethod, PaymentProviderId } from "@/lib/data/types";

/** Data minimum yang dibutuhkan provider untuk membuat pembayaran. */
export type PaymentIntent = {
  /** Kode pesanan yang bisa dibaca manusia, dipakai sebagai referensi. */
  orderCode: string;
  productName: string;
  amount: number;
  customer: {
    name: string;
    email: string;
    whatsapp?: string;
  };
};

/** Hasil yang ditampilkan ke pembeli di halaman pesanan. */
export type PaymentResult = {
  provider: PaymentProviderId;
  method: PaymentMethod;
  /** Referensi transaksi di sisi gateway. Kosong untuk transfer manual. */
  providerRef?: string;
  /** Langkah-langkah yang harus dilakukan pembeli. */
  instructions: string[];
  /** Rekening tujuan, hanya untuk transfer manual. */
  bankAccount?: { bank: string; number: string; holder: string };
  /** Untuk gateway yang mengarahkan pembeli ke halaman bayar. */
  redirectUrl?: string;
};

/**
 * Kontrak penyedia pembayaran.
 *
 * Semua provider harus memenuhi bentuk ini, sehingga mengganti transfer manual
 * menjadi Xendit/Midtrans cukup dengan menambah file baru dan mengubah
 * `PAYMENT_PROVIDER` — halaman checkout, pesanan, dan lisensi tidak berubah.
 */
export interface PaymentProvider {
  id: PaymentProviderId;
  /** Nama yang ditampilkan di UI. */
  label: string;
  /** Apakah kredensial sudah tersedia di environment. */
  isConfigured(): boolean;
  /** Membuat instruksi pembayaran untuk satu pesanan. */
  createPayment(intent: PaymentIntent): Promise<PaymentResult>;
}

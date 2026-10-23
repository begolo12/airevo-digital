import type { PaymentProviderId } from "@/lib/data/types";
import { manualProvider } from "./manual";
import { midtransProvider } from "./midtrans";
import type { PaymentProvider } from "./types";
import { xenditProvider } from "./xendit";

export type { PaymentIntent, PaymentProvider, PaymentResult } from "./types";

const providers: Record<PaymentProviderId, PaymentProvider> = {
  manual: manualProvider,
  xendit: xenditProvider,
  midtrans: midtransProvider,
};

/**
 * Provider yang dipakai saat ini, atau `null` bila tidak ada yang siap.
 *
 * Diatur lewat `PAYMENT_PROVIDER`. Bila nilainya tidak dikenal atau provider
 * itu belum dikonfigurasi, aplikasi jatuh ke transfer manual — tetapi hanya
 * kalau rekeningnya memang terisi. Tidak ada rekening bawaan: daripada pembeli
 * mentransfer ke nomor contoh, checkout ditutup.
 */
export function getPaymentProvider(): PaymentProvider | null {
  const requested = process.env.PAYMENT_PROVIDER as PaymentProviderId | undefined;
  const candidate = requested ? providers[requested] : undefined;

  if (candidate?.isConfigured()) return candidate;
  return manualProvider.isConfigured() ? manualProvider : null;
}

/** Daftar provider beserta status kesiapannya, untuk halaman pengaturan. */
export function listPaymentProviders() {
  return Object.values(providers).map((provider) => ({
    id: provider.id,
    label: provider.label,
    configured: provider.isConfigured(),
  }));
}

/** Apakah pembelian bisa dilanjutkan sekarang. */
export function isCheckoutOpen(): boolean {
  return getPaymentProvider() !== null;
}

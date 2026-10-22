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
 * Provider yang dipakai saat ini.
 *
 * Diatur lewat `PAYMENT_PROVIDER`. Jika nilainya tidak dikenal atau provider
 * belum dikonfigurasi, aplikasi jatuh ke transfer manual agar checkout tetap
 * bisa diselesaikan — bukan gagal diam-diam.
 */
export function getPaymentProvider(): PaymentProvider {
  const requested = process.env.PAYMENT_PROVIDER as PaymentProviderId | undefined;
  const candidate = requested ? providers[requested] : undefined;

  if (candidate?.isConfigured()) return candidate;
  return manualProvider;
}

/** Daftar provider beserta status kesiapannya, untuk halaman pengaturan. */
export function listPaymentProviders() {
  return Object.values(providers).map((provider) => ({
    id: provider.id,
    label: provider.label,
    configured: provider.isConfigured(),
  }));
}

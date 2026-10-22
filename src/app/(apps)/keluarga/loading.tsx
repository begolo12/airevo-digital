import { PageSkeleton } from "@/components/app/skeleton";

/**
 * Kerangka muat untuk seluruh aplikasi Keluarga.
 *
 * Level segmen `keluarga`, jadi berlaku untuk semua halaman di bawahnya yang
 * belum punya `loading.tsx` sendiri.
 */
export default function KeluargaLoading() {
  return <PageSkeleton stats={4} lists={1} rows={6} />;
}

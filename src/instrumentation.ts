/**
 * Instrumentation Next.js.
 *
 * Dipakai untuk mencatat error server tanpa ketergantungan layanan eksternal.
 * Jika nanti Sentry dipasang, cukup panggil `Sentry.captureException` di sini.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const usesDatabase = Boolean(process.env.DATABASE_URL);
  const persistDisabled = process.env.AIREVO_PERSIST === "0";

  console.info(
    `[airevo] start · storage=${usesDatabase ? "postgres" : "file"} · email=${
      process.env.RESEND_API_KEY ? "resend" : "outbox"
    }`,
  );

  /*
   * Muat data dari Postgres SEBELUM server melayani permintaan.
   *
   * `getStore()` sengaja tetap sinkron karena dipanggil di ratusan tempat;
   * memuatnya di sini membuat seluruh aplikasi bisa memakai data dari database
   * tanpa mengubah satu pun pemanggil.
   */
  if (usesDatabase) {
    const { hydrateStore } = await import("@/lib/data/store");
    const fromDatabase = await hydrateStore();
    console.info(
      `[airevo] data ${fromDatabase ? "dimuat dari Postgres" : "memakai penyimpanan lokal"}`,
    );

    /*
     * Pulihkan hitungan pembatas laju.
     *
     * Tanpa ini, restart server menghapus semua blokir login dan PIN —
     * penyerang hanya perlu menunggu instance didaur ulang. Ini penting
     * terutama di Vercel, tempat instance diganti jauh lebih sering daripada
     * server biasa.
     */
    const { restoreRateLimits } = await import("@/lib/auth/rate-limit");
    const restored = await restoreRateLimits();
    if (restored > 0) {
      console.info(`[airevo] ${restored} hitungan pembatas laju dipulihkan`);
    }
  }

  /*
   * Peringatan keras saat berjalan di platform serverless tanpa database.
   *
   * Filesystem Vercel bersifat read-only dan sementara, jadi setiap penulisan
   * akan gagal dan data pengguna hilang saat instance didaur ulang. Lebih baik
   * hal ini terlihat di log deploy daripada baru ketahuan dari keluhan pembeli.
   */
  if (process.env.VERCEL && !usesDatabase && !persistDisabled) {
    console.error(
      "[airevo] PERINGATAN PRODUKSI — berjalan di Vercel tanpa DATABASE_URL. " +
        "Filesystem tidak bisa ditulis, sehingga data pengguna TIDAK akan bertahan " +
        "setelah instance didaur ulang. Isi DATABASE_URL sebelum menerima pembeli.",
    );
  }
}

export async function onRequestError(
  error: unknown,
  request: { path: string; method: string },
) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    `[airevo] request error ${request.method} ${request.path}: ${message}`,
  );
}

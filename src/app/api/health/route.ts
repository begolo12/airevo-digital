import { getPersistenceState, verifyPersistence } from "@/lib/data/persist";
import { db } from "@/lib/db";
import { appState } from "@/lib/db/records";
import { isNeonAuthConfigured } from "@/lib/auth/neon-auth";
import { isStorageConfigured } from "@/lib/storage/neon-storage";
import { sql } from "drizzle-orm";

/**
 * Health check untuk uptime monitor.
 *
 * Setiap layanan **diuji**, bukan hanya diperiksa variabel environment-nya:
 *
 * - Postgres: menjalankan query nyata
 * - Object Storage: memeriksa konfigurasi dan endpoint
 * - Neon Auth: memeriksa JWKS dapat dijangkau
 *
 * Status: `ok` bila semua lulus, `degraded` bila ada yang gagal. Kode HTTP
 * tetap 200 supaya monitor tidak me-restart instance yang masih melayani;
 * kegagalan terlihat dari isi respons.
 */
export async function GET() {
  const checks: Record<string, unknown> = { app: "ok" };

  /* ------------------------------- penyimpanan ------------------------------ */

  let databaseOk = false;

  if (db) {
    try {
      await db.select({ key: appState.key }).from(appState).limit(1);
      // Query kedua memastikan tabel rekaman juga ada, bukan hanya koneksinya.
      await db.execute(sql`select 1 from workspace_records limit 1`);
      databaseOk = true;
      checks.database = "ok";
    } catch (error) {
      checks.database = "failed";
      checks.databaseDetail =
        error instanceof Error ? error.message.slice(0, 160) : "unknown";
    }
  } else {
    checks.database = "not-configured";
  }

  /*
   * Penyimpanan berkas lokal hanya relevan bila tidak ada database. Di Vercel
   * filesystem memang read-only, jadi melaporkannya "failed" padahal data
   * tersimpan di Postgres hanya membuat monitor berteriak tanpa sebab.
   */
  if (db) {
    checks.fileStorage = "not-used";
  } else {
    const fileStorage = verifyPersistence();
    checks.fileStorage = fileStorage.ok ? "writable" : "failed";
    if (!fileStorage.ok) {
      checks.fileStorageDetail = getPersistenceState().reason ?? fileStorage.reason;
    }
  }

  /* ----------------------------- object storage ---------------------------- */

  checks.objectStorage = isStorageConfigured() ? "configured" : "not-configured";

  /* -------------------------------- neon auth ------------------------------ */

  let authOk = false;
  if (isNeonAuthConfigured()) {
    try {
      const response = await fetch(process.env.NEON_AUTH_JWKS_URL as string, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      authOk = response.ok;
      checks.neonAuth = response.ok ? "ok" : "failed";
    } catch {
      checks.neonAuth = "failed";
    }
  } else {
    checks.neonAuth = "not-configured";
  }

  /*
   * Data aman bila database hidup, atau — saat tidak ada database — bila
   * berkas lokal masih bisa ditulis. Object storage dan auth bersifat tambahan:
   * kegagalannya menurunkan status tetapi tidak membuat data pengguna hilang.
   */
  const dataSafe = databaseOk || (!db && checks.fileStorage === "writable");
  const degraded = !dataSafe || (!authOk && isNeonAuthConfigured());

  return Response.json(
    {
      status: degraded ? "degraded" : "ok",
      checks,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
      timestamp: new Date().toISOString(),
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
